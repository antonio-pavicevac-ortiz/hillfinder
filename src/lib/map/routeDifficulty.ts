export type RouteStats = {
  totalAscentM: number;
  totalDescentM: number;
  uphillRatio: number; // 0..1
};

export function computeRouteStats(elevations: number[]): RouteStats {
  let ascent = 0;
  let descent = 0;
  let uphillCount = 0;

  for (let i = 1; i < elevations.length; i++) {
    const d = elevations[i] - elevations[i - 1];
    if (d > 0) {
      ascent += d;
      uphillCount++;
    } else {
      descent += Math.abs(d);
    }
  }

  const segments = Math.max(1, elevations.length - 1);

  return {
    totalAscentM: ascent,
    totalDescentM: descent,
    uphillRatio: uphillCount / segments,
  };
}

// ✅ Easy = least climbing
export function scoreEasy(stats: RouteStats) {
  return stats.totalAscentM * 1.0 + stats.uphillRatio * 150;
}
