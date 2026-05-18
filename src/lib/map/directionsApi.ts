import { resampleCoords } from "@/lib/map/resampleCoords";
import { routeLengthMeters } from "@/lib/map/routeGeometry";
import type { DirectionsApiRoute } from "@/lib/map/variantTypes";
import mapboxgl from "mapbox-gl";

export async function fetchDirectionsRoute(params: {
  from: mapboxgl.LngLat;
  to: mapboxgl.LngLat;
  via?: mapboxgl.LngLat;
  signal: AbortSignal;
}) {
  const { from, to, via, signal } = params;

  const coords = via
    ? `${from.lng},${from.lat};${via.lng},${via.lat};${to.lng},${to.lat}`
    : `${from.lng},${from.lat};${to.lng},${to.lat}`;

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}` +
    `?alternatives=true&geometries=geojson&overview=full&steps=true&exclude=ferry&access_token=${mapboxgl.accessToken}`;

  const res = await fetch(url, { signal });
  return res.json();
}

export function getRoutesArray(data: unknown): DirectionsApiRoute[] {
  if (
    data &&
    typeof data === "object" &&
    "routes" in data &&
    Array.isArray((data as { routes?: unknown }).routes)
  ) {
    return (data as { routes: DirectionsApiRoute[] }).routes;
  }

  return [];
}

export function getRouteCoords(route: DirectionsApiRoute): [number, number][] | null {
  const raw = route.geometry?.coordinates;
  if (!raw?.length) return null;
  return resampleCoords(raw);
}

export function getRouteDistanceMeters(route: DirectionsApiRoute, coords: [number, number][]) {
  const geomMeters = routeLengthMeters(coords);
  return typeof route.distance === "number" ? route.distance : geomMeters;
}

export function getRouteDurationSeconds(route: DirectionsApiRoute) {
  return typeof route.duration === "number" ? route.duration : undefined;
}

export function findBaselineMeters(routes: DirectionsApiRoute[]) {
  let baselineMeters = Infinity;

  for (const route of routes) {
    if (typeof route.distance === "number" && Number.isFinite(route.distance)) {
      baselineMeters = Math.min(baselineMeters, route.distance);
    }
  }

  return baselineMeters;
}
