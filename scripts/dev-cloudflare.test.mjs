import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import { startTunnelDev } from "./dev-cloudflare.mjs";

function fakeProcess() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.signals = [];
  child.kill = (signal) => {
    child.signals.push(signal);
    child.emit("exit", null);
  };
  return child;
}

test("captures a split URL, starts Next once with the right environment, and cleans up", async () => {
  const tunnel = fakeProcess();
  const app = fakeProcess();
  const calls = [];
  const files = [];
  const oldExitCode = process.exitCode;
  try {
    await startTunnelDev({
      checkPort: async () => {},
      saveEnvironment: async (...args) => files.push(args),
      spawnProcess: (...args) => {
        calls.push(args);
        return calls.length === 1 ? tunnel : app;
      },
    });
    tunnel.stderr.emit("data", Buffer.from("Tunnel: https://hillfinder-"));
    assert.equal(calls.length, 1);
    tunnel.stderr.emit("data", Buffer.from("test.trycloudflare.com\n"));
    await setImmediate();
    tunnel.stderr.emit(
      "data",
      Buffer.from("https://hillfinder-test.trycloudflare.com\n"),
    );
    await setImmediate();
    assert.equal(calls.length, 2);
    assert.equal(
      calls[1][2].env.NEXTAUTH_URL,
      "https://hillfinder-test.trycloudflare.com",
    );
    assert.equal(
      calls[1][2].env.NEXTAUTH_URL_INTERNAL,
      "http://localhost:3000",
    );
    assert.equal(files.length, 1);
    assert.match(files[0][0], /\.env\.tunnel$/);
    assert.match(
      files[0][1],
      /NEXTAUTH_URL=https:\/\/hillfinder-test\.trycloudflare\.com/,
    );
    app.emit("exit", 0);
    assert.deepEqual(tunnel.signals, ["SIGTERM"]);
  } finally {
    // Ensure timers and children are stopped even if an assertion fails.
    app.emit("exit", 0);
    process.exitCode = oldExitCode;
  }
});

test("does not create a public tunnel when port 3000 is already occupied", async () => {
  let spawned = false;
  await assert.rejects(
    startTunnelDev({
      checkPort: async () => {
        throw Object.assign(new Error("Port occupied"), { code: "EADDRINUSE" });
      },
      spawnProcess: () => {
        spawned = true;
      },
    }),
    { code: "EADDRINUSE" },
  );
  assert.equal(spawned, false);
});

test("a tunnel failure stops startup without launching Next", async () => {
  const tunnel = fakeProcess();
  const oldExitCode = process.exitCode;
  let spawned = 0;
  try {
    await startTunnelDev({
      checkPort: async () => {},
      spawnProcess: () => {
        spawned += 1;
        return tunnel;
      },
    });
    tunnel.emit("error", new Error("cloudflared unavailable"));
    assert.equal(spawned, 1);
    assert.equal(process.exitCode, 1);
    assert.deepEqual(tunnel.signals, ["SIGTERM"]);
  } finally {
    tunnel.emit("exit", 1);
    process.exitCode = oldExitCode;
  }
});
