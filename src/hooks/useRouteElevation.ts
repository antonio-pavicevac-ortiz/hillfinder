import { Difficulty, scoreElevation } from "@/lib/hillfinder/difficulty";
import { getDrivingRoutes } from "@/lib/mapbox/directions";
import { getElevation } from "@/lib/mapbox/elevation";
import { useState } from "react";

type DirectionsRoute = {
  geometry: { coordinates: [number, number][] };
  distance?: number;
  duration?: number;
};

export interface UseRouteElevationResult {
  loading: boolean;
  computeRoute: (
    origin: [number, number],
    destination: [number, number]
  ) => Promise<
    {
      route: DirectionsRoute;
      difficulty: Difficulty;
      totalGain: number;
    }[]
  >;
}

export default function useRouteElevation(): UseRouteElevationResult {
  const [loading, setLoading] = useState(false);

  async function computeRoute(origin: [number, number], destination: [number, number]) {
    setLoading(true);

    // ✅ fetch full driving routes
    const routes: DirectionsRoute[] = await getDrivingRoutes(origin, destination);

    const scored: {
      route: DirectionsRoute;
      difficulty: Difficulty;
      totalGain: number;
    }[] = [];

    for (const route of routes) {
      // geometry coords
      const coords: [number, number][] = route.geometry.coordinates;

      // take every 10th point → sample
      const sample: [number, number][] = coords.filter(
        (_: [number, number], i: number) => i % 10 === 0
      );

      // elevations array
      const elevations: number[] = [];

      for (const [lng, lat] of sample) {
        const e = Number(await getElevation(lat, lng));
        elevations.push(e);
      }

      const difficulty = scoreElevation(elevations);
      const totalGain = elevations[elevations.length - 1] - elevations[0];

      scored.push({
        route,
        difficulty,
        totalGain,
      });
    }

    setLoading(false);
    return scored;
  }

  return { loading, computeRoute };
}
