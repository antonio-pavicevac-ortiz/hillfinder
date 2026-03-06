import type { Feature, FeatureCollection, LineString } from "geojson";
import { classifySegments } from "./classifySegments";
import { clearRouteLayers } from "./clearRouteLayers";

export function drawVariantRoute(map: mapboxgl.Map, variant: any) {
  clearRouteLayers(map);

  const segments = classifySegments(variant.elevations, variant.coords);

  const features: Feature<LineString>[] = segments.map((segment) => ({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: segment.coords,
    },
    properties: {
      difficulty: segment.difficulty,
    },
  }));

  const geojson: FeatureCollection<LineString> = {
    type: "FeatureCollection",
    features,
  };

  const sourceId = "route-source";

  map.addSource(sourceId, {
    type: "geojson",
    data: geojson,
  });

  map.addLayer({
    id: "route-layer",
    type: "line",
    source: sourceId,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-width": 5,
      "line-opacity": 0.9,

      "line-color": [
        "match",
        ["get", "difficulty"],
        "easy",
        "#22c55e",
        "medium",
        "#eab308",
        "uphill",
        "#7f1d1d",
        "hard",
        "#ef4444",
        "#999",
      ],
    },
  });
}
