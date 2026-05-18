import type { RouteSweepController } from "@/lib/map/routeSweep";
import type { SavedRouteSegment } from "@/types/saved-route";
import mapboxgl from "mapbox-gl";

export const DETAIL_ROUTE_ZOOM_THRESHOLD = 13;

export function clearOverviewRoute(map: mapboxgl.Map) {
  const id = "route-overview";

  try {
    if (map.getLayer(id)) map.removeLayer(id);
  } catch {}
  try {
    if (map.getSource(id)) map.removeSource(id);
  } catch {}
}

export function drawOverviewRoute(map: mapboxgl.Map, coords: [number, number][]) {
  const id = "route-overview";

  clearOverviewRoute(map);

  map.addSource(id, {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    },
  });

  map.addLayer({
    id,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#2563eb",
      "line-width": 6,
      "line-opacity": 0.88,
    },
  } as any);
}

export function drawSegments(
  map: mapboxgl.Map,
  segments: SavedRouteSegment[],
  sweep: RouteSweepController,
  getMap: () => mapboxgl.Map | null
) {
  segments.forEach((segment, index) => {
    const color =
      segment.difficulty === "easy"
        ? "#22c55e"
        : segment.difficulty === "medium"
          ? "#eab308"
          : segment.difficulty === "uphill"
            ? "#7f1d1d"
            : "#ef4444";

    const id = `route-segment-${index}`;

    try {
      if (map.getLayer(id)) map.removeLayer(id);
    } catch {}
    try {
      if (map.getSource(id)) map.removeSource(id);
    } catch {}

    map.addSource(id, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: segment.coords },
        properties: {},
      },
    });

    map.addLayer({
      id,
      type: "line",
      source: id,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": color, "line-width": 5, "line-opacity": 0.9 },
    } as any);
  });

  if (segments.length > 0 && map.getZoom() >= DETAIL_ROUTE_ZOOM_THRESHOLD) {
    const coords = segments.flatMap((segment) => segment.coords);
    sweep.ensure(map, coords);
    setTimeout(() => {
      const m = getMap();
      if (!m) return;
      if (m.getZoom() < DETAIL_ROUTE_ZOOM_THRESHOLD) return;
      sweep.run(m);
    }, 120);
  }
}
