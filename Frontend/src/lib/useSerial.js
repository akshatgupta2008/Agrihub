import { useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useAssistiveStore } from "../store/useAssistiveStore";

const CHAR_DELAY_MS = 2000;

export function useSerial() {
  const portRef = useRef(null);
  const queueRef = useRef([]);
  const drainingRef = useRef(false);

  const sendChar = useCallback(async (char) => {
    const port = portRef.current;
    if (!port?.writable) return;

    const writer = port.writable.getWriter();
    try {
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(char));
    } finally {
      writer.releaseLock();
    }
  }, []);

  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const word = queueRef.current.shift();
        const letters = String(word || "")
          .toUpperCase()
          .replace(/[^A-Z]/g, "");

        for (let i = 0; i < letters.length; i++) {
          if (!portRef.current) break;
          useAssistiveStore
            .getState()
            .setVibrateProgress(`📳 ${letters[i]} (${i + 1}/${letters.length}) — "${word}"`);
          await sendChar(letters[i]);
          await new Promise((r) => setTimeout(r, CHAR_DELAY_MS));
        }
      }
    } finally {
      useAssistiveStore.getState().setVibrateProgress("");
      drainingRef.current = false;
    }
  }, [sendChar]);

  const enqueue = useCallback(
    (text) => {
      if (!portRef.current) return;
      const words = String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      queueRef.current.push(...words);
      drainQueue();
    },
    [drainQueue]
  );

  const connect = useCallback(async () => {
    if (!("serial" in navigator)) {
      toast.error("Web Serial not supported. Use Chrome/Edge.");
      return;
    }

    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      useAssistiveStore.getState().setArduinoConnected(true);
      toast.success("Arduino connected");
    } catch {
      // User cancelled picker or port open failed
    }
  }, []);

  const disconnect = useCallback(async () => {
    queueRef.current = [];
    drainingRef.current = false;

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch {
        // ignore
      }
      portRef.current = null;
    }

    const store = useAssistiveStore.getState();
    store.setArduinoConnected(false);
    store.setVibrateProgress("");
    store.setAutoVibrate(false);
    toast.success("Arduino disconnected");
  }, []);

  return { connect, disconnect, enqueue };
}
