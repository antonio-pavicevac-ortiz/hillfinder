// src/app/api/uploadthing/route.ts
import { assertNotProductionUploadThing } from "@/lib/env/resourceIsolation";
import { createRouteHandler } from "uploadthing/next";
import { uploadRouter } from "./core";

assertNotProductionUploadThing();

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
});
