# NIQS API auto-fix

A Lambda (`niqs-api-autofix`, eu-west-3) checks the API every 5 minutes and
restarts it when it stays unhealthy, emailing at each step. Stack:
`infra/cloudformation/04-autofix.yml`, stack name `niqs-api-autofix`.

## What it covers, and what it does not

The load balancer already replaces a task that crashes or fails `/api/health`.
But `/api/health` answers 200 even when MongoDB is disconnected (on purpose, so
an Atlas blip does not pull every task out of service). So tasks that are up but
cannot reach the database, or that serve 5xx on real pages, were never fixed by
anything. This check fails when:

- `/api/health` is not 200, or reports `mongo` other than `connected`
- `/api/past-presidents` (a database read) does not return a non-empty list
- either request times out (8 s)

Each run tries three times, 5 s apart. Two failed runs in a row (about 10 min)
open an incident.

**The fix is a restart** (`ecs update-service --force-new-deployment`): fresh
tasks, fresh database connections, same image and settings. It clears hung
processes, leaked memory and stuck connections. It cannot fix a code bug, MongoDB
Atlas being down, an expired secret or a bad deploy; for those it emails that it
needs you.

Guards: no restart while a deployment is rolling out (it would fight your own
deploy), at most 2 restarts per incident, 15 minutes apart. Runs never overlap: one every
5 minutes, each finished within its 90 s timeout. (Reserved concurrency would be
the belt-and-braces way, but this account's Lambda limit is 10 and AWS refuses
any reservation below that, so the stack would fail to create.)

## Emails

Sent through SES in **eu-west-1** (adlmstudio.net is verified there with
production access; eu-west-3 has no identities and is in the sandbox), from
`alerts@adlmstudio.net` to `admin@adlmstudio.net, dolapo836@gmail.com, enochrichard6@gmail.com`
(stack parameter `MailTo`).

| When | Subject |
|---|---|
| A restart is triggered | NIQS API: auto-fix started (restart n of 2) |
| Healthy again after a restart | NIQS API: auto-fix done, the API is healthy again |
| Still failing after 2 restarts | NIQS API: auto-fix could not fix it, needs you (sent once) |

A failure that clears on its own before any restart sends nothing.

## Deploy (Windows PowerShell 5.1, from the repo root)

```powershell
aws cloudformation package --template-file infra\cloudformation\04-autofix.yml --s3-bucket niqs-assets-065634457992-eu-west-3 --s3-prefix build/autofix --output-template-file $env:TEMP\04-autofix.packaged.yml --region eu-west-3 --profile adlm-deploy
aws cloudformation deploy --template-file $env:TEMP\04-autofix.packaged.yml --stack-name niqs-api-autofix --capabilities CAPABILITY_NAMED_IAM --region eu-west-3 --profile adlm-deploy
```

Then prove the email path:

```powershell
aws lambda invoke --function-name niqs-api-autofix --cli-binary-format raw-in-base64-out --payload '{\"test_email\": true}' $env:TEMP\autofix-out.json --region eu-west-3 --profile adlm-deploy; Get-Content $env:TEMP\autofix-out.json
```

## Operating it

- Pause: `aws events disable-rule --name niqs-api-autofix-every-5-min --region eu-west-3 --profile adlm-deploy`
  (`enable-rule` to resume). Worth doing during planned database maintenance.
- Watch without acting: redeploy with `--parameter-overrides DryRun=true`.
- Logs: `/aws/lambda/niqs-api-autofix` (30 days).
- State between runs: SSM parameter `/niqs/autofix/state`. Put back
  `{"failures": 0, "since": null, "restarts": 0, "last_restart": null, "escalated": false, "reasons": []}`
  to clear a stuck incident.
- If the API's log group or endpoint changes (a new Express Mode service), update
  the `LogGroup` / `ApiBase` parameters.

Cost: about 8,700 short invocations a month, inside the Lambda free tier.
