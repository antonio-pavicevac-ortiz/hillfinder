import type { SaveRoutePayload, SavedRouteRecord } from "@/types/saved-route";

const SESSION_KEY = "hf_dashboard_session";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // discard sessions older than 24 h

// ─── Shape ────────────────────────────────────────────────────────────────────

export type DashboardSession = {
  savedAt: number;
  fromLocation: { lat: number; lng: number; name?: string } | null;
  destination: { lat: number; lng: number; name?: string } | null;
  selectedVariant: "easy" | "hard" | null;
  activeRouteSource: "generated" | "saved" | null;
  routePayload: SaveRoutePayload | null;
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function saveDashboardSession(
  data: Omit<DashboardSession, "savedAt">
): void {
  try {
    const session: DashboardSession = { ...data, savedAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable or quota exceeded — fail silently
  }
}

export function loadDashboardSession(): DashboardSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as DashboardSession;

    if (!session.savedAt || Date.now() - session.savedAt > SESSION_MAX_AGE_MS) {
      clearDashboardSession();
      return null;
    }

    if (!session.routePayload?.coords?.length) return null;

    return session;
  } catch {
    return null;
  }
}

export function clearDashboardSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

// ─── Conversion ───────────────────────────────────────────────────────────────
// Converts a stored SaveRoutePayload into a SavedRouteRecord so DashboardMap's
// existing loadSavedRoute path can draw the route without any API calls.

export function sessionPayloadToRecord(payload: SaveRoutePayload): SavedRouteRecord {
  return {
    _id: "session-restore",
    from: payload.from,
    to: payload.to,
    difficulty: payload.difficulty,
    coords: payload.coords,
    elevations: payload.elevations,
    segments: payload.segments,
    distanceMeters: payload.distanceMeters,
    durationSeconds: payload.durationSeconds,
    navSteps: payload.navSteps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
