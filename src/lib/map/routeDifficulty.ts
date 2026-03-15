export type RouteStats = {
  totalAscentM: number;
  totalDescentM: number;
  uphillRatio: number; // 0..1
  longestDownhillRun: number; // number of consecutive downhill segments
};

export function computeRouteStats(elevations: number[]): RouteStats {
  let ascent = 0;
  let descent = 0;
  let uphillCount = 0;
  let downhillStreak = 0;
  let longestDownhillRun = 0;

  for (let i = 1; i < elevations.length; i++) {
    const d = elevations[i] - elevations[i - 1];

    if (d > 0) {
      ascent += d;
      uphillCount++;
      downhillStreak = 0;
    } else {
      descent += Math.abs(d);

      downhillStreak++;
      longestDownhillRun = Math.max(longestDownhillRun, downhillStreak);
    }
  }

  const segments = Math.max(1, elevations.length - 1);

  return {
    totalAscentM: ascent,
    totalDescentM: descent,
    uphillRatio: uphillCount / segments,
    longestDownhillRun,
  };
}

// ✅ Easy = least climbing / least “uphill-ness”
export function scoreEasy(stats: RouteStats) {
  return stats.totalAscentM * 1.0 + stats.uphillRatio * 150 - stats.longestDownhillRun * 8;
}

// ✅ Hard = more climbing / more “uphill-ness”
export function scoreHard(stats: RouteStats) {
  return stats.totalAscentM * 1.2 + stats.uphillRatio * 200;
}
