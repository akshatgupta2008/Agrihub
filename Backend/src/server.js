import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { ENV } from "./lib/ENV.js";
import { connectDB } from "./lib/db.js";
import { validateEnv } from "./lib/validateEnv.js";
import { logger } from "./lib/logger.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import patientRoutes from "./routes/patient.route.js";
import patientDashboardRoutes from "./routes/patient.dashboard.route.js";
import adminRoutes from "./routes/admin.route.js";
import doctorRoutes from "./routes/doctor.route.js";
import authRoutes from "./routes/auth.route.js";
import publicRoutes from "./routes/public.route.js";
import gestureRoutes from "./routes/gesture.route.js";
import feedbackRoutes from "./routes/feedback.route.js";
import chatbotRoutes from "./routes/chatbot.route.js";

const app = express();
const PORT = ENV.PORT;

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // non-browser clients (curl/postman)

  // If explicitly configured, use allow-list.
  if (Array.isArray(ENV.CORS_ORIGINS) && ENV.CORS_ORIGINS.length > 0) {
    return ENV.CORS_ORIGINS.includes(origin);
  }

  // Dev default: allow Vite ports when they auto-increment.
  return /^http:\/\/localhost:517\d$/.test(origin);
};

app.disable("x-powered-by");

// Basic hardening
app.use(
  helmet({
    // This app is typically used cross-origin with cookies.
    // If you serve through a reverse proxy, tune CSP there.
    contentSecurityPolicy: false,
  })
);

// Structured request logging
app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    redact: ["req.headers.cookie", "req.headers.authorization"],
  })
);

// Lightweight rate limit (helps protect auth endpoints during demos)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Keep payloads small by default. Increase this only if you really need it.
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Simple uptime/health endpoint for deployments and local debugging.
app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true, env: ENV.NODE_ENV });
});

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);

app.use("/api/patient", patientRoutes);
app.use("/api/patient-dashboard", patientDashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/gesture", gestureRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/chatbot", chatbotRoutes);

app.use(notFound);
app.use(errorHandler);

// Connect to DB before accepting traffic so the API fails fast on misconfig.
validateEnv();
await connectDB();

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
