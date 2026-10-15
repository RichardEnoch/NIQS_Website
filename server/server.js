// Anchor to server/.env so the app works when launched from the repo root too
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectDB = require("./config/db");

const app = express();

// Behind the ECS Express Mode Application Load Balancer, so honour X-Forwarded-*
// (one hop). Without this req.protocol reads "http" and `secure` cookies never set.
app.set("trust proxy", 1);

// Flipped by the SIGTERM handler at the bottom of this file; read by /api/health.
let shuttingDown = false;

// Connect to MongoDB
connectDB();

// Allowed origins — add any extra frontend URLs here
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://niqs-website.vercel.app",
  // Also allow any Vercel preview URLs for this project
  /https:\/\/niqs-website.*\.vercel\.app$/,
];

if (process.env.CLIENT_URL) {
  // Support comma-separated list e.g. "http://localhost:5173,https://niqs-website.vercel.app"
  process.env.CLIENT_URL.split(",").forEach((url) => {
    const trimmed = url.trim();
    if (trimmed) ALLOWED_ORIGINS.push(trimmed);
  });
}

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, mobile apps, server-to-server)
      if (!origin) return callback(null, true);

      const allowed = ALLOWED_ORIGINS.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin)
      );

      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files (uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/news", require("./routes/news"));
app.use("/api/events", require("./routes/events"));
app.use("/api/flyer-requests", require("./routes/flyerRequests"));
app.use("/api/registrations", require("./routes/registrations"));
app.use("/api/exco", require("./routes/exco"));
app.use("/api/chapters", require("./routes/chapters"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/careers", require("./routes/careers"));
app.use("/api/employers", require("./routes/employers"));
app.use("/api/job-admin", require("./routes/jobAdmin"));
app.use("/api/partners", require("./routes/partners"));
app.use("/api/members", require("./routes/members"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/brand-materials", require("./routes/brandMaterials"));
app.use("/api/president", require("./routes/president"));
app.use("/api/past-presidents", require("./routes/pastPresidents"));
app.use("/api/site-settings", require("./routes/siteSettings"));
app.use("/api/contact-info", require("./routes/contactInfo"));
app.use("/api/qs-firms", require("./routes/qsFirms"));
app.use("/api/exam-results", require("./routes/examResults"));
app.use("/api/qs-connect", require("./routes/qsConnect"));
app.use("/api/webinars", require("./routes/webinars"));
app.use("/api/workshop-materials", require("./routes/workshopMaterials"));
app.use("/api/journals", require("./routes/journals"));
app.use("/api/library", require("./routes/library"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/qs", require("./routes/qs"));

// Health check — also the ALB target-group probe for the ECS Express service.
// Deliberately does NOT fail on a Mongo blip: a transient database outage would
// otherwise make every task unhealthy and take the whole service down. Mongo state
// is reported for observability only. During drain we return 503 so the ALB
// deregisters this task promptly instead of racing the shutdown.
app.get("/api/health", (req, res) => {
  const mongoState = require("mongoose").connection.readyState; // 1 = connected
  res.status(shuttingDown ? 503 : 200).json({
    status: shuttingDown ? "draining" : "ok",
    mongo: mongoState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`NIQS Server running on port ${PORT}`);
});

// Job board housekeeping: closes listings past their deadline, ends featured
// placements, purges applicant data past its retention date.
require("./utils/jobBoardService").start();

/**
 * Graceful shutdown. ECS sends SIGTERM and waits 30s before SIGKILL, so every
 * deploy would otherwise drop whatever requests were mid-flight.
 *
 * The sequencing matters. `server.close()` alone is not enough: it stops new
 * connections but waits for every *existing* socket to close, and both browsers
 * and the ALB hold idle keep-alive sockets open for far longer than the 30s
 * window. So we also close idle sockets explicitly, and force the stragglers.
 *
 *   1. flip /api/health to 503 so the ALB deregisters this task
 *   2. keep serving for PRE_DRAIN_MS while that deregistration propagates
 *   3. stop accepting, and drop sockets sitting idle in keep-alive
 *   4. after DRAIN_TIMEOUT_MS, force-close whatever is still in flight
 */
const PRE_DRAIN_MS     = Number(process.env.PRE_DRAIN_MS || 5_000);
const DRAIN_TIMEOUT_MS = Number(process.env.DRAIN_TIMEOUT_MS || 10_000);

async function closeMongoAndExit(code) {
  try {
    await require("mongoose").connection.close(false);
    console.log("Shutdown complete");
  } catch (e) {
    console.error("Error closing MongoDB connection:", e.message);
    code = code || 1;
  }
  process.exit(code);
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — health now 503, deregistering`);

  setTimeout(() => {
    console.log("Draining connections");

    let closed = false;
    server.close((err) => {
      if (closed) return;
      closed = true;
      if (err) {
        console.error("Error closing HTTP server:", err.message);
        return closeMongoAndExit(1);
      }
      closeMongoAndExit(0);
    });

    // Idle keep-alive sockets would otherwise hold server.close() open until
    // their timeout. Active requests are untouched and still get to finish.
    server.closeIdleConnections();

    // Backstop for genuinely long-running requests: force them, then exit 0 —
    // this is an expected outcome of a deploy, not a failure.
    const force = setTimeout(() => {
      if (closed) return;
      console.warn(`Drain exceeded ${DRAIN_TIMEOUT_MS}ms — forcing remaining connections`);
      server.closeAllConnections();
      closed = true;
      closeMongoAndExit(0);
    }, DRAIN_TIMEOUT_MS);
    force.unref();
  }, PRE_DRAIN_MS);
}

["SIGTERM", "SIGINT"].forEach((sig) => process.on(sig, () => shutdown(sig)));
