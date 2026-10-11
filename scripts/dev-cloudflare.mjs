import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import net from "node:net";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectDir = fileURLToPath(new URL("../", import.meta.url));
const localUrl = "http://localhost:3000";

export function extractTunnelUrl(output) {
  return (
    output.match(
      /https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\b/i,
    )?.[0] ?? null
  );
}

export async function assertPortAvailable() {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(3000, () => server.close(resolve));
  });
}

export async function startTunnelDev({
  spawnProcess = spawn,
  saveEnvironment = writeFile,
  checkPort = assertPortAvailable,
  tunnelCommand = "cloudflared",
  tunnelArgs = ["tunnel", "--url", localUrl],
  extractAddress = extractTunnelUrl,
  providerName = "Cloudflare",
  environmentFile = ".env.tunnel",
} = {}) {
  await checkPort();

  const require = createRequire(import.meta.url);
  const nextCli = require.resolve("next/dist/bin/next");
  const tunnel = spawnProcess(tunnelCommand, tunnelArgs, {
    cwd: projectDir,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let app;
  let stopping = false;
  let starting = false;
  let address;
  const buffers = { stdout: "", stderr: "" };

  const timeout = setTimeout(() => {
    console.error(
      `${providerName} did not provide a tunnel address within 60 seconds.`,
    );
    stop(1);
  }, 60_000);

  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    clearTimeout(timeout);
    process.off("SIGINT", onInterrupt);
    process.off("SIGTERM", onTerminate);
    process.exitCode = code;
    app?.kill("SIGTERM");
    tunnel.kill("SIGTERM");
  }

  const onInterrupt = () => stop(130);
  const onTerminate = () => stop(143);
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);

  async function readOutput(stream, chunk) {
    process[stream].write(chunk);
    buffers[stream] = (buffers[stream] + chunk.toString()).slice(-16_384);
    const url = extractAddress(buffers[stream]);
    if (!url || starting || stopping) return;
    starting = true;
    clearTimeout(timeout);
    address = url;

    try {
      // This file is a reference for the current session, not an address to
      // reuse after cloudflared exits. Existing .env.local settings stay intact.
      await saveEnvironment(
        path.join(projectDir, environmentFile),
        `# Generated for the current tunnel session; do not commit.\nNEXTAUTH_URL=${url}\nNEXTAUTH_URL_INTERNAL=${localUrl}\n`,
        { mode: 0o600 },
      );
      if (stopping) return;
      console.log(`\nPhone preview: ${url}`);
      console.log(
        `Google authorized redirect URI: ${url}/api/auth/callback/google`,
      );
      console.log(
        "Register that exact redirect URI in your Google OAuth client before signing in.",
      );
      console.log(
        `Current address saved in ${environmentFile}. Ctrl+C stops both processes.\n`,
      );

      app = spawnProcess(
        process.execPath,
        [nextCli, "dev", "--turbopack", "-p", "3000"],
        {
          cwd: projectDir,
          env: {
            ...process.env,
            NEXTAUTH_URL: url,
            NEXTAUTH_URL_INTERNAL: localUrl,
          },
          stdio: "inherit",
        },
      );
      app.once("error", (error) => {
        console.error(`Could not start Next.js: ${error.message}`);
        stop(1);
      });
      app.once("exit", (code) => {
        if (!stopping) stop(code ?? 1);
      });
    } catch (error) {
      console.error(`Could not prepare the tunnel session: ${error.message}`);
      stop(1);
    }
  }

  tunnel.stdout.on("data", (chunk) => void readOutput("stdout", chunk));
  tunnel.stderr.on("data", (chunk) => void readOutput("stderr", chunk));
  tunnel.once("error", (error) => {
    console.error(`Could not start ${tunnelCommand}: ${error.message}`);
    stop(1);
  });
  tunnel.once("exit", (code) => {
    if (stopping) return;
    console.error(
      address
        ? `${providerName} tunnel stopped.`
        : `${providerName} exited before providing an address.`,
    );
    stop(code || 1);
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  startTunnelDev().catch((error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? "Port 3000 is in use. Stop the current development server, then run npm run dev:cloudflare again."
        : `Could not start the tunnel session: ${error.message}`,
    );
    process.exitCode = 1;
  });
}
