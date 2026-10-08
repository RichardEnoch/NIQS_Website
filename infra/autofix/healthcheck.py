"""
NIQS API health check and auto-fix.

Runs every 5 minutes (04-autofix.yml). The load balancer already replaces a task
that crashes or fails /api/health, but /api/health deliberately answers 200 when
MongoDB is disconnected (so an Atlas blip does not take every task out of the
ALB). That leaves one failure the platform never fixes on its own: tasks that
are up but cannot reach the database, or that answer health but 5xx real pages.
This closes that gap.

  check     /api/health must say mongo "connected", and /api/past-presidents
            (a database read) must return a non-empty list. Three attempts per
            run, so one slow response is not an incident.
  auto-fix  After FAILURE_THRESHOLD failed runs in a row, force a new ECS
            deployment: fresh tasks, fresh Mongo connections, same image. Never
            while a deployment is already rolling out (it would fight a deploy),
            at most MAX_RESTARTS per incident, COOLDOWN_MIN apart.
  email     SES: when an auto-fix starts, when the API is healthy again after
            one ("auto-fix done"), and once if restarts did not fix it.

Incident state lives in one SSM parameter so each run knows what the last did.
Set DRY_RUN=true to log the decisions without restarting or emailing.
"""
import json
import os
import time
import urllib.request
from datetime import datetime, timedelta, timezone

import boto3

API_BASE = os.environ["API_BASE"].rstrip("/")
CLUSTER = os.environ["CLUSTER"]
SERVICE = os.environ["SERVICE"]
LOG_GROUP = os.environ.get("LOG_GROUP", "")
STATE_PARAM = os.environ["STATE_PARAM"]
MAIL_FROM = os.environ["MAIL_FROM"]
MAIL_TO = [a.strip() for a in os.environ["MAIL_TO"].split(",") if a.strip()]
SES_REGION = os.environ.get("SES_REGION", "eu-west-1")
FAILURE_THRESHOLD = int(os.environ.get("FAILURE_THRESHOLD", "2"))
MAX_RESTARTS = int(os.environ.get("MAX_RESTARTS", "2"))
COOLDOWN = timedelta(minutes=int(os.environ.get("COOLDOWN_MIN", "15")))
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"

WAT = timezone(timedelta(hours=1))  # Lagos, no daylight saving

ssm = boto3.client("ssm")
ecs = boto3.client("ecs")
logs = boto3.client("logs")
ses = boto3.client("sesv2", region_name=SES_REGION)

EMPTY_STATE = {"failures": 0, "since": None, "restarts": 0, "last_restart": None,
               "escalated": False, "reasons": []}


# ── Check ────────────────────────────────────────────────────────────────────

def _get_json(path, timeout=8):
    req = urllib.request.Request(API_BASE + path, headers={"User-Agent": "niqs-autofix"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, json.loads(r.read().decode("utf-8"))


def check_once():
    """Return None when healthy, else a one-line reason."""
    try:
        status, body = _get_json("/api/health")
        if status != 200:
            return f"/api/health answered {status}"
        if body.get("mongo") != "connected":
            return f"/api/health reports mongo {body.get('mongo')!r}"
        status, body = _get_json("/api/past-presidents")
        if status != 200 or not isinstance(body, list) or not body:
            return f"/api/past-presidents answered {status} without data"
        return None
    except Exception as e:  # timeouts, 5xx (urllib raises), bad JSON
        return f"{type(e).__name__}: {str(e)[:200]}"


def check(attempts=3, gap=5):
    reason = None
    for i in range(attempts):
        reason = check_once()
        if reason is None:
            return None
        if i < attempts - 1:
            time.sleep(gap)
    return reason


# ── State ────────────────────────────────────────────────────────────────────

def load_state():
    try:
        return {**EMPTY_STATE, **json.loads(ssm.get_parameter(Name=STATE_PARAM)["Parameter"]["Value"])}
    except ssm.exceptions.ParameterNotFound:
        return dict(EMPTY_STATE)


def save_state(state):
    if DRY_RUN:
        return
    ssm.put_parameter(Name=STATE_PARAM, Value=json.dumps(state), Type="String", Overwrite=True)


# ── Actions ──────────────────────────────────────────────────────────────────

def deployment_in_progress():
    svc = ecs.describe_services(cluster=CLUSTER, services=[SERVICE])["services"][0]
    return any(d.get("rolloutState") == "IN_PROGRESS" for d in svc["deployments"])


def restart():
    if DRY_RUN:
        print("DRY_RUN: would force a new deployment")
        return
    ecs.update_service(cluster=CLUSTER, service=SERVICE, forceNewDeployment=True)


def recent_errors(minutes=30, limit=20):
    if not LOG_GROUP:
        return "(no log group configured)"
    try:
        start = int((time.time() - minutes * 60) * 1000)
        events = logs.filter_log_events(
            logGroupName=LOG_GROUP, startTime=start, limit=200,
            filterPattern='?Error ?error ?ERR ?MongoServerError ?MongoNetworkError ?ECONNREFUSED ?"Unhandled"',
        ).get("events", [])
        lines = [e["message"].strip()[:300] for e in events[-limit:]]
        return "\n".join(lines) if lines else "(no error lines in the last 30 minutes)"
    except Exception as e:
        return f"(could not read logs: {e})"


def wat(iso):
    return datetime.fromisoformat(iso).astimezone(WAT).strftime("%d %b %Y, %H:%M WAT")


def email(subject, body):
    print(f"EMAIL: {subject}\n{body}")
    if DRY_RUN:
        return
    ses.send_email(
        FromEmailAddress=MAIL_FROM,
        Destination={"ToAddresses": MAIL_TO},
        Content={"Simple": {"Subject": {"Data": subject},
                            "Body": {"Text": {"Data": body}}}},
    )


# ── Handler ──────────────────────────────────────────────────────────────────

def handler(event=None, context=None):
    now = datetime.now(timezone.utc)
    # Invoke with {"test_email": true} after deploying to prove SES delivery.
    if (event or {}).get("test_email"):
        email("NIQS API monitor: test email",
              f"The NIQS API auto-fix is installed and can reach you.\n"
              f"Current check result: {check() or 'healthy'} ({wat(now.isoformat())}).")
        return {"test_email": "sent"}

    state = load_state()
    reason = check()

    if reason is None:
        if state["restarts"] > 0:
            minutes = int((now - datetime.fromisoformat(state["since"])).total_seconds() // 60)
            email(
                "NIQS API: auto-fix done, the API is healthy again",
                f"The NIQS API is answering normally again.\n\n"
                f"Problem first seen: {wat(state['since'])}\n"
                f"Healthy again:      {wat(now.isoformat())} (about {minutes} min)\n"
                f"Auto-fix taken:     {state['restarts']} restart(s) of the API tasks\n\n"
                f"What the check saw:\n- " + "\n- ".join(state["reasons"][-5:]) + "\n\n"
                f"No action needed. If this repeats, the cause is worth a look in the logs "
                f"({LOG_GROUP}, eu-west-3).",
            )
        elif state["failures"]:
            print(f"recovered on its own after {state['failures']} failed run(s); no action was taken")
        save_state(dict(EMPTY_STATE))
        return {"healthy": True}

    print(f"UNHEALTHY: {reason}")
    state["failures"] += 1
    state["since"] = state["since"] or now.isoformat()
    state["reasons"] = (state["reasons"] + [f"{wat(now.isoformat())}: {reason}"])[-10:]

    if state["failures"] < FAILURE_THRESHOLD:
        save_state(state)
        return {"healthy": False, "action": "watching"}

    if deployment_in_progress():
        print("a deployment is rolling out; not restarting on top of it")
        save_state(state)
        return {"healthy": False, "action": "waiting for deployment"}

    since_restart = now - datetime.fromisoformat(state["last_restart"]) if state["last_restart"] else None
    cooled = since_restart is None or since_restart >= COOLDOWN

    if state["restarts"] < MAX_RESTARTS and cooled:
        restart()
        state["restarts"] += 1
        state["last_restart"] = now.isoformat()
        email(
            f"NIQS API: auto-fix started (restart {state['restarts']} of {MAX_RESTARTS})",
            f"The NIQS API failed its health check {state['failures']} times in a row, "
            f"so the auto-fix is restarting it with fresh tasks (same code, same settings).\n\n"
            f"Problem first seen: {wat(state['since'])}\n"
            f"Latest failure:     {reason}\n\n"
            f"You will get another email when it is healthy again, or if the restart does not fix it.\n\n"
            f"Recent error lines from the API log:\n{recent_errors()}",
        )
        save_state(state)
        return {"healthy": False, "action": "restarted"}

    if state["restarts"] >= MAX_RESTARTS and cooled and not state["escalated"]:
        state["escalated"] = True
        email(
            "NIQS API: auto-fix could not fix it, needs you",
            f"The NIQS API is still failing after {state['restarts']} automatic restarts, "
            f"so the cause is not something a restart clears (for example MongoDB Atlas "
            f"down or unreachable, an expired secret, or a bad deploy).\n\n"
            f"Problem first seen: {wat(state['since'])}\n"
            f"Latest failure:     {reason}\n\n"
            f"Failure history:\n- " + "\n- ".join(state["reasons"]) + "\n\n"
            f"Recent error lines from the API log:\n{recent_errors()}\n\n"
            f"The check keeps running every 5 minutes and will email \"auto-fix done\" "
            f"if the API recovers.",
        )

    save_state(state)
    return {"healthy": False, "action": "escalated" if state["escalated"] else "cooling down"}
