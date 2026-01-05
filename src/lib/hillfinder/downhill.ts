import type { Difficulty } from "./difficulty";

export interface DownhillStats {
  totalAscent: number; // meters climbed
  totalDescent: number; // meters descended
  downhillRatio: number; // 0–1, portion of route that is downhill
  maxDrop: number; // biggest single drop between two points
  isDownhill: boolean; // does this qualify as a downhill route?
  difficulty: Difficulty; // "easy" | "medium" | "hard"
}

/**
 * Analyze an elevation profile and classify the route.
 *
 * @param elevations Array of elevation samples in meters, in route order.
 */
export function analyzeDownhillRoute(elevations: number[]): DownhillStats {
  if (elevations.length < 2) {
    return {
      totalAscent: 0,
      totalDescent: 0,
      downhillRatio: 0,
      maxDrop: 0,
      isDownhill: false,
      difficulty: "easy",
    };
  }

  let totalAscent = 0;
  let totalDescent = 0;
  let downhillSegments = 0;
  let totalSegments = 0;
  let maxDrop = 0;

  for (let i = 0; i < elevations.length - 1; i++) {
    const curr = elevations[i];
    const next = elevations[i + 1];

    const delta = next - curr; // + = up, - = down
    totalSegments++;

    if (delta > 0) {
      totalAscent += delta;
    } else if (delta < 0) {
      const drop = -delta;
      totalDescent += drop;
      downhillSegments++;
      if (drop > maxDrop) maxDrop = drop;
    }
  }

  const downhillRatio = totalSegments === 0 ? 0 : downhillSegments / totalSegments;

  // --- Decide if this is really a “downhill” route ---
  const MIN_TOTAL_DROP = 30; // meters
  const MIN_DOWNHILL_RATIO = 0.6; // at least 60% of segments going down

  const isDownhill = totalDescent >= MIN_TOTAL_DROP && downhillRatio >= MIN_DOWNHILL_RATIO;

  // --- Classify difficulty based on total descent + steepness-ish proxy ---
  let difficulty: Difficulty = "easy";

  if (!isDownhill) {
    // If it's not truly downhill, call it easy but mark isDownhill=false
    difficulty = "easy";
  } else if (totalDescent < 150 && maxDrop < 20) {
    difficulty = "easy";
  } else if (totalDescent < 350 && maxDrop < 50) {
    difficulty = "medium";
  } else {
    difficulty = "hard";
  }

  return {
    totalAscent,
    totalDescent,
    downhillRatio,
    maxDrop,
    isDownhill,
    difficulty,
  };
}
