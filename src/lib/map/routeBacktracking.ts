import { haversineMeters } from "@/lib/geo/distance";

type Point = [number, number];

export function hasRedundantDetour(coords: Point[]): boolean {
  if (coords.length < 3) return false;
  // Deliberate round trips are allowed. For distinct endpoints, a substantial
  // excursion returning to a junction adds distance without making progress.
  if (haversineMeters(coords[0], coords[coords.length - 1]) <= 12) return false;
  if (hasRetracedExcursion(coords, true)) return true;
  const distances = [0];
  for (let i = 1; i < coords.length; i++) {
    distances.push(distances[i - 1] + haversineMeters(coords[i - 1], coords[i]));
  }
  for (let start = 0; start < coords.length - 2; start++) {
    for (let end = start + 2; end < coords.length; end++) {
      const excursion = distances[end] - distances[start];
      if (excursion < 100) continue;
      const returnGap = haversineMeters(coords[start], coords[end]);
      if (returnGap <= 12 && excursion >= returnGap * 6) return true;
    }
  }
  return false;
}

// Reject excursions that return to a junction along the same path. A loop
// using different streets remains valid, as does a short routing adjustment.
export function hasRetracedExcursion(coords: Point[], includeNearbyPaths = false): boolean {
  const distances = [0];
  for (let i = 1; i < coords.length; i++) {
    distances.push(distances[i - 1] + haversineMeters(coords[i - 1], coords[i]));
  }
  const pointAt = (start: number, end: number, target: number): Point => {
    for (let k = start + 1; k <= end; k++) {
      if (distances[k] < target) continue;
      const length = distances[k] - distances[k - 1];
      const fraction = length ? (target - distances[k - 1]) / length : 0;
      return [
        coords[k - 1][0] + fraction * (coords[k][0] - coords[k - 1][0]),
        coords[k - 1][1] + fraction * (coords[k][1] - coords[k - 1][1]),
      ];
    }
    return coords[end];
  };
  for (let start = 0; start < coords.length - 2; start++) {
    for (let end = start + 2; end < coords.length; end++) {
      // A journey deliberately ending at its origin can be an out-and-back.
      if (start === 0 && end === coords.length - 1) continue;
      const length = distances[end] - distances[start];
      const returnGap = haversineMeters(coords[start], coords[end]);
      if (length < 60 || returnGap > (includeNearbyPaths ? 20 : 2)) continue;
      if (includeNearbyPaths && length < returnGap * 4) continue;
      let retraced = true;
      for (let sample = 1; sample <= 8; sample++) {
        const offset = (length / 2) * (sample / 9);
        if (haversineMeters(
          pointAt(start, end, distances[start] + offset),
          pointAt(start, end, distances[end] - offset),
        ) > (includeNearbyPaths ? 20 : 6)) {
          retraced = false;
          break;
        }
      }
      if (retraced) return true;
    }
  }
  return false;
}
