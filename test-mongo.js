import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // or ".env"
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is not set (check .env.local path/name)");
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("✅ Connected successfully to MongoDB");
} catch (err) {
  console.error("❌ Connection failed:", err);
} finally {
  await client.close();
}
