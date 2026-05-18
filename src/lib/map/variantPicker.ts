import { isNearDuplicateRoute, routeLengthMeters } from "@/lib/map/routeGeometry";
import type { Variant } from "@/lib/map/variantTypes";

export function pickMostDistinctVariant(
  base: Variant,
  candidates: Variant[],
  mode: "easy" | "hard"
) {
  const nonDuplicate = candidates.filter((candidate) => {
    if (candidate === base) return false;
    return !isNearDuplicateRoute(base.coords, candidate.coords);
  });

  if (!nonDuplicate.length) return null;

  return nonDuplicate.reduce((best, candidate) => {
    const bestScore = mode === "easy" ? best.easyScore : best.hardScore;
    const candidateScore = mode === "easy" ? candidate.easyScore : candidate.hardScore;
    const baseScore = mode === "easy" ? base.easyScore : base.hardScore;

    const bestGap = Math.abs(bestScore - baseScore);
    const candidateGap = Math.abs(candidateScore - baseScore);

    if (candidateGap > bestGap) return candidate;

    if (candidateGap === bestGap) {
      const bestLen = best.distanceMeters ?? routeLengthMeters(best.coords);
      const candidateLen = candidate.distanceMeters ?? routeLengthMeters(candidate.coords);
      if (candidateLen > bestLen) return candidate;
    }

    return best;
  });
}

export function hasDuplicateCandidate(candidates: Variant[], coords: [number, number][]) {
  return candidates.some((candidate) => isNearDuplicateRoute(candidate.coords, coords));
}

export function pickEasyAndHardVariants(candidates: Variant[], avoidFingerprints?: Set<string>) {
  const fingerprint = (c: Variant) => {
    const mid = c.coords[Math.floor(c.coords.length / 2)];
    return `${mid[0].toFixed(4)},${mid[1].toFixed(4)}`;
  };

  const fresh = avoidFingerprints
    ? candidates.filter((c) => !avoidFingerprints.has(fingerprint(c)))
    : candidates;

  const easyPool = fresh.length > 0 ? fresh : candidates;
  const hardPool = fresh.length > 0 ? fresh : candidates;

  const easySorted = [...easyPool].sort((a, b) => a.easyScore - b.easyScore);
  const hardSorted = [...hardPool].sort((a, b) => b.hardScore - a.hardScore);

  let easy = easySorted[0];
  let hard = hardSorted[0];

  const distinctFromEasy = pickMostDistinctVariant(easy, hardSorted, "hard");
  if (distinctFromEasy) {
    hard = distinctFromEasy;
  }

  if (isNearDuplicateRoute(easy.coords, hard.coords)) {
    const distinctFromHard = pickMostDistinctVariant(hard, easySorted, "easy");
    if (distinctFromHard) {
      easy = distinctFromHard;
    }
  }

  if (isNearDuplicateRoute(easy.coords, hard.coords) && candidates.length > 1) {
    const longest = [...candidates].sort((a, b) => {
      const aLen = a.distanceMeters ?? routeLengthMeters(a.coords);
      const bLen = b.distanceMeters ?? routeLengthMeters(b.coords);
      return bLen - aLen;
    })[0];

    if (longest && !isNearDuplicateRoute(easy.coords, longest.coords)) {
      hard = longest;
    }
  }

  const MIN_DISTANCE_GAP_METERS = 600;
  const MIN_HARD_SCORE_GAP = 20;

  const easyDistance = easy.distanceMeters ?? routeLengthMeters(easy.coords);
  let hardDistance = hard.distanceMeters ?? routeLengthMeters(hard.coords);

  if (Math.abs(hardDistance - easyDistance) < MIN_DISTANCE_GAP_METERS && hardSorted.length > 1) {
    const longer = [...hardSorted]
      .filter((candidate) => candidate !== easy)
      .sort((a, b) => {
        const aLen = a.distanceMeters ?? routeLengthMeters(a.coords);
        const bLen = b.distanceMeters ?? routeLengthMeters(b.coords);
        return bLen - aLen;
      })[0];

    if (longer && !isNearDuplicateRoute(easy.coords, longer.coords)) {
      hard = longer;
      hardDistance = hard.distanceMeters ?? routeLengthMeters(hard.coords);
    }
  }

  const hardScoreGap = Math.abs(hard.hardScore - easy.easyScore);

  if (
    (Math.abs(hardDistance - easyDistance) < MIN_DISTANCE_GAP_METERS ||
      hardScoreGap < MIN_HARD_SCORE_GAP) &&
    hardSorted.length > 1
  ) {
    const strongestHard = [...hardSorted]
      .filter((candidate) => candidate !== easy)
      .filter((candidate) => !isNearDuplicateRoute(easy.coords, candidate.coords))
      .sort((a, b) => {
        const aDistance = a.distanceMeters ?? routeLengthMeters(a.coords);
        const bDistance = b.distanceMeters ?? routeLengthMeters(b.coords);

        const aStrength = a.hardScore - easy.easyScore + (aDistance - easyDistance) * 0.015;
        const bStrength = b.hardScore - easy.easyScore + (bDistance - easyDistance) * 0.015;

        return bStrength - aStrength;
      })[0];

    if (strongestHard) {
      hard = strongestHard;
      hardDistance = hard.distanceMeters ?? routeLengthMeters(hard.coords);
    }
  }

  return { easy, hard, easyDistance, hardDistance };
}
