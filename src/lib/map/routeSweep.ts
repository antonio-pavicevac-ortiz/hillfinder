import type { ExpressionSpecification, Map as MapboxMap } from "mapbox-gl";
export type RouteSweepController = {
  ensure(map: MapboxMap, coords: [number, number][]): void;
  run(map: MapboxMap): void;
  clear(map: MapboxMap): void;
  destroy(map?: MapboxMap): void; // cancels RAF, optionally clears
};

function normalizeStops(stops: Array<[number, string]>) {
  const clamped = stops
    .map(([p, c]) => [Math.min(1, Math.max(0, p)), c] as [number, string])
    .filter(([p]) => Number.isFinite(p));

  clamped.sort((a, b) => a[0] - b[0]);

  const out: Array<[number, string]> = [];
  const EPS = 1e-6;

  for (const [p, c] of clamped) {
    if (!out.length) {
      out.push([p, c]);
      continue;
    }
    const prev = out[out.length - 1][0];
    if (p <= prev + EPS) continue; // must be STRICTLY increasing
    out.push([p, c]);
  }

  if (!out.length)
    return [
      [0, "#000"],
      [1, "#000"],
    ] as Array<[number, string]>;

  if (out[0][0] !== 0) out.unshift([0, out[0][1]]);
  if (out[out.length - 1][0] !== 1) out.push([1, out[out.length - 1][1]]);

  return out;
}

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

      try {
        const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

        // Sweep colors
        const baseColor = "rgba(255,255,255,0)";
        const glowColor = "rgba(255,255,255,1)";

        // Use the real sweep head/tail computed above in your frame:
        // const head = t;
        // const tail = Math.max(0, head - band);
        const headP = clamp01(head);
        const tailP = clamp01(tail);

        // Feather should never be 0 (otherwise stops collapse)
        const soft = Math.max(1e-4, softEdge);

        const t0 = Math.min(tailP, headP);
        const t1 = Math.max(tailP, headP);

        const a0 = clamp01(t0 - soft);
        const a1 = clamp01(t0);
        const a2 = clamp01(t1);
        const a3 = clamp01(t1 + soft);

        const stopPairs: Array<[number, string]> = [
          [0, baseColor],
          [a0, baseColor],
          [a1, glowColor],
          [a2, glowColor],
          [a3, baseColor],
          [1, baseColor],
        ];

        // ✅ Use the shared normalizer
        const cleaned = normalizeStops(stopPairs);

        const expr: ExpressionSpecification = ["interpolate", ["linear"], ["line-progress"]];
        for (const [p, c] of cleaned) {
          (expr as any).push(p, c);
        }

        map.setPaintProperty(layerId, "line-gradient", expr);
      } catch {
        cancel();
        return;
      }

      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        // End of sweep: hide overlay again
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
