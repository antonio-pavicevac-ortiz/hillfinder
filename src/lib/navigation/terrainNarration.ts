import { haversineMeters } from "@/lib/geo/distance";
import type { RouteSegmentDifficulty } from "@/types/saved-route";
import {
  getTerrainGuidancePhrase,
  getTerrainProgressPhrase,
  DEFAULT_TERRAIN_VOICE_STYLE,
  type TerrainKind,
  type TerrainVoiceStyle,
} from "./terrainPhrases";

export type { TerrainVoiceStyle };

// ─── Thresholds ────────────────────────────────────────────────────────────

const MIN_TERRAIN_DISTANCE_METERS = 100;
const MIN_TERRAIN_DURATION_SECONDS = 25;
export const TERRAIN_COOLDOWN_MS = 60_000;

// Announce this far before the cluster start so the rider has time to react
const LOOKAHEAD_METERS = 130;

// Progress updates: spacing between mid-section trigger points, and minimum
// cluster length that qualifies for progress updates.
const PROGRESS_SPACING_METERS = 400;
const MIN_CLUSTER_FOR_PROGRESS = 800;

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
  coords: [number, number][];
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
  let curCoords: [number, number][] = segments[0].coords.slice();
  let prevDiff: RouteSegmentDifficulty | null = null;

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.difficulty === curDiff) {
      curDist += segmentLength(seg);
      for (const c of seg.coords) curCoords.push(c);
    } else {
      clusters.push({ difficulty: curDiff, distanceMeters: curDist, startCoord: curStart, coords: curCoords, prevDifficulty: prevDiff });
      prevDiff = curDiff;
      curDiff = seg.difficulty;
      curStart = seg.coords[0];
      curDist = segmentLength(seg);
      curCoords = seg.coords.slice();
    }
  }
  clusters.push({ difficulty: curDiff, distanceMeters: curDist, startCoord: curStart, coords: curCoords, prevDifficulty: prevDiff });

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

function buildPhrase(cluster: TerrainCluster, style: TerrainVoiceStyle): string {
  return getTerrainGuidancePhrase(toTerrainKind(cluster), style);
}

// Walks a polyline and returns coords at every `spacing` meters starting at
// `startOffset`. Used to place progress trigger points inside long clusters.
function interpolateTriggerCoords(
  coords: [number, number][],
  startOffset: number,
  spacing: number
): [number, number][] {
  const triggers: [number, number][] = [];
  let traveled = 0;
  let nextTrigger = startOffset;

  for (let i = 1; i < coords.length; i++) {
    const segDist = haversineMeters(coords[i - 1], coords[i]);
    if (segDist === 0) continue;
    const segStart = traveled;
    traveled += segDist;

    while (nextTrigger <= traveled) {
      const t = (nextTrigger - segStart) / segDist;
      const lng = coords[i - 1][0] + t * (coords[i][0] - coords[i - 1][0]);
      const lat = coords[i - 1][1] + t * (coords[i][1] - coords[i - 1][1]);
      triggers.push([lng, lat]);
      nextTrigger += spacing;
    }
  }

  return triggers;
}

// ─── Public API ───────────────────────────────────────────────────────────

export function buildTerrainNarrations(
  segments: RawSegment[],
  style: TerrainVoiceStyle = DEFAULT_TERRAIN_VOICE_STYLE
): TerrainNarration[] {
  if (!segments.length) return [];

  const significant = clusterSegments(segments).filter(isSignificant);

  // One change-event narration per significant cluster, at the cluster start.
  const changeNarrations: TerrainNarration[] = significant.map((cluster, i) => ({
    index: i,
    phrase: buildPhrase(cluster, style),
    triggerCoord: cluster.startCoord,
    clusterDistanceMeters: cluster.distanceMeters,
  }));

  // Progress narrations for clusters long enough to benefit from mid-section
  // reassurance. Trigger points placed every PROGRESS_SPACING_METERS starting
  // at PROGRESS_SPACING_METERS in (after the initial change-event cue).
  const progressNarrations: TerrainNarration[] = [];
  for (const cluster of significant) {
    if (cluster.distanceMeters < MIN_CLUSTER_FOR_PROGRESS) continue;
    const triggerCoords = interpolateTriggerCoords(
      cluster.coords,
      PROGRESS_SPACING_METERS,
      PROGRESS_SPACING_METERS
    );
    for (const coord of triggerCoords) {
      progressNarrations.push({
        index: 0, // reassigned below
        phrase: getTerrainProgressPhrase(toTerrainKind(cluster), style),
        triggerCoord: coord,
        clusterDistanceMeters: cluster.distanceMeters,
      });
    }
  }

  // Merge and assign contiguous indices — spokenIndices in Dashboard tracks by index.
  return [...changeNarrations, ...progressNarrations].map((n, i) => ({ ...n, index: i }));
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
