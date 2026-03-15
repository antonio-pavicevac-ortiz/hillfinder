import { generateRadialPoints } from "@/lib/map/generateRadialPoints";

type LatLng = {
  lat: number;
  lng: number;
};

type NearbyRouteResult = {
  coords: [number, number][];
  elevations?: number[];
  distanceMeters?: number;
  durationSeconds?: number;
  segments?: any[];
  score?: number;
  to: {
    lat: number;
    lng: number;
    name?: string;
  };
};

export async function findDownhillNearby(
  start: LatLng,
  getRoute: (start: LatLng, end: LatLng, signal: AbortSignal) => Promise<NearbyRouteResult>,
  signal: AbortSignal
) {
  const candidates = generateRadialPoints(start, 8, 1200);

  const results: { route: NearbyRouteResult; score: number }[] = [];

  for (const end of candidates) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const route = await getRoute(start, end, signal);
      results.push({
        route,
        score: route.score ?? 0,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      console.warn("[findDownhillNearby] candidate failed", err);
    }
  }

  if (!results.length) {
    throw new Error("No downhill routes found");
  }

  results.sort((a, b) => a.score - b.score);
  return results[0];
}
