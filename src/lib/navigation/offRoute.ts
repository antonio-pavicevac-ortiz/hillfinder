// Decides when a rider has left the route, without reacting to GPS noise. A single fix can
// jump 20 m or more (worse between buildings), so going off route takes several far fixes over
// a few seconds, and coming back takes a couple of close ones. The gap between the two
// distances keeps the state from flickering for someone riding along the edge.

export const OFF_ROUTE_METERS = 35;
export const BACK_ON_ROUTE_METERS = 20;

const MIN_FAR_FIXES = 3;
const MIN_FAR_MS = 5000;
const MIN_NEAR_FIXES = 2;

// Fixes this imprecise say nothing about where the rider is relative to the route
const MAX_USABLE_ACCURACY_METERS = 50;

export type OffRouteState = {
  isOffRoute: boolean;
  farFixes: number;
  farSince: number | null;
  nearFixes: number;
};

export type OffRouteReading = {
  distanceMeters: number;
  accuracyMeters?: number | null;
  now: number;
};

export const initialOffRouteState: OffRouteState = {
  isOffRoute: false,
  farFixes: 0,
  farSince: null,
  nearFixes: 0,
};

export function nextOffRouteState(state: OffRouteState, reading: OffRouteReading): OffRouteState {
  const { distanceMeters, accuracyMeters, now } = reading;

  if (!Number.isFinite(distanceMeters)) return state;
  if (typeof accuracyMeters === "number" && accuracyMeters > MAX_USABLE_ACCURACY_METERS) {
    return state;
  }

  if (state.isOffRoute) {
    if (distanceMeters > BACK_ON_ROUTE_METERS) return { ...state, nearFixes: 0 };

    const nearFixes = state.nearFixes + 1;
    if (nearFixes < MIN_NEAR_FIXES) return { ...state, nearFixes };

    return initialOffRouteState;
  }

  if (distanceMeters <= OFF_ROUTE_METERS) {
    return state.farFixes === 0 ? state : initialOffRouteState;
  }

  const farFixes = state.farFixes + 1;
  const farSince = state.farSince ?? now;

  if (farFixes >= MIN_FAR_FIXES && now - farSince >= MIN_FAR_MS) {
    return { isOffRoute: true, farFixes: 0, farSince: null, nearFixes: 0 };
  }

  return { ...state, farFixes, farSince };
}
