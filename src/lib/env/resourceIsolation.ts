// Production data must only be reachable from the Production deployment. Local dev and
// Vercel Preview use their own MongoDB database and UploadThing app; these checks stop a
// non-production runtime that has been pointed at production resources by mistake.

const PRODUCTION_DB_NAME = "hillfinder";
const PRODUCTION_UPLOADTHING_APP_ID = "e5zsmh6uzp";

export function isProductionDeployment() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

// MONGODB_DB wins; otherwise use the database named in the connection string's path
export function mongoDbName(uri: string) {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB;
  const path = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/)?.[1];
  if (!path) throw new Error("MONGODB_URI must name a database (…/dbname) or set MONGODB_DB");
  return decodeURIComponent(path);
}

// UploadThing tokens are base64-encoded JSON that includes the app id
function uploadThingAppId(token: string | undefined) {
  if (!token) return null;
  try {
    return JSON.parse(Buffer.from(token, "base64").toString("utf8")).appId ?? null;
  } catch {
    return null;
  }
}

export function assertNotProductionDatabase(dbName: string) {
  if (!isProductionDeployment() && dbName === PRODUCTION_DB_NAME) {
    throw new Error(
      `Refusing to connect to the production database "${dbName}" outside Production. ` +
        "Use the development MONGODB_URI (see README)."
    );
  }
}

export function assertNotProductionUploadThing() {
  const appId = uploadThingAppId(process.env.UPLOADTHING_TOKEN);
  if (!isProductionDeployment() && appId === PRODUCTION_UPLOADTHING_APP_ID) {
    throw new Error(
      "Refusing to use the production UploadThing app outside Production. " +
        "Use the development UPLOADTHING_TOKEN (see README)."
    );
  }
}
