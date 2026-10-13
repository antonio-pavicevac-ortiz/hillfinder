import { assertNotProductionUploadThing } from "@/lib/env/resourceIsolation";
import { UTApi } from "uploadthing/server";

// All server-side UploadThing calls go through here so non-production runtimes can't
// reach the production app
export function createUTApi() {
  assertNotProductionUploadThing();
  return new UTApi();
}
