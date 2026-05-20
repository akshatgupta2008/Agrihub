import mongoose from "mongoose";
import dns from "dns";
import { ENV } from "./ENV.js";

// Prevent requests from hanging forever when MongoDB is unavailable.
// With buffering enabled, Mongoose will queue operations until a connection exists.
mongoose.set("bufferCommands", false);

const ensureMongoSrvDnsWorks = () => {
    const uri = ENV.MONGO_URI;
    if (!uri || !String(uri).startsWith("mongodb+srv://")) return;

    // Prefer explicit configuration.
    if (Array.isArray(ENV.DNS_SERVERS) && ENV.DNS_SERVERS.length > 0) {
        dns.setServers(ENV.DNS_SERVERS);
        console.log(`[DNS] Using custom DNS servers for MongoDB SRV: ${ENV.DNS_SERVERS.join(", ")}`);
        return;
    }

    // Heuristic: when Node is configured with only localhost DNS, SRV lookups will ECONNREFUSED.
    // In development, switch to public resolvers to keep Atlas working.
    if (ENV.NODE_ENV === "development") {
        const current = dns.getServers();
        const isOnlyLoopback =
            Array.isArray(current) &&
            current.length > 0 &&
            current.every((s) => {
                const v = String(s).trim();
                return v === "127.0.0.1" || v === "::1";
            });

        if (isOnlyLoopback) {
            const fallback = ["1.1.1.1", "8.8.8.8"];
            dns.setServers(fallback);
            console.warn(`[DNS] Node resolver is localhost-only (${current.join(", ")}); using ${fallback.join(", ")} for MongoDB SRV`);
        }
    }
};

export const connectDB = async () => {
    // Avoid reconnecting if already connected/connecting.
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
        return mongoose.connection;
    }

    const primaryUri = ENV.MONGO_URI;
    const dbName = ENV.MONGO_DB_NAME || "agrihub";
    const localFallbackUri = ENV.MONGO_LOCAL_URI || `mongodb://127.0.0.1:27017/${dbName}`;

    const buildConnectOptions = (uri) => {
        const base = {
            serverSelectionTimeoutMS: 8000,
        };

        try {
            const uriWithoutQuery = String(uri || "").split("?")[0];
            const afterHost = uriWithoutQuery.replace(/^mongodb(\+srv)?:\/\/[^/]+/, "");
            const hasDbInPath = afterHost && afterHost !== "/" && afterHost.trim() !== "";
            return hasDbInPath ? base : { ...base, dbName };
        } catch {
            return { ...base, dbName };
        }
    };

    mongoose.connection.on("error", (err) => {
        console.error("[MongoDB] Connection error:", err?.message || err);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("[MongoDB] Disconnected");
    });

    // If no URI is configured, use local MongoDB in development.
    if (!primaryUri) {
        console.warn("[MongoDB] Missing connection string. Set MONGO_URI in .env file.");
        console.warn(`[MongoDB] Falling back to local MongoDB: ${localFallbackUri}`);

        try {
            const conn = await mongoose.connect(localFallbackUri, buildConnectOptions(localFallbackUri));
            console.log(`MongoDB Connected: ${conn.connection.host} (db: ${conn.connection.name})`);
            return conn.connection;
        } catch (error) {
            console.error(`[MongoDB] Failed to connect to local fallback: ${error.message}`);
            return null;
        }
    }

    // Ensure mongodb+srv can resolve SRV records in Node.
    ensureMongoSrvDnsWorks();

    try {
        const conn = await mongoose.connect(primaryUri, buildConnectOptions(primaryUri));
        console.log(`MongoDB Connected: ${conn.connection.host} (db: ${conn.connection.name})`);
        return conn.connection;
    } catch (error) {
        console.error(`[MongoDB] Failed to connect: ${error.message}`);

        // Developer-friendly fallback: Atlas SRV DNS can be blocked on some networks.
        // If a local URI is available, try it in development.
        if (ENV.NODE_ENV === "development") {
            try {
                console.warn(`[MongoDB] Attempting local fallback: ${localFallbackUri}`);
                const conn = await mongoose.connect(
                    localFallbackUri,
                    buildConnectOptions(localFallbackUri)
                );
                console.log(`MongoDB Connected (fallback): ${conn.connection.host} (db: ${conn.connection.name})`);
                return conn.connection;
            } catch (fallbackError) {
                console.error(
                    `[MongoDB] Failed to connect to local fallback: ${fallbackError?.message || fallbackError}`
                );
            }
        }

        // In production, fail fast so you don't serve a broken API.
        if (ENV.NODE_ENV !== "development") {
            process.exit(1);
        }

        return null;
    }
};