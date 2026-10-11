import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import { startTunnelDev } from "./dev-cloudflare.mjs";

export function extractNgrokUrl(output) {
  for (const line of output.split(/\r?\n/)) {
    try {
      const entry = JSON.parse(line);
      if (entry.msg !== "started tunnel" || typeof entry.url !== "string")
        continue;
      const url = new URL(entry.url);
      if (url.protocol === "https:") return url.origin;
    } catch {
      // A JSON log entry may arrive across multiple chunks; wait for the rest.
    }
  }
  return null;
}

export function validateNgrokUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "NGROK_URL must be an HTTPS origin, such as https://your-domain.ngrok-free.app",
    );
  }
  return url.origin;
}

export async function startNgrokDev() {
  let savedUrl;
  try {
    const file = await readFile(
      new URL("../.env.ngrok", import.meta.url),
      "utf8",
    );
    savedUrl = parse(file).NEXTAUTH_URL;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const configuredUrl = process.env.NGROK_URL || savedUrl;
  const args = [
    "http",
    "http://localhost:3000",
    "--log",
    "stdout",
    "--log-format",
    "json",
  ];
  if (configuredUrl) args.push("--url", validateNgrokUrl(configuredUrl));

  return startTunnelDev({
    tunnelCommand: "ngrok",
    tunnelArgs: args,
    extractAddress: extractNgrokUrl,
    providerName: "ngrok",
    environmentFile: ".env.ngrok",
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  startNgrokDev().catch((error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? "Port 3000 is in use. Stop the current development server, then run npm run dev:ngrok again."
        : `Could not start ngrok: ${error.message}`,
    );
    process.exitCode = 1;
  });
}
