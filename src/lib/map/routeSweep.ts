import type { Map as MapboxMap } from "mapbox-gl";

export type RouteSweepController = {
  ensure(map: MapboxMap, coords: [number, number][]): void;
  run(map: MapboxMap): void;
  clear(map: MapboxMap): void;
  destroy(map?: MapboxMap): void; // cancels RAF, optionally clears
};

export function createRouteSweepController(opts?: {
  sourceId?: string;
  layerId?: string;
  durationMs?: number;
  band?: number;
  softEdge?: number;
}): RouteSweepController {
  const sourceId = opts?.sourceId ?? "route-sweep";
  const layerId = opts?.layerId ?? "route-sweep-layer";
  const durationMs = opts?.durationMs ?? 420;
  const band = opts?.band ?? 0.08;
  const softEdge = opts?.softEdge ?? 0.02;

  let rafId: number | null = null;

  function cancel() {
    if (rafId != null) {
      try {
        cancelAnimationFrame(rafId);
      } catch {}
      rafId = null;
    }
  }

  function clear(map: MapboxMap) {
    cancel();

    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    } catch {}

    try {
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch {}
  }

  function ensure(map: MapboxMap, coords: [number, number][]) {
    // Recreate the sweep overlay every time for deterministic behavior.
    clear(map);

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: {},
      },
      // Required for ["line-progress"] in line-gradient
      lineMetrics: true,
    } as any);

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        // Slightly thicker than base route segments so it reads as a sweep
        "line-width": 7,
        "line-opacity": 0,
        // Start fully transparent; we'll animate the gradient band
        "line-gradient": [
          "interpolate",
          ["linear"],
          ["line-progress"],
          0,
          "rgba(255,255,255,0)",
          1,
          "rgba(255,255,255,0)",
        ],
      },
    } as any);
  }

  function run(map: MapboxMap) {
    cancel();

    if (!map.getLayer(layerId)) return;

    // Make the overlay visible for the sweep
    try {
      map.setPaintProperty(layerId, "line-opacity", 0.95);
    } catch {
      return;
    }

    const start = performance.now();

    const frame = (now: number) => {
      // If the layer vanished (route cleared), stop.
      if (!map.getLayer(layerId)) {
        cancel();
        return;
      }

      const t = Math.min(1, (now - start) / durationMs);
      const head = t;
      const tail = Math.max(0, head - band);
      const fall = Math.min(1, head + softEdge);

      try {
        map.setPaintProperty(layerId, "line-gradient", [
          "interpolate",
          ["linear"],
          ["line-progress"],
          0,
          "rgba(255,255,255,0)",
          tail,
          "rgba(255,255,255,0)",
          head,
          "rgba(255,255,255,0.95)",
          fall,
          "rgba(255,255,255,0)",
          1,
          "rgba(255,255,255,0)",
        ]);
      } catch {
        cancel();
        return;
      }

      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        // Hide the sweep after it completes.
        try {
          map.setPaintProperty(layerId, "line-opacity", 0);
        } catch {}
        cancel();
      }
    };

    rafId = requestAnimationFrame(frame);
  }

  function destroy(map?: MapboxMap) {
    cancel();
    if (map) clear(map);
  }

  return {
    ensure,
    run,
    clear,
    destroy,
  };
}
