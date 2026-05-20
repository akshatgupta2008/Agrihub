import { ENV } from "./ENV.js";

/**
 * Minimal environment validation.
 *
 * Hackathon projects often "work" until an auth path is exercised.
 * Validating early gives a clear error instead of random 401s/500s later.
 */
export const validateEnv = () => {
  const missing = [];

  // JWT is required for all authenticated routes.
  if (!ENV.JWT_SECRET) missing.push("JWT_SECRET");

  // If running in dev, we warn rather than exit.
  if (missing.length > 0) {
    const message = `[ENV] Missing required env var(s): ${missing.join(", ")}`;

    if (ENV.NODE_ENV === "development") {
      console.warn(message);
      console.warn("[ENV] Auth routes will not work until you set them in Backend/src/.env");
      return;
    }

    // Production should fail fast.
    throw new Error(message);
  }

  // Cookie sanity: SameSite=None requires Secure in modern browsers.
  if (ENV.COOKIE_SAMESITE === "none") {
    const secure = ENV.COOKIE_SECURE === null ? ENV.NODE_ENV !== "development" : ENV.COOKIE_SECURE;
    if (!secure) {
      console.warn("[ENV] COOKIE_SAMESITE=none requires COOKIE_SECURE=true (otherwise browsers will drop the cookie)");
    }
  }
};
