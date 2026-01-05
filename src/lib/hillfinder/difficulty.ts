export type Difficulty = "easy" | "medium" | "hard";

export function scoreElevation(points: number[]): Difficulty {
  const totalGain = points.reduce((acc, v, i) => {
    if (i === 0) return acc;
    const diff = v - points[i - 1];
    return diff > 0 ? acc + diff : acc;
  }, 0);

  if (totalGain < 20) return "easy";
  if (totalGain < 80) return "medium";
  return "hard"; // 😎
}
