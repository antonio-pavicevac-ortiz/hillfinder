import { assertNotProductionDatabase, mongoDbName } from "@/lib/env/resourceIsolation";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("❌ Missing MONGODB_URI in environment variables");
}

// Maintain a cached connection across hot reloads in dev
let isConnected = false;

export const connectToDB = async () => {
  if (isConnected) {
    console.log("🟢 MongoDB: Using existing connection");
    return;
  }

  // Use the database named in MONGODB_URI (or MONGODB_DB) rather than a hardcoded
  // default, so a development connection string can't silently land on production
  const dbName = mongoDbName(MONGODB_URI);
  assertNotProductionDatabase(dbName);

  try {
    const db = await mongoose.connect(MONGODB_URI, { dbName });

    isConnected = !!db.connections[0].readyState;
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
};
