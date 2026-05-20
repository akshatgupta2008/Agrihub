import jwt from "jsonwebtoken";
import { ENV } from "./ENV.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const signToken = ({ userId, role }) => {
  if (!ENV.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign({ userId, role }, ENV.JWT_SECRET, { expiresIn: "7d" });
};

export const setAuthCookie = (res, token) => {
  const sameSite = ["strict", "lax", "none"].includes(ENV.COOKIE_SAMESITE)
    ? ENV.COOKIE_SAMESITE
    : "strict";
  const secure = ENV.COOKIE_SECURE === null ? ENV.NODE_ENV !== "development" : ENV.COOKIE_SECURE;

  res.cookie("jwt", token, {
    maxAge: SEVEN_DAYS_MS,
    httpOnly: true,
    sameSite,
    secure,
    ...(ENV.COOKIE_DOMAIN ? { domain: ENV.COOKIE_DOMAIN } : {}),
  });
};

export const clearAuthCookie = (res) => {
  const sameSite = ["strict", "lax", "none"].includes(ENV.COOKIE_SAMESITE)
    ? ENV.COOKIE_SAMESITE
    : "strict";
  const secure = ENV.COOKIE_SECURE === null ? ENV.NODE_ENV !== "development" : ENV.COOKIE_SECURE;

  res.cookie("jwt", "", {
    maxAge: 0,
    httpOnly: true,
    sameSite,
    secure,
    ...(ENV.COOKIE_DOMAIN ? { domain: ENV.COOKIE_DOMAIN } : {}),
    path: "/",
  });
};
