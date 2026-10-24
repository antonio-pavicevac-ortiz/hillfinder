// Measures whether GPS updates and spoken prompts keep coming while the phone is locked.
// Speech is triggered from location callbacks, like real turn-by-turn guidance; the
// separate timer only records whether ordinary JS timers keep running in the background.

import { BackgroundGeolocation } from "./geolocation.js";
import { App } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
import { Share } from "@capacitor/share";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Capacitor } from "@capacitor/core";

const SPEAK_EVERY_MS = 30_000;
const TIMER_EVERY_MS = 10_000;
const MAX_ENTRIES = 5000;
const LOG_KEY = "spike-log";

const $ = (id) => document.getElementById(id);
let entries = [];
let watcherId = null;
let timer = null;
let appState = "active";
let lastFixAt = null;
let lastSpokenAt = 0;
let stats = { updates: 0, maxGapMs: 0, spoken: 0, ticks: 0 };

function record(type, data = {}) {
  entries.push({ t: new Date().toISOString(), type, app: appState, ...data });
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
  void Preferences.set({ key: LOG_KEY, value: JSON.stringify(entries) });
  render();
}

function render() {
  $("updates").textContent = stats.updates;
  $("gap").textContent = stats.maxGapMs ? `${Math.round(stats.maxGapMs / 1000)} s` : "–";
  $("spoken").textContent = stats.spoken;
  $("ticks").textContent = stats.ticks;
  $("log").textContent = entries.slice(-25).reverse().map(format).join("\n");
}

function format(e) {
  const time = e.t.slice(11, 19);
  const rest = Object.entries(e).filter(([k]) => !["t", "type", "app"].includes(k)).map(([k, v]) => `${k}=${v}`).join(" ");
  return `${time} [${e.app}] ${e.type} ${rest}`;
}

async function speak(text) {
  try {
    // "playback" keeps the iOS audio session alive when the app is in the background
    await TextToSpeech.speak({ text, lang: "en-US", rate: 1.0, category: "playback" });
    stats.spoken++;
    record("spoke", { text: JSON.stringify(text) });
  } catch (err) {
    record("speech-error", { error: JSON.stringify(String(err?.message ?? err)) });
  }
}

function onLocation(location, error) {
  if (error) {
    record("gps-error", { code: error.code, message: JSON.stringify(error.message) });
    if (error.code === "NOT_AUTHORIZED" && window.confirm("Location permission is off. Open settings?")) {
      void BackgroundGeolocation.openSettings();
    }
    return;
  }

  const now = Date.now();
  const gapMs = lastFixAt ? now - lastFixAt : 0;
  lastFixAt = now;
  stats.updates++;
  stats.maxGapMs = Math.max(stats.maxGapMs, gapMs);
  record("gps", {
    lat: location.latitude.toFixed(5),
    lng: location.longitude.toFixed(5),
    acc: Math.round(location.accuracy),
    gapS: (gapMs / 1000).toFixed(1),
  });

  if (now - lastSpokenAt >= SPEAK_EVERY_MS) {
    lastSpokenAt = now;
    void speak(`Update ${stats.updates}. Accuracy ${Math.round(location.accuracy)} meters.`);
  }
}

async function start() {
  $("start").disabled = true;
  try {
    // Android 13+ needs this for the foreground-service notification that keeps GPS running
    if (Capacitor.getPlatform() === "android") {
      const permission = await LocalNotifications.requestPermissions();
      record("notification-permission", { display: permission.display });
    }

    stats = { updates: 0, maxGapMs: 0, spoken: 0, ticks: 0 };
    lastFixAt = null;
    lastSpokenAt = 0;
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: "Hillfinder spike is tracking",
        backgroundMessage: "Recording GPS and spoken prompts for the locked-screen test.",
        requestPermissions: true,
        stale: false,
        distanceFilter: 0,
      },
      onLocation
    );
    timer = setInterval(() => {
      stats.ticks++;
      record("timer");
    }, TIMER_EVERY_MS);
    record("started", { platform: Capacitor.getPlatform() });
    $("status").textContent = "Tracking";
    $("stop").disabled = false;
    void speak("Tracking started. Lock your phone and start walking.");
  } catch (err) {
    record("start-error", { error: JSON.stringify(String(err?.message ?? err)) });
    $("start").disabled = false;
  }
}

async function stop() {
  if (watcherId) await BackgroundGeolocation.removeWatcher({ id: watcherId });
  watcherId = null;
  clearInterval(timer);
  await TextToSpeech.stop().catch(() => {});
  record("stopped", { updates: stats.updates, maxGapS: Math.round(stats.maxGapMs / 1000), spoken: stats.spoken });
  $("status").textContent = "Stopped";
  $("start").disabled = false;
  $("stop").disabled = true;
}

async function shareLog() {
  const header = "time,type,app,details";
  const rows = entries.map((e) => [e.t, e.type, e.app, JSON.stringify(format(e).split("] ")[1] ?? "")].join(","));
  await Share.share({ title: "Hillfinder spike log", text: [header, ...rows].join("\n") });
}

App.addListener("appStateChange", ({ isActive }) => {
  appState = isActive ? "active" : "background";
  record(isActive ? "resumed" : "backgrounded");
});

$("start").addEventListener("click", start);
$("stop").addEventListener("click", stop);
$("share").addEventListener("click", () => shareLog().catch((err) => record("share-error", { error: JSON.stringify(String(err)) })));
$("clear").addEventListener("click", async () => {
  entries = [];
  await Preferences.remove({ key: LOG_KEY });
  render();
});

const saved = await Preferences.get({ key: LOG_KEY });
if (saved.value) entries = JSON.parse(saved.value);
render();
