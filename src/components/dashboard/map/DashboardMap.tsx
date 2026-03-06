"use client";

import { classifySegments } from "@/lib/map/classifySegments";
import { clearRouteLayers } from "@/lib/map/clearRouteLayers";
import { resampleCoords } from "@/lib/map/resampleCoords";
import { computeRouteStats, scoreEasy } from "@/lib/map/routeDifficulty";
import { createRouteSweepController } from "@/lib/map/routeSweep";
import { createTerrainElevationGetter, type TileKey } from "@/lib/map/terrainReady";

import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
} else if (!mapboxgl.accessToken) {
  console.warn("[DashboardMap] Missing NEXT_PUBLIC_MAPBOX_TOKEN — Mapbox may not initialize");
}

type Destination = { lat: number; lng: number; name?: string };

type VariantKey = "easy" | "hard";

type Variant = {
  coords: [number, number][];
  elevations: number[];
  score: number;
};

export default function DashboardMap({
  destination,
  clearRouteNonce,
  onRouteDrawn,
  onDestinationPicked,
  routeRequestNonce,
  routeActive,
  onFromPicked,
  fromLocation,
  recenterNonce,
  routeAlternativesNonce,
  selectedVariant,
  onVariantsReady,
  onVariantSelected,
  clearDestinationNonce,
  onRouteBusyChange,
  canAcceptDestination,
}: {
  destination?: Destination | null;
  clearRouteNonce?: number;
  onRouteDrawn?: () => void;
  onDestinationPicked?: (loc: { name: string; lat: number; lng: number }) => void;
  routeRequestNonce?: number;
  routeActive?: boolean;
  onFromPicked?: (loc: { name: string; lat: number; lng: number }) => void;
  fromLocation?: { lat: number; lng: number } | null;
  recenterNonce?: number;
  routeAlternativesNonce?: number;
  selectedVariant?: VariantKey | null;
  onVariantsReady?: () => void;
  onVariantSelected?: (v: VariantKey) => void;
  clearDestinationNonce?: number;
  onRouteBusyChange?: (busy: boolean) => void;
  canAcceptDestination?: (loc: { lat: number; lng: number }) => boolean;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const fromMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Cache of decoded 256x256 terrain tiles: key -> Promise<RGBA data>
  const tileCacheRef = useRef<Map<TileKey, Promise<Uint8ClampedArray>>>(new Map());

  const getElevationRef = useRef<
    ((map: mapboxgl.Map, lng: number, lat: number) => Promise<number>) | null
  >(null);

  // Route fetch cancellation / race protection
  const routeReqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Remember last destination that successfully produced a route (optional snap-back behavior)
  const lastGoodDestRef = useRef<mapboxgl.LngLat | null>(null);

  const variantsRef = useRef<{ easy: Variant; hard: Variant } | null>(null);

  // Keep latest selectedVariant for async functions (avoid stale closures)
  const selectedVariantRef = useRef<VariantKey | null>(null);
  useEffect(() => {
    selectedVariantRef.current = selectedVariant ?? null;
  }, [selectedVariant]);

  const sweepRef = useRef(createRouteSweepController());

  // --- Gesture + controls UX knobs ---
  // Offset the Mapbox control stack downward so it sits under your custom top-left overlay.
  // If Mapbox controls feel “unresponsive”, they may be sitting under an overlay.
  // Increasing this pushes the top-left Mapbox control stack further down.
  // Tweak until it clears your Undo / custom icons cleanly.
  const TOP_LEFT_CONTROLS_OFFSET_PX = 400;

  // "busy" owner id so we don't clear busy for a newer request
  const busyReqIdRef = useRef(0);

  function setRouteBusy(busy: boolean, reqId?: number) {
    if (busy) {
      if (typeof reqId === "number") busyReqIdRef.current = reqId;
      onRouteBusyChange?.(true);
      return;
    }

    // If a reqId was provided, only clear if we still own busy.
    if (typeof reqId === "number" && busyReqIdRef.current !== reqId) return;

    busyReqIdRef.current = 0;
    onRouteBusyChange?.(false);
  }

  // --- Small helpers ---
  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function haversineMeters(a: [number, number], b: [number, number]) {
    // coords are [lng, lat]
    const R = 6_371_000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLng = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);

    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);
    const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function routeLengthMeters(coords: [number, number][]) {
    let sum = 0;
    for (let i = 1; i < coords.length; i++) sum += haversineMeters(coords[i - 1], coords[i]);
    return sum;
  }

  function straightLineMeters(from: mapboxgl.LngLat, to: mapboxgl.LngLat) {
    return from.distanceTo(to);
  }

  function isSillyRoute(params: {
    from: mapboxgl.LngLat;
    to: mapboxgl.LngLat;
    routeMeters: number;
    baselineMeters: number;
    maxDetourRatio: number;
    maxLoopiness: number;
  }) {
    const { from, to, routeMeters, baselineMeters, maxDetourRatio, maxLoopiness } = params;

    if (!Number.isFinite(routeMeters) || routeMeters <= 0) return true;
    if (!Number.isFinite(baselineMeters) || baselineMeters <= 0) return false;

    // 1) Detour ratio vs baseline
    if (routeMeters > baselineMeters * maxDetourRatio) return true;

    // 2) Loopiness vs straight-line distance
    const straight = straightLineMeters(from, to);
    if (straight > 0) {
      const loopiness = routeMeters / straight;
      if (loopiness > maxLoopiness) return true;
    }

    return false;
  }

  function isNearDuplicateRoute(a: [number, number][], b: [number, number][]) {
    if (a.length < 2 || b.length < 2) return true;

    // Quick checks: endpoint proximity + length similarity
    const aStart = a[0];
    const aEnd = a[a.length - 1];
    const bStart = b[0];
    const bEnd = b[b.length - 1];

    const startDist = haversineMeters(aStart, bStart);
    const endDist = haversineMeters(aEnd, bEnd);

    // If endpoints don't match for same OD, it's not a dup
    if (startDist > 40 || endDist > 40) return false;

    const aLen = routeLengthMeters(a);
    const bLen = routeLengthMeters(b);
    const diff = Math.abs(aLen - bLen);

    // If lengths are within ~3% or 60m (whichever larger), treat as dup
    return diff < Math.max(60, aLen * 0.03);
  }

  function metersToDegreesLat(m: number) {
    return m / 111_320;
  }

  function metersToDegreesLng(m: number, atLat: number) {
    const cos = Math.cos((atLat * Math.PI) / 180);
    return m / (111_320 * Math.max(0.2, cos));
  }

  function midpoint(a: mapboxgl.LngLat, b: mapboxgl.LngLat) {
    return new mapboxgl.LngLat((a.lng + b.lng) / 2, (a.lat + b.lat) / 2);
  }

  function detourWaypoints(mid: mapboxgl.LngLat, meters: number) {
    const dLat = metersToDegreesLat(meters);
    const dLng = metersToDegreesLng(meters, mid.lat);

    // 8-way detours around midpoint
    return [
      new mapboxgl.LngLat(mid.lng + dLng, mid.lat), // E
      new mapboxgl.LngLat(mid.lng - dLng, mid.lat), // W
      new mapboxgl.LngLat(mid.lng, mid.lat + dLat), // N
      new mapboxgl.LngLat(mid.lng, mid.lat - dLat), // S
      new mapboxgl.LngLat(mid.lng + dLng, mid.lat + dLat), // NE
      new mapboxgl.LngLat(mid.lng + dLng, mid.lat - dLat), // SE
      new mapboxgl.LngLat(mid.lng - dLng, mid.lat + dLat), // NW
      new mapboxgl.LngLat(mid.lng - dLng, mid.lat - dLat), // SW
    ];
  }

  function invalidateRouteNow(reason: string) {
    const map = mapRef.current;
    if (!map) return;

    // Stop any in-flight fetches / animations
    abortRef.current?.abort();
    sweepRef.current.clear(map);

    // Clear all drawn route layers/sources
    clearRouteLayers(map);

    // Reset local caches so stale state can't re-render
    lastGoodDestRef.current = null;
    variantsRef.current = null;

    // Bump req id so any pending timers no-op
    routeReqIdRef.current += 1;
    setRouteBusy(false);
    // console.log(`[DashboardMap] route invalidated: ${reason}`);
  }

  // --- Markers + geocoding ---
  function createCircleEl(color: string) {
    const el = document.createElement("div");
    el.style.width = "32px";
    el.style.height = "32px";
    el.style.backgroundColor = color;
    el.style.borderRadius = "50%";
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";

    // Critical: allow Mapbox to own touch gestures; marker itself should not trigger browser gestures.
    el.style.touchAction = "none";
    return el;
  }

  async function reverseGeocodeName(lng: number, lat: number): Promise<string> {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return "Dropped Pin";

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data?.features?.[0]?.place_name ?? "Dropped Pin";
    } catch {
      return "Dropped Pin";
    }
  }

  async function notifyDestinationPicked(lngLat: mapboxgl.LngLat) {
    if (!onDestinationPicked) return;
    const name = await reverseGeocodeName(lngLat.lng, lngLat.lat);
    onDestinationPicked({ name, lat: lngLat.lat, lng: lngLat.lng });
  }

  async function notifyFromPicked(lngLat: mapboxgl.LngLat, opts?: { immediateName?: string }) {
    if (!onFromPicked) return;

    const immediateName = opts?.immediateName;
    if (immediateName) {
      onFromPicked({ name: immediateName, lat: lngLat.lat, lng: lngLat.lng });
    }

    const name = await reverseGeocodeName(lngLat.lng, lngLat.lat);
    onFromPicked({ name, lat: lngLat.lat, lng: lngLat.lng });
  }

  function ensureFromMarker(map: mapboxgl.Map, lngLat: mapboxgl.LngLatLike) {
    if (fromMarkerRef.current) {
      fromMarkerRef.current.setLngLat(lngLat);
      return fromMarkerRef.current;
    }

    const el = createCircleEl("#16a34a");
    const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: "center" })
      .setLngLat(lngLat)
      .addTo(map);

    marker.on("dragstart", () => invalidateRouteNow("from marker dragstart"));

    marker.on("dragend", () => {
      invalidateRouteNow("from marker dragend");

      const from = marker.getLngLat();
      void notifyFromPicked(from);

      const to = destMarkerRef.current?.getLngLat();
      const m = mapRef.current;
      if (!to || !m) return;

      if (routeActive) {
        void generateAlternativesBetweenPoints(m, from, to);
      }
    });

    fromMarkerRef.current = marker;
    return marker;
  }

  function ensureDestMarker(map: mapboxgl.Map, lngLat: mapboxgl.LngLatLike) {
    if (destMarkerRef.current) {
      destMarkerRef.current.setLngLat(lngLat);
      return destMarkerRef.current;
    }

    const el = createCircleEl("#2563eb");
    const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: "center" })
      .setLngLat(lngLat)
      .addTo(map);

    marker.on("dragstart", () => invalidateRouteNow("dest marker dragstart"));

    marker.on("dragend", () => {
      invalidateRouteNow("dest marker dragend");
      const ll = marker.getLngLat();
      void notifyDestinationPicked(ll);
    });

    destMarkerRef.current = marker;
    return marker;
  }

  // --- Directions fetching ---
  async function fetchDirectionsRoute(params: {
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
      `?alternatives=true&geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

    const res = await fetch(url, { signal });
    return res.json();
  }

  async function buildVariant(
    map: mapboxgl.Map,
    coords: [number, number][],
    meta?: { distanceMeters?: number; durationSeconds?: number }
  ) {
    const getElevation = getElevationRef.current;
    const elevations = await Promise.all(
      coords.map(([lng, lat]) => (getElevation ? getElevation(map, lng, lat) : Promise.resolve(0)))
    );

    const stats = computeRouteStats(elevations);

    // Base score: lower = easier, higher = harder
    const baseScore = scoreEasy(stats);

    // Distance penalty so “easy” doesn't win via silly detours
    const geomMeters = routeLengthMeters(coords);
    const distMeters = meta?.distanceMeters ?? geomMeters;

    const km = distMeters / 1000;
    const distancePenalty = km * 0.18;

    return { coords, elevations, score: baseScore + distancePenalty } as Variant;
  }

  function drawVariantRoute(map: mapboxgl.Map, variant: Variant) {
    clearRouteLayers(map);
    sweepRef.current.clear(map);

    const segments = classifySegments(variant.elevations, variant.coords);

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

    if (segments.length > 0) {
      sweepRef.current.ensure(map, variant.coords);
      setTimeout(() => {
        const m = mapRef.current;
        if (!m) return;
        sweepRef.current.run(m);
      }, 120);
    }
  }

  async function drawRouteBetweenPoints(
    map: mapboxgl.Map,
    from: mapboxgl.LngLat,
    to: mapboxgl.LngLat
  ) {
    if (!map.isStyleLoaded()) {
      await new Promise<void>((resolve) => map.once("load", () => resolve()));
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const reqId = ++routeReqIdRef.current;
    setRouteBusy(true, reqId);

    const drawSegmented = async (coords: [number, number][]) => {
      const getElevation = getElevationRef.current;
      const elevations = await Promise.all(
        coords.map(([lng, lat]) =>
          getElevation ? getElevation(map, lng, lat) : Promise.resolve(0)
        )
      );

      const segments = classifySegments(elevations, coords);

      clearRouteLayers(map);
      sweepRef.current.clear(map);

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
        } catch (err: any) {}

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

      if (segments.length > 0) {
        sweepRef.current.ensure(map, coords);
        onRouteDrawn?.();

        const safeReqId = reqId;
        setTimeout(() => {
          if (safeReqId !== routeReqIdRef.current) return;
          const m = mapRef.current;
          if (!m) return;
          sweepRef.current.run(m);
        }, 120);
      }
    };

    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/walking/` +
        `${from.lng},${from.lat};${to.lng},${to.lat}` +
        `?alternatives=true&geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();

      if (reqId !== routeReqIdRef.current) return;

      if (!data?.routes?.length) {
        const fallback = lastGoodDestRef.current;
        if (fallback && destMarkerRef.current) {
          destMarkerRef.current.setLngLat(fallback);
          void notifyDestinationPicked(fallback);
        }
        return;
      }

      const rawCoords = data.routes[0].geometry.coordinates as [number, number][];
      const coords = resampleCoords(rawCoords);

      lastGoodDestRef.current = new mapboxgl.LngLat(to.lng, to.lat);

      await drawSegmented(coords);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("drawRouteBetweenPoints error:", err);

      const fallback = lastGoodDestRef.current;
      if (fallback && destMarkerRef.current) {
        destMarkerRef.current.setLngLat(fallback);
        void notifyDestinationPicked(fallback);
      }
    } finally {
      setRouteBusy(false, reqId);
    }
  }

  async function generateAlternativesBetweenPoints(
    map: mapboxgl.Map,
    from: mapboxgl.LngLat,
    to: mapboxgl.LngLat
  ) {
    if (!map.isStyleLoaded()) {
      await new Promise<void>((resolve) => map.once("load", () => resolve()));
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const reqId = ++routeReqIdRef.current;
    setRouteBusy(true, reqId);

    try {
      // 1) First try normal alternatives
      const baseData = await fetchDirectionsRoute({ from, to, signal: controller.signal });
      if (reqId !== routeReqIdRef.current) return;

      const baseRoutes: any[] = Array.isArray(baseData?.routes) ? baseData.routes : [];

      // Baseline: shortest route among returned routes (fallback to geometry estimate)
      let baselineMeters = Infinity;
      for (const r of baseRoutes) {
        const d = typeof r?.distance === "number" ? r.distance : undefined;
        if (d && Number.isFinite(d)) baselineMeters = Math.min(baselineMeters, d);
      }

      const candidates: Variant[] = [];

      // Build candidates from base routes (up to 4)
      for (const r of baseRoutes.slice(0, 4)) {
        const raw = r?.geometry?.coordinates as [number, number][] | undefined;
        if (!raw?.length) continue;

        const coords = resampleCoords(raw);

        const geomMeters = routeLengthMeters(coords);
        const distMeters = typeof r?.distance === "number" ? r.distance : geomMeters;

        if (!Number.isFinite(baselineMeters) || baselineMeters === Infinity)
          baselineMeters = distMeters;

        if (
          isSillyRoute({
            from,
            to,
            routeMeters: distMeters,
            baselineMeters,
            maxDetourRatio: 1.18,
            maxLoopiness: 2.2,
          })
        ) {
          continue;
        }

        if (candidates.some((c) => isNearDuplicateRoute(c.coords, coords))) continue;

        candidates.push(
          await buildVariant(map, coords, {
            distanceMeters: typeof r?.distance === "number" ? r.distance : undefined,
            durationSeconds: typeof r?.duration === "number" ? r.duration : undefined,
          })
        );
      }

      // 2) Fallback: generate detour candidates if not enough uniques
      if (candidates.length < 2) {
        const mid = midpoint(from, to);
        const trip = from.distanceTo(to) ?? 1500;
        const approxMeters = clamp(trip * 0.06, 120, 420);
        const waypoints = detourWaypoints(mid, approxMeters);

        for (const wp of waypoints) {
          if (reqId !== routeReqIdRef.current) return;

          const detourData = await fetchDirectionsRoute({
            from,
            to,
            via: wp,
            signal: controller.signal,
          });
          const detourRoutes: any[] = Array.isArray(detourData?.routes) ? detourData.routes : [];
          if (!detourRoutes.length) continue;

          const raw = detourRoutes[0]?.geometry?.coordinates as [number, number][] | undefined;
          if (!raw?.length) continue;

          const coords = resampleCoords(raw);

          const geomMeters = routeLengthMeters(coords);
          const distMeters =
            typeof detourRoutes[0]?.distance === "number" ? detourRoutes[0].distance : geomMeters;

          if (
            isSillyRoute({
              from,
              to,
              routeMeters: distMeters,
              baselineMeters,
              maxDetourRatio: 1.12,
              maxLoopiness: 2.0,
            })
          ) {
            continue;
          }

          if (candidates.some((c) => isNearDuplicateRoute(c.coords, coords))) continue;

          candidates.push(await buildVariant(map, coords, { distanceMeters: distMeters }));
          if (candidates.length >= 4) break;
        }
      }

      if (reqId !== routeReqIdRef.current) return;

      // ✅ If our filtering was too strict (common on long trips), fall back to the first
      // returned route so we still draw *something* and can resolve the planner UI.
      if (candidates.length === 0) {
        const first = baseRoutes[0];
        const raw = first?.geometry?.coordinates as [number, number][] | undefined;
        if (raw?.length) {
          const coords = resampleCoords(raw);
          const geomMeters = routeLengthMeters(coords);
          const distMeters = typeof first?.distance === "number" ? first.distance : geomMeters;

          candidates.push(
            await buildVariant(map, coords, {
              distanceMeters: distMeters,
              durationSeconds: typeof first?.duration === "number" ? first.duration : undefined,
            })
          );
        }
      }

      // If we still have nothing, bail.
      if (candidates.length === 0) return;

      // 3) Pick easy/hard by score (lower = easier, higher = harder)
      const sorted = [...candidates].sort((a, b) => a.score - b.score);

      let easy = sorted[0];
      let hard = sorted[sorted.length - 1];

      // If extremes are effectively the same path, pick the next-best option to ensure variety
      if (sorted.length > 1 && isNearDuplicateRoute(easy.coords, hard.coords)) {
        for (let i = sorted.length - 2; i >= 0; i--) {
          if (!isNearDuplicateRoute(easy.coords, sorted[i].coords)) {
            hard = sorted[i];
            break;
          }
        }
        if (isNearDuplicateRoute(easy.coords, hard.coords)) {
          for (let i = 1; i < sorted.length; i++) {
            if (!isNearDuplicateRoute(sorted[i].coords, hard.coords)) {
              easy = sorted[i];
              break;
            }
          }
        }
      }

      variantsRef.current = { easy, hard };
      onVariantsReady?.();

      // Default selection to easy
      if (!selectedVariantRef.current) {
        selectedVariantRef.current = "easy";
        onVariantSelected?.("easy");
      }

      const initial = selectedVariantRef.current ?? "easy";
      drawVariantRoute(map, initial === "hard" ? hard : easy);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("generateAlternativesBetweenPoints error:", err);
    } finally {
      setRouteBusy(false, reqId);
    }
  }

  // --- Controls styling injection (component-owned) ---
  const controlsCssText = useMemo(() => {
    return `
      /* Position the Mapbox top-left control stack below our custom top-left overlay */
      .hf-map .mapboxgl-ctrl-top-left {
        top: var(--hf-mapbox-top-left-offset, 84px);
        left: 7px;
      }

      /* Frosted-glass look to match Hillfinder UI */
      .hf-map .mapboxgl-ctrl-group {
        border: 1px solid rgba(255,255,255,0.45);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 24px rgba(0,0,0,0.14);
        background: rgba(255,255,255,0.62);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      /* Buttons */
      .hf-map .mapboxgl-ctrl-group button {
        width: 42px;
        height: 42px;
      }

      /* Subtle separators + hover */
      .hf-map .mapboxgl-ctrl-group button + button { border-top: 1px solid rgba(0,0,0,0.06); }
      .hf-map .mapboxgl-ctrl-group button:hover { background: rgba(255,255,255,0.85); }
      .hf-map .mapboxgl-ctrl-group button:active { background: rgba(255,255,255,0.92); }

      /* Make icons read as “rich black” */
      .hf-map .mapboxgl-ctrl-icon { filter: saturate(0) brightness(0.15); }

      /* Keep controls above the map canvas but below heavy overlays/modals */
      .hf-map .mapboxgl-ctrl-top-left { z-index: 6; }
    `;
  }, []);

  // ✅ Map init + gesture capture (CSS-first; Mapbox owns gestures)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && !mapboxgl.accessToken) return;

    // Lock page scroll to prevent iOS rubber-banding. Avoid any preventDefault gesture handlers.
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;
    const prevBodyOverscroll = (document.body.style as any).overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    (document.body.style as any).overscrollBehavior = "none";

    // Inject per-component CSS for Mapbox controls
    const controlsStyleEl = document.createElement("style");
    controlsStyleEl.setAttribute("data-hf-mapbox-controls", "true");
    controlsStyleEl.textContent = controlsCssText;
    document.head.appendChild(controlsStyleEl);

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-73.761, 40.715],
      zoom: 13,
      clickTolerance: 8,
    });

    mapRef.current = map;

    // Let Mapbox fully own gestures; this prevents the “pinch zoom in but can't zoom out” iOS bug.
    map.dragPan.enable();
    map.touchZoomRotate.enable();
    map.touchZoomRotate.disableRotation();
    map.doubleClickZoom.enable();
    map.scrollZoom.enable();
    map.keyboard.enable();

    // Container gesture CSS: ensure browser doesn't treat this as a page-scroll surface.
    const containerEl = map.getContainer();
    const canvasContainerEl = map.getCanvasContainer();

    containerEl.style.touchAction = "none";
    canvasContainerEl.style.touchAction = "none";
    (containerEl.style as any).overscrollBehavior = "none";
    (canvasContainerEl.style as any).overscrollBehavior = "none";

    // Offset Mapbox controls under your top-left overlay
    containerEl.style.setProperty(
      "--hf-mapbox-top-left-offset",
      `${TOP_LEFT_CONTROLS_OFFSET_PX}px`
    );

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true,
    });
    map.addControl(geolocate, "top-right");

    // Seed FROM immediately (prevents “missing from” UI flicker)
    try {
      const center = map.getCenter();
      ensureFromMarker(map, center);
      void notifyFromPicked(center, { immediateName: "Locating…" });
    } catch {}

    tileCacheRef.current.clear();
    getElevationRef.current = createTerrainElevationGetter({
      tileCache: tileCacheRef.current,
      demTileset: "mapbox.terrain-rgb",
      elevZoom: 14,
      getAccessToken: () =>
        process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? mapboxgl.accessToken ?? undefined,
    });

    function handlePickAt(lngLat: mapboxgl.LngLat) {
      if (!mapRef.current) return;

      const allowed = canAcceptDestination?.({
        lat: lngLat.lat,
        lng: lngLat.lng,
      });

      if (allowed === false) {
        return;
      }

      ensureDestMarker(mapRef.current, lngLat);
      void notifyDestinationPicked(lngLat);
    }

    // Reliable click/tap selection without extra touch listeners
    let lastTapAt = 0;
    map.on("click", (e) => {
      const now = Date.now();
      if (now - lastTapAt < 320) return;
      lastTapAt = now;
      if (!e?.lngLat) return;
      handlePickAt(e.lngLat);
    });

    map.on("load", () => {
      // Terrain
      try {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.terrain-rgb",
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1 });
      } catch {}

      // Initial GPS
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const ll = new mapboxgl.LngLat(longitude, latitude);
          ensureFromMarker(map, ll);
          void notifyFromPicked(ll, { immediateName: "Current location" });
          map.flyTo({ center: [longitude, latitude], zoom: 15, essential: true });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
      );
    });

    return () => {
      try {
        const injected = document.querySelector('style[data-hf-mapbox-controls="true"]');
        injected?.parentElement?.removeChild(injected);
      } catch {}

      try {
        fromMarkerRef.current?.remove();
      } catch {}
      try {
        destMarkerRef.current?.remove();
      } catch {}
      fromMarkerRef.current = null;
      destMarkerRef.current = null;

      try {
        sweepRef.current.destroy(map);
      } catch {}

      try {
        map.remove();
      } catch {}
      mapRef.current = null;

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;
      (document.body.style as any).overscrollBehavior = prevBodyOverscroll;

      abortRef.current?.abort();
      setRouteBusy(false);
    };
  }, [controlsCssText]);

  // Mirror destination marker + fly to it (do not auto-draw)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // If destination is cleared, remove the marker.
    if (!destination) {
      try {
        destMarkerRef.current?.remove();
      } catch {}
      destMarkerRef.current = null;
      return;
    }

    ensureDestMarker(map, [destination.lng, destination.lat]);
    map.flyTo({ center: [destination.lng, destination.lat], zoom: 15, essential: true });
  }, [destination]);

  // Draw route only when routeRequestNonce changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!routeRequestNonce) return;

    const from = fromMarkerRef.current?.getLngLat();
    const to = destMarkerRef.current?.getLngLat();
    if (!from || !to) return;

    void drawRouteBetweenPoints(map, from, to);
  }, [routeRequestNonce]);

  // Clear route when parent bumps the nonce
  useEffect(() => {
    const map = mapRef.current;
    if (clearRouteNonce == null) return;
    if (!map) return;

    clearRouteLayers(map);
    sweepRef.current.clear(map);

    lastGoodDestRef.current = null;
    variantsRef.current = null;
    setRouteBusy(false);
  }, [clearRouteNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clearDestinationNonce == null) return;

    // Remove destination marker
    try {
      destMarkerRef.current?.remove();
    } catch {}
    destMarkerRef.current = null;

    // Clear any drawn routes/sweeps tied to the destination
    clearRouteLayers(map);
    sweepRef.current.clear(map);
    lastGoodDestRef.current = null;
    variantsRef.current = null;
    setRouteBusy(false);
  }, [clearDestinationNonce]);

  // Recenter map on the FROM location when requested
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!recenterNonce) return; // optional: prevents running on mount

    // Prefer parent state; fall back to the marker (works even if parent state is temporarily null)
    const markerLL = fromMarkerRef.current?.getLngLat();

    const lng = fromLocation?.lng ?? markerLL?.lng;
    const lat = fromLocation?.lat ?? markerLL?.lat;

    if (lng == null || lat == null) return;

    map.easeTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 550,
      essential: true,
    });
  }, [recenterNonce, fromLocation]);

  // Build + draw two alternatives when requested
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!routeAlternativesNonce) return;

    const from = fromMarkerRef.current?.getLngLat();
    const to = destMarkerRef.current?.getLngLat();
    if (!from || !to) return;

    void generateAlternativesBetweenPoints(map, from, to);
  }, [routeAlternativesNonce]);

  // Switch the rendered variant when selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectedVariant) return;

    const v = variantsRef.current;
    if (!v) return;

    drawVariantRoute(map, selectedVariant === "hard" ? v.hard : v.easy);
  }, [selectedVariant]);

  // Keep the FROM marker synced with parent state
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!fromLocation) return;

    const ll = new mapboxgl.LngLat(fromLocation.lng, fromLocation.lat);
    ensureFromMarker(map, ll);
  }, [fromLocation]);

  return (
    <div
      ref={mapContainerRef}
      className="hf-map absolute inset-0 h-full w-full bg-[#e5e3df]"
      style={{ touchAction: "pan-x pan-y", overscrollBehavior: "none" as any }}
    />
  );
}
