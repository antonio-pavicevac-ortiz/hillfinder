import { computeRouteStats, scoreEasy } from "@/lib/map/routeDifficulty";

export async function buildVariant(
  map: mapboxgl.Map,
  coords: [number, number][],
  getElevation: any
) {
  const elevations = await Promise.all(
    coords.map(([lng, lat]) => (getElevation ? getElevation(map, lng, lat) : Promise.resolve(0)))
  );

  const stats = computeRouteStats(elevations);

  const baseScore = scoreEasy(stats);

  return {
    coords,
    elevations,
    score: baseScore,
  };
}
