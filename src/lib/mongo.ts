import "server-only";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "nextauth";

declare global {
  // allow global caching in dev to avoid multiple connections
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise: Promise<MongoClient> = (() => {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise!;
})();

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}
