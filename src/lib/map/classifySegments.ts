export type Difficulty = "easy" | "medium" | "hard" | "uphill";

export function classifySegments(elevations: number[], coords: [number, number][]) {
  const segments: { coords: [number, number][]; difficulty: Difficulty }[] = [];
  if (elevations.length < 2 || coords.length < 2) return segments;

  const SLOPE_EPSILON = 0.001;
  const EASY_DOWNHILL = -0.003;
  const STEEP_DOWNHILL = -0.01;

  for (let i = 1; i < elevations.length; i++) {
    const elevationDiff = elevations[i] - elevations[i - 1];

    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];

    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance === 0) continue;

    const slope = elevationDiff / distance;

    let difficulty: Difficulty;
    if (Math.abs(slope) < SLOPE_EPSILON) difficulty = "easy";
    else if (slope > SLOPE_EPSILON) difficulty = "uphill";
    else if (slope < STEEP_DOWNHILL) difficulty = "hard";
    else if (slope < EASY_DOWNHILL) difficulty = "medium";
    else difficulty = "easy";

    segments.push({ coords: [coords[i - 1], coords[i]], difficulty });
  }

  return segments;
}
