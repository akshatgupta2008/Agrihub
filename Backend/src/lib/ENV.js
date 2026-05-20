import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from a deterministic location so running from
// `Backend/` vs `Backend/src/` doesn't change which `.env` is used.
// Priority:
// 1) Backend/src/.env.local
// 2) Backend/src/.env
// 3) Backend/.env.local
// 4) Backend/.env
const envCandidatePaths = [
  path.resolve(__dirname, "../.env.local"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(__dirname, "../../.env"),
];

for (const envPath of envCandidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export const ENV = {
  PORT: process.env.PORT || 3000,
  // Prefer MONGO_URI, fallback to MONGODB_URI. Trim so accidental whitespace
  // in `.env` doesn't make it look "missing".
  MONGO_URI: (process.env.MONGO_URI || process.env.MONGODB_URI || "").trim() || undefined,
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || "agrihub",
  // Optional: override DNS servers used by Node's resolver (c-ares).
  // This is useful when mongodb+srv SRV lookups fail with ECONNREFUSED.
  // Example: DNS_SERVERS=1.1.1.1,8.8.8.8
  DNS_SERVERS: (process.env.DNS_SERVERS || process.env.MONGO_DNS_SERVERS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  // Optional: explicit local fallback URI (useful when Atlas SRV DNS is blocked).
  // Example: mongodb://127.0.0.1:27017/agrihub
  MONGO_LOCAL_URI: process.env.MONGO_LOCAL_URI,
  // Optional: comma-separated allowed origins for CORS in development/production.
  // Example: http://localhost:5173,http://localhost:5174
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_REGISTER_TOKEN: process.env.ADMIN_REGISTER_TOKEN,

  // Cookie/session behavior (for production deployments behind HTTPS + custom domains)
  // Allowed values for COOKIE_SAMESITE: strict | lax | none
  COOKIE_SAMESITE: (process.env.COOKIE_SAMESITE || "strict").toLowerCase(),
  // If set, overrides secure cookie behavior (true/false). Default: secure in non-dev.
  COOKIE_SECURE:
    typeof process.env.COOKIE_SECURE === "undefined" ? null : process.env.COOKIE_SECURE === "true",
  // Optional explicit cookie domain (usually not needed for localhost)
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || null,

  // Optional: Ollama medgemma chatbot service
  // Example: http://localhost:11434
  OLLAMA_URL: process.env.OLLAMA_URL || "http://localhost:11434",

  // Optional: Flask gesture service bridge
  // Example: http://localhost:5001 (or wherever your Flask service runs)
  GESTURE_SERVICE_URL: process.env.GESTURE_SERVICE_URL || "http://localhost:5001",
  GESTURE_SERVICE_TIMEOUT_MS: Number(process.env.GESTURE_SERVICE_TIMEOUT_MS || 8000),

  // Cloudinary (PDF reports)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_REPORTS_FOLDER: process.env.CLOUDINARY_REPORTS_FOLDER || "agrihub/reports",

  // Optional: enable online appointment Meet links via Google Calendar API
  GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
  GOOGLE_TIMEZONE: process.env.GOOGLE_TIMEZONE || "UTC",

  // Optional: per-doctor OAuth (recommended) for creating Meet links in the doctor's calendar
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,

  NODE_ENV: process.env.NODE_ENV || "development",
};
