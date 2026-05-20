import { create } from "zustand";

export const useAssistiveStore = create((set) => ({
  arduinoConnected: false,
  autoVibrate: false,
  vibrateProgress: "",

  setArduinoConnected: (v) => set({ arduinoConnected: Boolean(v) }),
  setAutoVibrate: (v) => set({ autoVibrate: Boolean(v) }),
  setVibrateProgress: (v) => set({ vibrateProgress: String(v || "") }),
}));
