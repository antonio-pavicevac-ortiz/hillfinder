import { Capacitor, registerPlugin } from "@capacitor/core";

// The ride card on the iPhone's lock screen and in the Dynamic Island (a Live Activity).
// Only the iPhone app from 1.1 on has it; everywhere else these calls do nothing.

export type RideCardState = {
  phase: "toStart" | "riding" | "offRoute" | "arrived";
  instruction: string;
  distance?: string;
  nextInstruction?: string;
  maneuver?: "left" | "slightLeft" | "right" | "slightRight" | "uturn" | "straight" | "arrive";
  rideTime?: string;
  rideDistance?: string;
};

type LiveActivityPlugin = {
  start(options: { destinationName?: string; state: RideCardState }): Promise<void>;
  update(options: { state: RideCardState }): Promise<void>;
  end(options: { state?: RideCardState }): Promise<void>;
};

// Lives in the app itself (ios/App/App/LiveActivityPlugin.swift), not in an npm package
const LiveActivity = registerPlugin<LiveActivityPlugin>("LiveActivity");

// The distance changes with nearly every location fix; the card doesn't need all of them
const DISTANCE_UPDATE_MS = 3000;

let active = false;
let lastSent: RideCardState | null = null;
let lastSentAt = 0;
// Calls are async; chaining them keeps an end from overtaking the start before it
let queue: Promise<void> = Promise.resolve();

function send(call: () => Promise<void>) {
  queue = queue
    .then(call)
    // The 1.0 app doesn't have the plugin, and the rider may have turned Live Activities off
    .catch((err) => console.warn("[liveActivity]", err));
}

function onlyDistanceChanged(a: RideCardState, b: RideCardState) {
  return a.distance !== b.distance && JSON.stringify({ ...a, distance: "" }) === JSON.stringify({ ...b, distance: "" });
}

/** Shows the ride card, or brings it up to date. */
export function showRideCard(state: RideCardState, destinationName?: string) {
  if (!Capacitor.isNativePlatform()) return;

  if (!active) {
    active = true;
    lastSent = state;
    lastSentAt = Date.now();
    send(() => LiveActivity.start({ destinationName, state }));
    return;
  }

  if (lastSent && JSON.stringify(lastSent) === JSON.stringify(state)) return;
  if (lastSent && onlyDistanceChanged(lastSent, state) && Date.now() - lastSentAt < DISTANCE_UPDATE_MS) return;

  lastSent = state;
  lastSentAt = Date.now();
  send(() => LiveActivity.update({ state }));
}

/**
 * Ends the ride card. With a final state it stays on the lock screen for a few minutes
 * showing it; without one it disappears at once.
 */
export function endRideCard(finalState?: RideCardState) {
  if (!Capacitor.isNativePlatform()) return;
  // An arrived card still shows after it ends, so ending with no state still has work to do
  if (!active && !lastSent) return;

  active = false;
  lastSent = finalState ?? null;
  send(() => LiveActivity.end({ state: finalState }));
}
