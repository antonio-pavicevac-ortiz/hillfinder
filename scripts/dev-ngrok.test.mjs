import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import { extractNgrokUrl, validateNgrokUrl } from "./dev-ngrok.mjs";
import { startTunnelDev } from "./dev-cloudflare.mjs";

test("ignores unrelated and incomplete logs, accepts HTTPS tunnel starts", () => {
  assert.equal(
    extractNgrokUrl('{"msg":"started tunnel","url":"https://preview.'),
    null,
  );
  assert.equal(
    extractNgrokUrl('{"msg":"help","url":"https://ngrok.com"}'),
    null,
  );
  assert.equal(
    extractNgrokUrl(
      '{"msg":"started tunnel","url":"http://example.ngrok-free.app"}',
    ),
    null,
  );
  assert.equal(
    extractNgrokUrl(
      'other log\n{"msg":"started tunnel","url":"https://example.ngrok-free.app"}\n',
    ),
    "https://example.ngrok-free.app",
  );
});

test("validates a pinned address without accepting credentials or paths", () => {
  assert.equal(
    validateNgrokUrl("https://example.ngrok-free.app/"),
    "https://example.ngrok-free.app",
  );
  for (const value of [
    "http://example.com",
    "https://user:pass@example.com",
    "https://example.com/path",
    "https://example.com/?test=1",
  ]) {
    assert.throws(() => validateNgrokUrl(value));
  }
});

test("ngrok logs configure Next and persist the discovered origin", async () => {
  const calls = [],
    files = [];
  const tunnel = new EventEmitter(),
    app = new EventEmitter();
  tunnel.stdout = new EventEmitter();
  tunnel.stderr = new EventEmitter();
  tunnel.kill = () => {};
  app.kill = () => {};
  const oldExitCode = process.exitCode;
  try {
    await startTunnelDev({
      checkPort: async () => {},
      spawnProcess: (...args) => {
        calls.push(args);
        return calls.length === 1 ? tunnel : app;
      },
      saveEnvironment: async (...args) => files.push(args),
      tunnelCommand: "ngrok",
      tunnelArgs: ["http", "3000", "--log", "stdout", "--log-format", "json"],
      extractAddress: extractNgrokUrl,
      providerName: "ngrok",
      environmentFile: ".env.ngrok",
    });
    tunnel.stdout.emit(
      "data",
      Buffer.from('{"msg":"started tunnel","url":"https://example.'),
    );
    assert.equal(calls.length, 1);
    tunnel.stdout.emit("data", Buffer.from('ngrok-free.app"}\n'));
    await setImmediate();
    assert.equal(calls[0][0], "ngrok");
    assert.equal(
      calls[1][2].env.NEXTAUTH_URL,
      "https://example.ngrok-free.app",
    );
    assert.match(files[0][0], /\.env\.ngrok$/);
    assert.match(files[0][1], /NEXTAUTH_URL=https:\/\/example.ngrok-free.app/);
  } finally {
    app.emit("exit", 0);
    tunnel.emit("exit", 0);
    process.exitCode = oldExitCode;
  }
});
