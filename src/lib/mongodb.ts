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

  try {
    const db = await mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || "hillfinder",
    });

    isConnected = !!db.connections[0].readyState;
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
};
