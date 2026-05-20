import pino from "pino";

// Keep logs structured for production, but readable in dev.
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "development" ? "debug" : "info"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.registerToken",
    ],
    remove: true,
  },
});
