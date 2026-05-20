import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const safeMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    (error?.code === "ERR_NETWORK" ? "Network error" : null) ||
    fallback
  );
};

// Register interceptors once for the whole app.
let interceptorsRegistered = false;
const ensureAuthInterceptors = (set) => {
  if (interceptorsRegistered) return;
  interceptorsRegistered = true;

  axiosInstance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error?.response?.status === 401) {
        // Session expired/invalidated: make UI consistent.
        set({ authUser: null });
      }
      return Promise.reject(error);
    }
  );
};

export const useAuthStore = create((set) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    ensureAuthInterceptors(set);
    try {
      const res = await axiosInstance.get("/auth/me");
      set({ authUser: res.data });
    } catch {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  patientSignup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/patient/register", data);
      set({ authUser: res.data });
      toast.success("User account created");
      return res.data;
    } catch (error) {
      toast.error(safeMessage(error, "Signup failed"));
      return null;
    } finally {
      set({ isSigningUp: false });
    }
  },

  patientLogin: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/patient/login", data);
      set({ authUser: res.data });
      toast.success("Logged in");
      return res.data;
    } catch (error) {
      toast.error(safeMessage(error, "Login failed"));
      return null;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  adminSignup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/admin/register", data);
      set({ authUser: res.data });
      toast.success("Platform admin account created");
      return res.data;
    } catch (error) {
      toast.error(safeMessage(error, "Signup failed"));
      return null;
    } finally {
      set({ isSigningUp: false });
    }
  },

  adminLogin: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/admin/login", data);
      set({ authUser: res.data });
      toast.success("Logged in");
      return res.data;
    } catch (error) {
      toast.error(safeMessage(error, "Login failed"));
      return null;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  doctorLogin: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/doctor/login", data);
      set({ authUser: res.data });
      toast.success("Logged in");
      return res.data;
    } catch (error) {
      toast.error(safeMessage(error, "Login failed"));
      return null;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out");
    } catch (error) {
      toast.error(safeMessage(error, "Logout failed"));
    }
  },
}));
