import express from "express";
import { ENV } from "../lib/ENV.js";

const router = express.Router();

const postWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await res.json() : await res.text();

    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timeoutId);
  }
};

router.post("/start", async (req, res) => {
  try {
    const result = await postWithTimeout(
      `${ENV.GESTURE_SERVICE_URL.replace(/\/$/, "")}/api/start-mouse`,
      ENV.GESTURE_SERVICE_TIMEOUT_MS
    );

    if (!result.ok) {
      return res.status(502).json({
        message: "Gesture service returned an error",
        gesture: { status: result.status, body: result.body },
      });
    }

    return res.json({ message: "Gesture control started", gesture: result.body });
  } catch (e) {
    const isAbort = e?.name === "AbortError";
    return res.status(502).json({
      message: isAbort ? "Gesture service timed out" : "Failed to reach gesture service",
      error: String(e?.message || e),
      gestureServiceUrl: ENV.GESTURE_SERVICE_URL,
    });
  }
});

router.post("/stop", async (req, res) => {
  try {
    const result = await postWithTimeout(
      `${ENV.GESTURE_SERVICE_URL.replace(/\/$/, "")}/api/stop-mouse`,
      ENV.GESTURE_SERVICE_TIMEOUT_MS
    );

    if (!result.ok) {
      return res.status(502).json({
        message: "Gesture service returned an error",
        gesture: { status: result.status, body: result.body },
      });
    }

    return res.json({ message: "Gesture control stopped", gesture: result.body });
  } catch (e) {
    const isAbort = e?.name === "AbortError";
    return res.status(502).json({
      message: isAbort ? "Gesture service timed out" : "Failed to reach gesture service",
      error: String(e?.message || e),
      gestureServiceUrl: ENV.GESTURE_SERVICE_URL,
    });
  }
});

export default router;
