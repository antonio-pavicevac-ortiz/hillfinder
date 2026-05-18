import { generateRadialPoints } from "@/lib/map/generateRadialPoints";
import { isNearDuplicateOfAny } from "@/lib/map/routeGeometry";
import type { NavStep } from "@/lib/navigation/types";
import { SavedRouteSegment } from "@/types/saved-route";

type LatLng = { lat: number; lng: number };

type NearbyRouteResult = {
  coords: [number, number][];
  elevations: number[];
  distanceMeters?: number;
  durationSeconds?: number;
  segments?: SavedRouteSegment[];
  navSteps?: NavStep[];
  score: number;
  to: { lat: number; lng: number; name?: string };
};

export type FindDownhillResult = {
  route: NearbyRouteResult;
  limitedOptions: boolean;
};

// How many sorted candidates to check before accepting the best available.
// Does not increase the number of API calls — it's a loop over already-fetched results.
const MAX_GENERATION_ATTEMPTS = 5;

export async function findDownhillNearby(
  start: LatLng,
  getRoute: (start: LatLng, end: LatLng, signal: AbortSignal) => Promise<NearbyRouteResult>,
  signal: AbortSignal,
  options?: {
    recentRouteCoords?: [number, number][][];
    angleOffset?: number;
  }
): Promise<FindDownhillResult> {
  const recentRouteCoords = options?.recentRouteCoords ?? [];
  const angleOffset = options?.angleOffset ?? 0;

  const candidates = generateRadialPoints(start, 8, 1200, angleOffset);
  const allResults: { route: NearbyRouteResult; score: number }[] = [];

  for (const end of candidates) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    try {
      const route = await getRoute(start, end, signal);
      allResults.push({ route, score: route.score ?? 0 });
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      console.warn("[findDownhillNearby] candidate failed", err);
    }
  }

  if (!allResults.length) throw new Error("No downhill routes found");

  // Best quality first (lower score = more downhill)
  allResults.sort((a, b) => a.score - b.score);

  // Walk through the top candidates and return the first fresh one
  const limit = Math.min(MAX_GENERATION_ATTEMPTS, allResults.length);
  for (let attempt = 0; attempt < limit; attempt++) {
    const candidate = allResults[attempt];
    if (!isNearDuplicateOfAny(candidate.route.coords, recentRouteCoords)) {
      return { route: candidate.route, limitedOptions: false };
    }
  }

  // All attempts were near-duplicates — surface the highest-quality route and flag it
  return { route: allResults[0].route, limitedOptions: true };
}
