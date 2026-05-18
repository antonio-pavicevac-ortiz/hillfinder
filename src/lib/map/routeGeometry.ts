import { haversineMeters } from "@/lib/geo/distance";
import mapboxgl from "mapbox-gl";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function routeLengthMeters(coords: [number, number][]) {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) {
    sum += haversineMeters(coords[i - 1], coords[i]);
  }
  return sum;
}

export function straightLineMeters(from: mapboxgl.LngLat, to: mapboxgl.LngLat) {
  return from.distanceTo(to);
}

export function isSillyRoute(params: {
  from: mapboxgl.LngLat;
  to: mapboxgl.LngLat;
  routeMeters: number;
  baselineMeters: number;
  maxDetourRatio: number;
  maxLoopiness: number;
}) {
  const { from, to, routeMeters, baselineMeters, maxDetourRatio, maxLoopiness } = params;

  if (!Number.isFinite(routeMeters) || routeMeters <= 0) return true;
  if (!Number.isFinite(baselineMeters) || baselineMeters <= 0) return false;

  if (routeMeters > baselineMeters * maxDetourRatio) return true;

  const straight = straightLineMeters(from, to);
  if (straight > 0) {
    const loopiness = routeMeters / straight;
    if (loopiness > maxLoopiness) return true;
  }

  return false;
}

export function isNearDuplicateRoute(a: [number, number][], b: [number, number][]) {
  if (a.length < 2 || b.length < 2) return true;

  const startDist = haversineMeters(a[0], b[0]);
  const endDist = haversineMeters(a[a.length - 1], b[b.length - 1]);
  if (startDist > 40 || endDist > 40) return false;

  // Routes that differ significantly in length are genuinely different paths
  const aLen = routeLengthMeters(a);
  const bLen = routeLengthMeters(b);
  const maxLen = Math.max(aLen, bLen);
  if (maxLen > 0 && Math.abs(aLen - bLen) / maxLen > 0.25) return false;

  const samples = 6;
  let totalDivergence = 0;
  for (let i = 1; i <= samples; i++) {
    const aIdx = Math.floor((i / (samples + 1)) * (a.length - 1));
    const bIdx = Math.floor((i / (samples + 1)) * (b.length - 1));
    totalDivergence += haversineMeters(a[aIdx], b[bIdx]);
  }
  const avgDivergence = totalDivergence / samples;

  return avgDivergence < 40;
}

export function isNearDuplicateOfAny(
  candidate: [number, number][],
  history: [number, number][][]
) {
  return history.some((past) => isNearDuplicateRoute(candidate, past));
}

export function metersToDegreesLat(m: number) {
  return m / 111_320;
}

export function metersToDegreesLng(m: number, atLat: number) {
  const cos = Math.cos((atLat * Math.PI) / 180);
  return m / (111_320 * Math.max(0.2, cos));
}

export function midpoint(a: mapboxgl.LngLat, b: mapboxgl.LngLat) {
  return new mapboxgl.LngLat((a.lng + b.lng) / 2, (a.lat + b.lat) / 2);
}

export function detourWaypoints(mid: mapboxgl.LngLat, meters: number, angleOffsetRad = 0) {
  const dLat = metersToDegreesLat(meters);
  const dLng = metersToDegreesLng(meters, mid.lat);
  const count = 8;

  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count + angleOffsetRad;
    return new mapboxgl.LngLat(
      mid.lng + dLng * Math.cos(angle),
      mid.lat + dLat * Math.sin(angle)
    );
  });
}

export function detourWaypointRings(from: mapboxgl.LngLat, to: mapboxgl.LngLat, randomize = false) {
  const mid = midpoint(from, to);
  const trip = from.distanceTo(to) ?? 1500;

  const radiusScale = randomize ? 0.7 + Math.random() * 0.6 : 1;
  const radii = [
    clamp(trip * 0.08 * radiusScale, 120, 300),
    clamp(trip * 0.14 * radiusScale, 260, 520),
  ];

  const angleOffset = randomize ? Math.random() * (2 * Math.PI) : 0;

  const seen = new Set<string>();
  const waypoints: mapboxgl.LngLat[] = [];

  for (const radius of radii) {
    for (const wp of detourWaypoints(mid, radius, angleOffset)) {
      const key = `${wp.lng.toFixed(5)},${wp.lat.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      waypoints.push(wp);
    }
  }

  return waypoints;
}
