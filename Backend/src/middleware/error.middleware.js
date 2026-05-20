// Centralized error/404 handling for consistent API responses.
// Express 5 will forward thrown errors and rejected promises here.

import { ZodError } from "zod";
import { HttpError } from "../lib/httpError.js";

export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusFromError = err instanceof HttpError ? err.statusCode : null;
  const status =
    statusFromError || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  // Zod validation
  if (err instanceof ZodError) {
    const first = err.issues?.[0];
    const path = first?.path?.length ? first.path.join(".") : "input";
    const msg = first?.message || "Invalid request";

    return res.status(400).json({
      message: `${path}: ${msg}`,
      ...(process.env.NODE_ENV === "development" ? { issues: err.issues } : {}),
    });
  }

  // Avoid leaking stack traces in production.
  const payload = {
    message: err?.message || "Internal Server Error",
    ...(err instanceof HttpError && err.details ? { details: err.details } : {}),
    ...(process.env.NODE_ENV === "development" && err?.stack ? { stack: err.stack } : {}),
  };

  res.status(status).json(payload);
};
