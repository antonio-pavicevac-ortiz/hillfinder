import { haversineMeters } from "@/lib/geo/distance";
import type { RouteSegmentDifficulty } from "@/types/saved-route";
import { getTerrainGuidancePhrase, type TerrainKind } from "./terrainPhrases";

// ─── Thresholds ────────────────────────────────────────────────────────────

const MIN_TERRAIN_DISTANCE_METERS = 100;
const MIN_TERRAIN_DURATION_SECONDS = 25;
export const TERRAIN_COOLDOWN_MS = 60_000;

// Announce this far before the cluster start so the rider has time to react
const LOOKAHEAD_METERS = 130;

// Estimated travel speeds for duration filtering (m/s)
const SPEED_MPS: Record<RouteSegmentDifficulty, number> = {
  easy: 3.5,   // flat: ~13 km/h
  medium: 5.0, // gentle downhill: ~18 km/h
  hard: 7.0,   // steep descent: ~25 km/h
  uphill: 2.2, // climb: ~8 km/h
};

// ─── Types ─────────────────────────────────────────────────────────────────

type RawSegment = {
  coords: [number, number][];
  difficulty: RouteSegmentDifficulty;
};

type TerrainCluster = {
  difficulty: RouteSegmentDifficulty;
  distanceMeters: number;
  startCoord: [number, number];
  prevDifficulty: RouteSegmentDifficulty | null;
};

export type TerrainNarration = {
  index: number;
  phrase: string;
  triggerCoord: [number, number];
  clusterDistanceMeters: number;
};

// ─── Clustering ────────────────────────────────────────────────────────────

function segmentLength(seg: RawSegment): number {
  let d = 0;
  for (let i = 1; i < seg.coords.length; i++) {
    d += haversineMeters(seg.coords[i - 1], seg.coords[i]);
  }
  return d;
}

function clusterSegments(segments: RawSegment[]): TerrainCluster[] {
  if (!segments.length) return [];

  const clusters: TerrainCluster[] = [];
  let curDiff = segments[0].difficulty;
  let curStart = segments[0].coords[0];
  let curDist = segmentLength(segments[0]);
  let prevDiff: RouteSegmentDifficulty | null = null;

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.difficulty === curDiff) {
      curDist += segmentLength(seg);
    } else {
      clusters.push({ difficulty: curDiff, distanceMeters: curDist, startCoord: curStart, prevDifficulty: prevDiff });
      prevDiff = curDiff;
      curDiff = seg.difficulty;
      curStart = seg.coords[0];
      curDist = segmentLength(seg);
    }
  }
  clusters.push({ difficulty: curDiff, distanceMeters: curDist, startCoord: curStart, prevDifficulty: prevDiff });

  return clusters;
}

// ─── Significance filter ───────────────────────────────────────────────────

function isSignificant(cluster: TerrainCluster): boolean {
  const estimatedDuration = cluster.distanceMeters / SPEED_MPS[cluster.difficulty];

  if (cluster.difficulty === "easy") {
    // Only announce flat relief after a hard or uphill stretch, and only if it's long
    return (
      (cluster.prevDifficulty === "hard" || cluster.prevDifficulty === "uphill") &&
      cluster.distanceMeters >= MIN_TERRAIN_DISTANCE_METERS * 2
    );
  }

  return (
    cluster.distanceMeters >= MIN_TERRAIN_DISTANCE_METERS &&
    estimatedDuration >= MIN_TERRAIN_DURATION_SECONDS
  );
}

// ─── Phrase builder ────────────────────────────────────────────────────────

function toTerrainKind(cluster: TerrainCluster): TerrainKind {
  const { difficulty, distanceMeters, prevDifficulty } = cluster;

  switch (difficulty) {
    case "easy":
      return prevDifficulty === "hard" || prevDifficulty === "uphill" ? "easing" : "flat";
    case "uphill":
      if (distanceMeters < 300) return "short_uphill";
      if (distanceMeters < 800) return "sustained_uphill";
      return "steep_uphill";
    case "medium":
      return distanceMeters < 400 ? "gentle_downhill" : "sustained_downhill";
    case "hard":
      return "steep_downhill";
  }
}

function buildPhrase(cluster: TerrainCluster): string {
  return getTerrainGuidancePhrase(toTerrainKind(cluster));
}

// ─── Public API ───────────────────────────────────────────────────────────

export function buildTerrainNarrations(segments: RawSegment[]): TerrainNarration[] {
  if (!segments.length) return [];

  return clusterSegments(segments)
    .filter(isSignificant)
    .map((cluster, index) => ({
      index,
      phrase: buildPhrase(cluster),
      triggerCoord: cluster.startCoord,
      clusterDistanceMeters: cluster.distanceMeters,
    }));
}

/**
 * Returns the closest unspoken narration within lookahead range, respecting
 * the cooldown. Returns null if nothing should be spoken right now.
 */
export function findUpcomingTerrainNarration(
  userCoord: [number, number],
  narrations: TerrainNarration[],
  lastSpokenAt: number,
  spokenIndices: Set<number>
): { narration: TerrainNarration; index: number } | null {
  if (Date.now() - lastSpokenAt < TERRAIN_COOLDOWN_MS) return null;

  let closest: { narration: TerrainNarration; index: number; dist: number } | null = null;

  for (let i = 0; i < narrations.length; i++) {
    if (spokenIndices.has(i)) continue;
    const dist = haversineMeters(userCoord, narrations[i].triggerCoord);
    if (dist <= LOOKAHEAD_METERS && (!closest || dist < closest.dist)) {
      closest = { narration: narrations[i], index: i, dist };
    }
  }

  return closest ? { narration: closest.narration, index: closest.index } : null;
}
