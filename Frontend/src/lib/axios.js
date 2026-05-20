import axios from "axios";

const normalizeApiBaseUrl = (raw) => {
  const base = String(raw || "").trim().replace(/\/+$/, "");
  // Default matches the local AgriHub backend setup (PORT=5000).
  if (!base) return "http://localhost:5000/api";
  return base.endsWith("/api") ? base : `${base}/api`;
};

export const axiosInstance = axios.create({
  // Set `VITE_API_BASE_URL` to your backend origin (without `/api`) or the full `/api` URL.
  // Examples:
  // - http://localhost:3000
  // - http://localhost:3000/api
  // - https://agrihub.example.com
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  withCredentials: true,
  timeout: 15000,
});
