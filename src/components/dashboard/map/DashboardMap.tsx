"use client";

import { createNavigationPuck } from "@/components/dashboard/map/NavigationPuck";
import { haversineMeters } from "@/lib/geo/distance";
import { classifySegments } from "@/lib/map/classifySegments";
import { clearRouteLayers } from "@/lib/map/clearRouteLayers";
import { findDownhillNearby } from "@/lib/map/findDownhillNearby";
import { resampleCoords } from "@/lib/map/resampleCoords";
import { computeRouteStats, scoreEasy, scoreHard } from "@/lib/map/routeDifficulty";
import { createRouteSweepController } from "@/lib/map/routeSweep";
import { createTerrainElevationGetter, type TileKey } from "@/lib/map/terrainReady";
import { resolveHeading } from "@/lib/navigation/heading";
import { buildNavSteps } from "@/lib/navigation/progress";
import { snapPointToRoute } from "@/lib/navigation/routeSnap";
import type { SaveRoutePayload, SavedRouteRecord, SavedRouteSegment } from "@/types/saved-route";

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
  easyScore: number;
  hardScore: number;
  distanceMeters?: number;
  durationSeconds?: number;
  segments?: SavedRouteSegment[];
  navSteps?: ReturnType<typeof buildNavSteps>;
};

const DETAIL_ROUTE_ZOOM_THRESHOLD = 13;

export default function DashboardMap({
  destination,
  clearRouteNonce,
  onRouteDrawn,
  onRouteFailed,
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
  onRouteReady,
  savedRouteToLoad,
  canAcceptDestination,
  findDownhillNonce,
  onNavigationLocationChange,
  isNavigating,
}: {
  destination?: Destination | null;
  clearRouteNonce?: number;
  onRouteDrawn?: () => void;
  onRouteFailed?: (message?: string) => void;
  onDestinationPicked?: (loc: { name: string; lat: number; lng: number }) => void;
  routeRequestNonce?: number;
  routeActive?: boolean;
  onFromPicked?: (loc: { name: string; lat: number; lng: number }) => void;
  fromLocation?: { lat: number; lng: number; name?: string } | null;
  recenterNonce?: number;
  routeAlternativesNonce?: number;
  selectedVariant?: VariantKey | null;
  onVariantsReady?: () => void;
  onVariantSelected?: (v: VariantKey) => void;
  clearDestinationNonce?: number;
  onRouteBusyChange?: (busy: boolean) => void;
  onRouteReady?: (route: SaveRoutePayload) => void;
  savedRouteToLoad?: SavedRouteRecord | null;
  canAcceptDestination?: (loc: { lat: number; lng: number }) => boolean;
  findDownhillNonce?: number;
  onNavigationLocationChange?: (loc: { lat: number; lng: number }) => void;
  isNavigating?: boolean;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const fromMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const latestDeviceLocationRef = useRef<mapboxgl.LngLat | null>(null);

  const tileCacheRef = useRef<Map<TileKey, Promise<Uint8ClampedArray>>>(new Map());

  const getElevationRef = useRef<
    ((map: mapboxgl.Map, lng: number, lat: number) => Promise<number>) | null
  >(null);

  const routeReqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const lastGoodDestRef = useRef<mapboxgl.LngLat | null>(null);
  const variantsRef = useRef<{ easy: Variant; hard: Variant } | null>(null);

  const selectedVariantRef = useRef<VariantKey | null>(null);
  const renderedRouteModeRef = useRef<"overview" | "detail" | null>(null);
  const sweepRef = useRef(createRouteSweepController());

  const lastHandledDownhillNonceRef = useRef<number>(0);
  const routeActiveRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const followCameraPausedUntilRef = useRef(0);
  const previousDeviceLocationRef = useRef<mapboxgl.LngLat | null>(null);

  const TOP_LEFT_CONTROLS_OFFSET_PX = 400;
  const busyReqIdRef = useRef(0);
  const navigationPuckRef = useRef<mapboxgl.Marker | null>(null);
  const lastResolvedHeadingRef = useRef<number | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);

  function setRouteBusy(busy: boolean, reqId?: number) {
    if (busy) {
      if (typeof reqId === "number") busyReqIdRef.current = reqId;
      onRouteBusyChange?.(true);
      return;
    }

    if (typeof reqId === "number" && busyReqIdRef.current !== reqId) return;

    busyReqIdRef.current = 0;
    onRouteBusyChange?.(false);
  }

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function routeLengthMeters(coords: [number, number][]) {
    let sum = 0;
    for (let i = 1; i < coords.length; i++) {
      sum += haversineMeters(coords[i - 1], coords[i]);
    }
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

    if (routeMeters > baselineMeters * maxDetourRatio) return true;

    const straight = straightLineMeters(from, to);
    if (straight > 0) {
      const loopiness = routeMeters / straight;
      if (loopiness > maxLoopiness) return true;
    }

    return false;
  }

  function isNearDuplicateRoute(a: [number, number][], b: [number, number][]) {
    if (a.length < 2 || b.length < 2) return true;

    const aStart = a[0];
    const aEnd = a[a.length - 1];
    const bStart = b[0];
    const bEnd = b[b.length - 1];

    const startDist = haversineMeters(aStart, bStart);
    const endDist = haversineMeters(aEnd, bEnd);

    if (startDist > 40 || endDist > 40) return false;

    const aLen = routeLengthMeters(a);
    const bLen = routeLengthMeters(b);
    const diff = Math.abs(aLen - bLen);

    return diff < Math.max(60, aLen * 0.03);
  }

  function pickMostDistinctVariant(base: Variant, candidates: Variant[], mode: "easy" | "hard") {
    const nonDuplicate = candidates.filter((candidate) => {
      if (candidate === base) return false;
      return !isNearDuplicateRoute(base.coords, candidate.coords);
    });

    if (!nonDuplicate.length) return null;

    return nonDuplicate.reduce((best, candidate) => {
      const bestScore = mode === "easy" ? best.easyScore : best.hardScore;
      const candidateScore = mode === "easy" ? candidate.easyScore : candidate.hardScore;
      const baseScore = mode === "easy" ? base.easyScore : base.hardScore;

      const bestGap = Math.abs(bestScore - baseScore);
      const candidateGap = Math.abs(candidateScore - baseScore);

      if (candidateGap > bestGap) return candidate;

      if (candidateGap === bestGap) {
        const bestLen = best.distanceMeters ?? routeLengthMeters(best.coords);
        const candidateLen = candidate.distanceMeters ?? routeLengthMeters(candidate.coords);
        if (candidateLen > bestLen) return candidate;
      }

      return best;
    });
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

    return [
      new mapboxgl.LngLat(mid.lng + dLng, mid.lat),
      new mapboxgl.LngLat(mid.lng - dLng, mid.lat),
      new mapboxgl.LngLat(mid.lng, mid.lat + dLat),
      new mapboxgl.LngLat(mid.lng, mid.lat - dLat),
      new mapboxgl.LngLat(mid.lng + dLng, mid.lat + dLat),
      new mapboxgl.LngLat(mid.lng + dLng, mid.lat - dLat),
      new mapboxgl.LngLat(mid.lng - dLng, mid.lat + dLat),
      new mapboxgl.LngLat(mid.lng - dLng, mid.lat - dLat),
    ];
  }

  function detourWaypointRings(from: mapboxgl.LngLat, to: mapboxgl.LngLat) {
    const mid = midpoint(from, to);
    const trip = from.distanceTo(to) ?? 1500;

    const radii = [
      clamp(trip * 0.05, 90, 180),
      clamp(trip * 0.09, 160, 320),
      clamp(trip * 0.14, 260, 520),
      clamp(trip * 0.2, 360, 760),
    ];

    const seen = new Set<string>();
    const waypoints: mapboxgl.LngLat[] = [];

    for (const radius of radii) {
      for (const wp of detourWaypoints(mid, radius)) {
        const key = `${wp.lng.toFixed(5)},${wp.lat.toFixed(5)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        waypoints.push(wp);
      }
    }

    return waypoints;
  }

  function clearOverviewRoute(map: mapboxgl.Map) {
    const id = "route-overview";

    try {
      if (map.getLayer(id)) map.removeLayer(id);
    } catch {}
    try {
      if (map.getSource(id)) map.removeSource(id);
    } catch {}
  }

  function invalidateRouteNow() {
    const map = mapRef.current;
    if (!map) return;

    abortRef.current?.abort();
    sweepRef.current.clear(map);

    clearOverviewRoute(map);
    clearRouteLayers(map);

    lastGoodDestRef.current = null;
    variantsRef.current = null;
    selectedVariantRef.current = null;
    renderedRouteModeRef.current = null;

    routeReqIdRef.current += 1;
    setRouteBusy(false);
  }

  function createCircleEl(color: string) {
    const el = document.createElement("div");
    el.style.width = "32px";
    el.style.height = "32px";
    el.style.backgroundColor = color;
    el.style.borderRadius = "50%";
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
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

    marker.getElement().style.zIndex = "8";

    marker.on("dragstart", () => invalidateRouteNow());

    marker.on("dragend", () => {
      invalidateRouteNow();

      const from = marker.getLngLat();
      void notifyFromPicked(from);

      const to = destMarkerRef.current?.getLngLat();
      const m = mapRef.current;
      if (!to || !m) return;

      if (routeActiveRef.current) {
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
    const marker = new mapboxgl.Marker({ element: el, draggable: false, anchor: "center" })
      .setLngLat(lngLat)
      .addTo(map);

    marker.getElement().style.zIndex = "7";

    destMarkerRef.current = marker;
    return marker;
  }

  function ensureNavigationPuck(map: mapboxgl.Map, lngLat: mapboxgl.LngLatLike) {
    if (navigationPuckRef.current) {
      navigationPuckRef.current.setLngLat(lngLat);
      navigationPuckRef.current.getElement().style.removeProperty("display");
      return navigationPuckRef.current;
    }

    const el = createNavigationPuck();

    const marker = new mapboxgl.Marker({
      element: el,
      anchor: "center",
    })
      .setLngLat(lngLat)
      .addTo(map);

    marker.getElement().style.zIndex = "9";
    marker.getElement().style.removeProperty("display");

    navigationPuckRef.current = marker;
    return marker;
  }

  function restoreFromToCurrentLocation(map: mapboxgl.Map) {
    const latest = latestDeviceLocationRef.current;
    if (!latest) return;

    // Move green marker back to device location
    ensureFromMarker(map, latest);

    // Make sure it's visible
    fromMarkerRef.current?.getElement().style.removeProperty("display");

    // Hide navigation puck if it exists
    navigationPuckRef.current?.getElement().style.setProperty("display", "none");

    // Sync UI label
    void notifyFromPicked(latest, { immediateName: "Current location" });
  }

  function getActiveVariantCoords() {
    const variants = variantsRef.current;

    if (!variants) return null;

    const activeKey = selectedVariantRef.current ?? "easy";

    const activeVariant = activeKey === "hard" ? variants.hard : variants.easy;

    return activeVariant?.coords ?? null;
  }

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
      `?alternatives=true&geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`;

    const res = await fetch(url, { signal });
    return res.json();
  }

  async function buildVariant(
    map: mapboxgl.Map,
    coords: [number, number][],
    meta?: {
      distanceMeters?: number;
      durationSeconds?: number;
      baselineDistanceMeters?: number;
      navSteps?: ReturnType<typeof buildNavSteps>;
    }
  ) {
    const getElevation = getElevationRef.current;
    const elevations = await Promise.all(
      coords.map(([lng, lat]) => (getElevation ? getElevation(map, lng, lat) : Promise.resolve(0)))
    );

    const segments = classifySegments(elevations, coords);
    const stats = computeRouteStats(elevations);

    const geomMeters = routeLengthMeters(coords);
    const distMeters = meta?.distanceMeters ?? geomMeters;
    const km = distMeters / 1000;

    const baselineDistanceMeters =
      meta?.baselineDistanceMeters && meta.baselineDistanceMeters > 0
        ? meta.baselineDistanceMeters
        : distMeters;

    const detourRatio = baselineDistanceMeters > 0 ? distMeters / baselineDistanceMeters : 1;

    // Easy should strongly prefer believable/direct routes
    const easyDistancePenalty = km * 0.2;
    const easyDetourPenalty = detourRatio <= 1.08 ? 0 : (detourRatio - 1.08) * 140;

    // Hard can tolerate more wandering, but still not nonsense
    const hardDistanceBonus = km * 0.08;
    const hardDetourPenalty = detourRatio <= 1.14 ? 0 : (detourRatio - 1.14) * 70;

    return {
      coords,
      elevations,
      easyScore: scoreEasy(stats) + easyDistancePenalty + easyDetourPenalty,
      hardScore: scoreHard(stats) + hardDistanceBonus + hardDetourPenalty,
      distanceMeters: distMeters,
      durationSeconds: meta?.durationSeconds,
      segments,
      navSteps: meta?.navSteps ?? [],
    } as Variant;
  }

  async function buildNearbyRoute(
    from: mapboxgl.LngLat,
    to: { lat: number; lng: number; name?: string },
    signal: AbortSignal
  ) {
    const map = mapRef.current;
    if (!map) {
      throw new Error("Map not ready");
    }

    const data = await fetchDirectionsRoute({
      from,
      to: new mapboxgl.LngLat(to.lng, to.lat),
      signal,
    });

    const first = data?.routes?.[0];
    const navSteps = first ? buildNavSteps(first) : [];
    const raw = first?.geometry?.coordinates as [number, number][] | undefined;

    if (!raw?.length) {
      throw new Error("No route found for nearby candidate");
    }

    const coords = resampleCoords(raw);
    const geomMeters = routeLengthMeters(coords);
    const distMeters = typeof first?.distance === "number" ? first.distance : geomMeters;

    const variant = await buildVariant(map, coords, {
      distanceMeters: distMeters,
      durationSeconds: typeof first?.duration === "number" ? first.duration : undefined,
      baselineDistanceMeters: distMeters,
      navSteps,
    });

    return {
      coords: variant.coords,
      elevations: variant.elevations,
      distanceMeters: variant.distanceMeters,
      durationSeconds: variant.durationSeconds,
      segments: variant.segments,
      navSteps: variant.navSteps,
      score: variant.easyScore,
      to: {
        lat: to.lat,
        lng: to.lng,
        name: to.name,
      },
    };
  }

  function drawOverviewRoute(map: mapboxgl.Map, coords: [number, number][]) {
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

  function drawSegments(map: mapboxgl.Map, segments: SavedRouteSegment[]) {
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
      sweepRef.current.ensure(map, coords);
      setTimeout(() => {
        const m = mapRef.current;
        if (!m) return;
        if (m.getZoom() < DETAIL_ROUTE_ZOOM_THRESHOLD) return;
        sweepRef.current.run(m);
      }, 120);
    }
  }

  function emitRouteReady(
    variantKey: VariantKey,
    variant: Variant,
    from: mapboxgl.LngLat,
    to: mapboxgl.LngLat,
    names?: {
      fromName?: string;
      toName?: string;
    }
  ) {
    onRouteReady?.({
      from: {
        lat: from.lat,
        lng: from.lng,
        name: names?.fromName ?? fromLocation?.name ?? "Start",
      },
      to: {
        lat: to.lat,
        lng: to.lng,
        name: names?.toName ?? destination?.name ?? "Destination",
      },
      difficulty: variantKey,
      coords: variant.coords,
      elevations: variant.elevations,
      segments: variant.segments,
      distanceMeters: variant.distanceMeters,
      durationSeconds: variant.durationSeconds,
      navSteps: variant.navSteps ?? [],
      // reset step index when a new route is emitted
      // (not part of payload, just reset here)
    });
  }

  function renderVariantForZoom(map: mapboxgl.Map, variant: Variant) {
    const nextMode = map.getZoom() < DETAIL_ROUTE_ZOOM_THRESHOLD ? "overview" : "detail";

    clearOverviewRoute(map);
    clearRouteLayers(map);
    sweepRef.current.clear(map);

    if (nextMode === "overview") {
      drawOverviewRoute(map, variant.coords);
    } else if (variant.segments?.length) {
      drawSegments(map, variant.segments);
    } else {
      const computed = classifySegments(variant.elevations, variant.coords);
      drawSegments(map, computed);
    }

    renderedRouteModeRef.current = nextMode;

    console.log("[renderVariantForZoom]", {
      zoom: map.getZoom(),
      nextMode,
      coords: variant.coords.length,
      segments: variant.segments?.length ?? 0,
    });
  }

  function loadSavedRoute(map: mapboxgl.Map, savedRoute: SavedRouteRecord) {
    abortRef.current?.abort();
    routeReqIdRef.current += 1;
    setRouteBusy(true);

    clearOverviewRoute(map);
    clearRouteLayers(map);
    sweepRef.current.clear(map);

    const from = new mapboxgl.LngLat(savedRoute.from.lng, savedRoute.from.lat);
    const to = new mapboxgl.LngLat(savedRoute.to.lng, savedRoute.to.lat);

    ensureFromMarker(map, from);
    ensureDestMarker(map, to);

    const coords = savedRoute.coords;
    if (!coords.length) {
      setRouteBusy(false);
      return;
    }

    const variant: Variant = {
      coords,
      elevations: savedRoute.elevations ?? [],
      easyScore: 0,
      hardScore: 0,
      distanceMeters: savedRoute.distanceMeters,
      durationSeconds: savedRoute.durationSeconds,
      segments: savedRoute.segments,
      navSteps: savedRoute.navSteps ?? [],
    };

    selectedVariantRef.current = savedRoute.difficulty;
    variantsRef.current = {
      easy: variant,
      hard: variant,
    };
    lastGoodDestRef.current = to;

    renderVariantForZoom(map, variant);

    emitRouteReady(savedRoute.difficulty, variant, from, to, {
      fromName: savedRoute.from.name,
      toName: savedRoute.to.name,
    });

    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach(([lng, lat]) => bounds.extend([lng, lat]));

    map.fitBounds(bounds, {
      padding: {
        top: savedRoute.difficulty === "hard" ? 110 : 140,
        right: 40,
        bottom: 140,
        left: 40,
      },
      duration: 700,
      curve: 1.4,
      essential: true,
      maxZoom: savedRoute.difficulty === "hard" ? 17 : 16,
    });

    onVariantSelected?.(savedRoute.difficulty);
    onRouteDrawn?.();
    onVariantsReady?.();

    console.log("[loadSavedRoute] loading", {
      id: savedRoute._id ?? savedRoute.name,
      difficulty: savedRoute.difficulty,
      coords: savedRoute.coords?.length,
      segments: savedRoute.segments?.length,
    });
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

    const drawSegmented = async (
      coords: [number, number][],
      navSteps: ReturnType<typeof buildNavSteps> = []
    ) => {
      const getElevation = getElevationRef.current;
      const elevations = await Promise.all(
        coords.map(([lng, lat]) =>
          getElevation ? getElevation(map, lng, lat) : Promise.resolve(0)
        )
      );

      const segments = classifySegments(elevations, coords);

      const stats = computeRouteStats(elevations);

      const variant: Variant = {
        coords,
        elevations,
        easyScore: scoreEasy(stats),
        hardScore: scoreHard(stats),
        distanceMeters: routeLengthMeters(coords),
        segments,
        navSteps,
      };

      const variantKey = selectedVariantRef.current ?? "easy";
      selectedVariantRef.current = variantKey;
      variantsRef.current = {
        easy: variant,
        hard: variant,
      };

      renderVariantForZoom(map, variant);
      emitRouteReady(variantKey, variant, from, to);
      onRouteDrawn?.();
    };

    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/walking/` +
        `${from.lng},${from.lat};${to.lng},${to.lat}` +
        `?alternatives=true&geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`;

      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();

      const firstRoute = data?.routes?.[0];
      const navSteps = firstRoute ? buildNavSteps(firstRoute) : [];
      console.log("🔥 drawRouteBetweenPoints navSteps", navSteps);

      if (reqId !== routeReqIdRef.current) return;

      if (!data?.routes?.length) {
        const fallback = lastGoodDestRef.current;
        if (fallback && destMarkerRef.current) {
          destMarkerRef.current.setLngLat(fallback);
          void notifyDestinationPicked(fallback);
        }
        onRouteFailed?.("We couldn’t generate a route for that selection.");
        return;
      }

      const rawCoords = data.routes[0].geometry.coordinates as [number, number][];
      const coords = resampleCoords(rawCoords);

      lastGoodDestRef.current = new mapboxgl.LngLat(to.lng, to.lat);

      await drawSegmented(coords, navSteps);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("drawRouteBetweenPoints error:", err);

      const fallback = lastGoodDestRef.current;
      if (fallback && destMarkerRef.current) {
        destMarkerRef.current.setLngLat(fallback);
        void notifyDestinationPicked(fallback);
      }
      onRouteFailed?.("Something went wrong generating the route.");
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
      const baseData = await fetchDirectionsRoute({ from, to, signal: controller.signal });
      if (reqId !== routeReqIdRef.current) return;

      const baseRoutes: any[] = Array.isArray(baseData?.routes) ? baseData.routes : [];

      if (baseRoutes[0]) {
        console.log("🔥 generateAlternatives navSteps", buildNavSteps(baseRoutes[0]));
      }

      let baselineMeters = Infinity;
      for (const r of baseRoutes) {
        const d = typeof r?.distance === "number" ? r.distance : undefined;
        if (d && Number.isFinite(d)) baselineMeters = Math.min(baselineMeters, d);
      }

      const candidates: Variant[] = [];

      for (const r of baseRoutes.slice(0, 4)) {
        const raw = r?.geometry?.coordinates as [number, number][] | undefined;
        if (!raw?.length) continue;

        const coords = resampleCoords(raw);
        const geomMeters = routeLengthMeters(coords);
        const distMeters = typeof r?.distance === "number" ? r.distance : geomMeters;

        if (!Number.isFinite(baselineMeters) || baselineMeters === Infinity) {
          baselineMeters = distMeters;
        }

        if (
          isSillyRoute({
            from,
            to,
            routeMeters: distMeters,
            baselineMeters,
            maxDetourRatio: 1.12,
            maxLoopiness: 1.8,
          })
        ) {
          continue;
        }

        if (candidates.some((c) => isNearDuplicateRoute(c.coords, coords))) continue;

        candidates.push(
          await buildVariant(map, coords, {
            distanceMeters: typeof r?.distance === "number" ? r.distance : undefined,
            durationSeconds: typeof r?.duration === "number" ? r.duration : undefined,
            baselineDistanceMeters: baselineMeters,
            navSteps: buildNavSteps(r),
          })
        );
      }

      if (candidates.length < 2) {
        const waypoints = detourWaypointRings(from, to);

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

          for (const detourRoute of detourRoutes.slice(0, 2)) {
            const raw = detourRoute?.geometry?.coordinates as [number, number][] | undefined;
            if (!raw?.length) continue;

            const coords = resampleCoords(raw);
            const geomMeters = routeLengthMeters(coords);
            const distMeters =
              typeof detourRoute?.distance === "number" ? detourRoute.distance : geomMeters;

            if (
              isSillyRoute({
                from,
                to,
                routeMeters: distMeters,
                baselineMeters,
                maxDetourRatio: 1.28,
                maxLoopiness: 2.35,
              })
            ) {
              continue;
            }

            if (candidates.some((c) => isNearDuplicateRoute(c.coords, coords))) continue;

            candidates.push(
              await buildVariant(map, coords, {
                distanceMeters: distMeters,
                durationSeconds:
                  typeof detourRoute?.duration === "number" ? detourRoute.duration : undefined,
                navSteps: buildNavSteps(detourRoute),
              })
            );

            if (candidates.length >= 6) break;
          }

          if (candidates.length >= 6) break;
        }
      }

      if (reqId !== routeReqIdRef.current) return;

      if (candidates.length === 0) {
        const first = baseRoutes[0];
        const raw = first?.geometry?.coordinates as [number, number][] | undefined;
        if (raw?.length) {
          const coords = resampleCoords(raw);
          const geomMeters = routeLengthMeters(coords);
          const distMeters = typeof first?.distance === "number" ? first.distance : geomMeters;

          candidates.push(
            await buildVariant(map, coords, {
              distanceMeters: typeof first?.distance === "number" ? first.distance : undefined,
              durationSeconds: typeof first?.duration === "number" ? first.duration : undefined,
              baselineDistanceMeters: baselineMeters,
              navSteps: buildNavSteps(first),
            })
          );
        }
      }

      if (candidates.length === 0) {
        onRouteFailed?.("We couldn’t generate a route for that selection.");
        return;
      }

      const easySorted = [...candidates].sort((a, b) => a.easyScore - b.easyScore);
      const hardSorted = [...candidates].sort((a, b) => b.hardScore - a.hardScore);

      let easy = easySorted[0];
      let hard = hardSorted[0];

      const distinctFromEasy = pickMostDistinctVariant(easy, hardSorted, "hard");
      if (distinctFromEasy) {
        hard = distinctFromEasy;
      }

      if (isNearDuplicateRoute(easy.coords, hard.coords)) {
        const distinctFromHard = pickMostDistinctVariant(hard, easySorted, "easy");
        if (distinctFromHard) {
          easy = distinctFromHard;
        }
      }

      if (isNearDuplicateRoute(easy.coords, hard.coords) && candidates.length > 1) {
        const longest = [...candidates].sort((a, b) => {
          const aLen = a.distanceMeters ?? routeLengthMeters(a.coords);
          const bLen = b.distanceMeters ?? routeLengthMeters(b.coords);
          return bLen - aLen;
        })[0];

        if (longest && !isNearDuplicateRoute(easy.coords, longest.coords)) {
          hard = longest;
        }
      }

      const MIN_DISTANCE_GAP_METERS = 600;

      const easyDistance = easy.distanceMeters ?? routeLengthMeters(easy.coords);
      const hardDistance = hard.distanceMeters ?? routeLengthMeters(hard.coords);

      if (
        Math.abs(hardDistance - easyDistance) < MIN_DISTANCE_GAP_METERS &&
        hardSorted.length > 1
      ) {
        const longer = [...hardSorted]
          .filter((candidate) => candidate !== easy)
          .sort((a, b) => {
            const aLen = a.distanceMeters ?? routeLengthMeters(a.coords);
            const bLen = b.distanceMeters ?? routeLengthMeters(b.coords);
            return bLen - aLen;
          })[0];

        if (longer && !isNearDuplicateRoute(easy.coords, longer.coords)) {
          hard = longer;
        }
      }

      const MIN_HARD_SCORE_GAP = 20;

      const hardScoreGap = Math.abs(hard.hardScore - easy.easyScore);

      if (
        (Math.abs(hardDistance - easyDistance) < MIN_DISTANCE_GAP_METERS ||
          hardScoreGap < MIN_HARD_SCORE_GAP) &&
        hardSorted.length > 1
      ) {
        const strongestHard = [...hardSorted]
          .filter((candidate) => candidate !== easy)
          .filter((candidate) => !isNearDuplicateRoute(easy.coords, candidate.coords))
          .sort((a, b) => {
            const aDistance = a.distanceMeters ?? routeLengthMeters(a.coords);
            const bDistance = b.distanceMeters ?? routeLengthMeters(b.coords);

            const aStrength = a.hardScore - easy.easyScore + (aDistance - easyDistance) * 0.015;
            const bStrength = b.hardScore - easy.easyScore + (bDistance - easyDistance) * 0.015;

            return bStrength - aStrength;
          })[0];

        if (strongestHard) {
          hard = strongestHard;
        }
      }

      variantsRef.current = { easy, hard };

      console.log("[generateAlternativesBetweenPoints][variants]", {
        candidates: candidates.length,
        easyScore: easy.easyScore,
        hardScore: hard.hardScore,
        easyDistance: easy.distanceMeters ?? routeLengthMeters(easy.coords),
        hardDistance: hard.distanceMeters ?? routeLengthMeters(hard.coords),
        sameRoute: isNearDuplicateRoute(easy.coords, hard.coords),
      });

      const initial = selectedVariant ?? selectedVariantRef.current ?? "easy";
      selectedVariantRef.current = initial;

      const initialVariant = initial === "hard" ? hard : easy;

      renderVariantForZoom(map, initialVariant);
      emitRouteReady(initial, initialVariant, from, to);
      onRouteDrawn?.();
      onVariantsReady?.();
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("generateAlternativesBetweenPoints error:", err);
      onRouteFailed?.("Something went wrong generating the route.");
    } finally {
      setRouteBusy(false, reqId);
    }
  }

  const controlsCssText = useMemo(() => {
    return `
      .hf-map .mapboxgl-ctrl-top-left {
        top: var(--hf-mapbox-top-left-offset, 84px);
        left: 7px;
      }

      .hf-map .mapboxgl-ctrl-group {
        border: 1px solid rgba(255,255,255,0.45);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 24px rgba(0,0,0,0.14);
        background: rgba(255,255,255,0.62);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      .hf-map .mapboxgl-ctrl-group button {
        width: 42px;
        height: 42px;
      }

      .hf-map .mapboxgl-ctrl-group button + button { border-top: 1px solid rgba(0,0,0,0.06); }
      .hf-map .mapboxgl-ctrl-group button:hover { background: rgba(255,255,255,0.85); }
      .hf-map .mapboxgl-ctrl-group button:active { background: rgba(255,255,255,0.92); }

      .hf-map .mapboxgl-ctrl-icon { filter: saturate(0) brightness(0.15); }

      .hf-map .mapboxgl-ctrl-top-left { z-index: 6; }
    `;
  }, []);

  useEffect(() => {
    selectedVariantRef.current = selectedVariant ?? null;
  }, [selectedVariant]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fromLocation) return;
    if (isNavigatingRef.current) return;

    const existing = fromMarkerRef.current?.getLngLat();
    if (
      existing &&
      Math.abs(existing.lng - fromLocation.lng) < 0.00005 &&
      Math.abs(existing.lat - fromLocation.lat) < 0.00005
    ) {
      return;
    }

    const ll = new mapboxgl.LngLat(fromLocation.lng, fromLocation.lat);
    ensureFromMarker(map, ll);
  }, [fromLocation]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && !mapboxgl.accessToken) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;
    const prevBodyOverscroll = (document.body.style as any).overscrollBehavior;
    let watchId: number | null = null;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    (document.body.style as any).overscrollBehavior = "none";

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

    const rerenderForZoom = () => {
      const v = variantsRef.current;
      if (!v) return;

      const nextMode = map.getZoom() < DETAIL_ROUTE_ZOOM_THRESHOLD ? "overview" : "detail";
      if (renderedRouteModeRef.current === nextMode) return;

      const active = (selectedVariantRef.current ?? "easy") === "hard" ? v.hard : v.easy;
      renderVariantForZoom(map, active);
    };

    map.on("zoomend", rerenderForZoom);

    const pauseFollowCamera = () => {
      followCameraPausedUntilRef.current = Date.now() + 10_000;
    };

    map.on("dragstart", pauseFollowCamera);
    map.on("rotatestart", pauseFollowCamera);
    map.on("pitchstart", pauseFollowCamera);

    map.dragPan.enable();
    map.touchZoomRotate.enable();
    map.doubleClickZoom.enable();
    map.scrollZoom.enable();
    map.keyboard.enable();

    const containerEl = map.getContainer();
    const canvasContainerEl = map.getCanvasContainer();

    containerEl.style.touchAction = "none";
    canvasContainerEl.style.touchAction = "none";
    (containerEl.style as any).overscrollBehavior = "none";
    (canvasContainerEl.style as any).overscrollBehavior = "none";

    containerEl.style.setProperty(
      "--hf-mapbox-top-left-offset",
      `${TOP_LEFT_CONTROLS_OFFSET_PX}px`
    );

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

      if (allowed === false) return;

      ensureDestMarker(mapRef.current, lngLat);
      void notifyDestinationPicked(lngLat);
    }

    let lastTapAt = 0;
    map.on("click", (e) => {
      const now = Date.now();
      if (now - lastTapAt < 320) return;
      lastTapAt = now;
      if (!e?.lngLat) return;
      handlePickAt(e.lngLat);
    });

    map.on("load", () => {
      try {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.terrain-rgb",
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1 });
      } catch {}

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;

          const ll = new mapboxgl.LngLat(longitude, latitude);

          latestDeviceLocationRef.current = ll;

          previousDeviceLocationRef.current = ll;

          if (!isNavigatingRef.current) {
            ensureFromMarker(map, ll);

            void notifyFromPicked(ll, { immediateName: "Current location" });
          }

          map.flyTo({ center: [longitude, latitude], zoom: 15, essential: true });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading, speed } = pos.coords;

          const ll = new mapboxgl.LngLat(longitude, latitude);

          latestDeviceLocationRef.current = ll;

          let puckLngLat = ll;
          let snappedRouteBearing: number | null = null;

          const activeRouteCoords = getActiveVariantCoords();

          if (isNavigatingRef.current && activeRouteCoords?.length) {
            const snapped = snapPointToRoute(ll, activeRouteCoords);

            if (snapped.distanceMeters <= 20) {
              puckLngLat = snapped.point;
              snappedRouteBearing = snapped.bearing;
            }
          }

          const effectiveHeading = resolveHeading({
            reportedHeading:
              typeof heading === "number" && Number.isFinite(heading) ? heading : null,

            previous: previousDeviceLocationRef.current,

            current: ll,

            lastResolvedHeading: lastResolvedHeadingRef.current,

            speedMps: typeof speed === "number" && Number.isFinite(speed) ? speed : null,
          });

          console.log("[DashboardMap] gps tick", {
            lat: latitude,
            lng: longitude,
            routeActive: routeActiveRef.current,
            isNavigating: isNavigatingRef.current,
            hasFromMarker: !!fromMarkerRef.current,
            time: Date.now(),
          });

          if (isNavigatingRef.current) {
            const puck = ensureNavigationPuck(map, puckLngLat);
            puck.getElement().style.removeProperty("display");

            const puckEl = puck.getElement() as HTMLDivElement & {
              __setRotation?: (deg: number) => void;
            };

            const targetHeading =
              typeof snappedRouteBearing === "number" && Number.isFinite(snappedRouteBearing)
                ? snappedRouteBearing
                : typeof effectiveHeading === "number" && Number.isFinite(effectiveHeading)
                  ? effectiveHeading
                  : null;

            if (typeof targetHeading === "number" && Number.isFinite(targetHeading)) {
              const prev = smoothedHeadingRef.current ?? targetHeading;

              // simple smoothing (lerp)
              const alpha = 0.2;
              const smoothed = prev + (targetHeading - prev) * alpha;

              smoothedHeadingRef.current = smoothed;

              const relativeHeading = smoothed - map.getBearing();

              puckEl.__setRotation?.(relativeHeading);
            }

            fromMarkerRef.current?.getElement().style.setProperty("display", "none");
          } else {
            // Normal behavior
            ensureFromMarker(map, ll);

            // Make sure it's visible again
            fromMarkerRef.current?.getElement().style.removeProperty("display");

            // Hide puck if it exists
            navigationPuckRef.current?.getElement().style.setProperty("display", "none");
          }

          onNavigationLocationChange?.({ lat: latitude, lng: longitude });

          if (isNavigatingRef.current && Date.now() >= followCameraPausedUntilRef.current) {
            const nextBearing =
              typeof smoothedHeadingRef.current === "number" &&
              Number.isFinite(smoothedHeadingRef.current)
                ? smoothedHeadingRef.current
                : typeof snappedRouteBearing === "number" && Number.isFinite(snappedRouteBearing)
                  ? snappedRouteBearing
                  : typeof effectiveHeading === "number" && Number.isFinite(effectiveHeading)
                    ? effectiveHeading
                    : map.getBearing();

            if (!map.isMoving()) {
              map.easeTo({
                center: [puckLngLat.lng, puckLngLat.lat],
                zoom: Math.max(map.getZoom(), 15),
                bearing: nextBearing,
                pitch: speed && speed > 0.8 ? 45 : map.getPitch(),
                duration: 600,
                essential: true,
              });
            }
          }
          const persistedHeading =
            typeof smoothedHeadingRef.current === "number" &&
            Number.isFinite(smoothedHeadingRef.current)
              ? smoothedHeadingRef.current
              : typeof snappedRouteBearing === "number" && Number.isFinite(snappedRouteBearing)
                ? snappedRouteBearing
                : typeof effectiveHeading === "number" && Number.isFinite(effectiveHeading)
                  ? effectiveHeading
                  : null;

          if (typeof persistedHeading === "number" && Number.isFinite(persistedHeading)) {
            lastResolvedHeadingRef.current = persistedHeading;
          }

          previousDeviceLocationRef.current = ll;
        },
        () => {},
        {
          enableHighAccuracy: true,
          maximumAge: 0,
        }
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
        clearOverviewRoute(map);
        clearRouteLayers(map);
      } catch {}

      try {
        map.off("dragstart", pauseFollowCamera);
        map.off("rotatestart", pauseFollowCamera);
        map.off("pitchstart", pauseFollowCamera);
      } catch {}

      try {
        map.remove();
      } catch {}
      mapRef.current = null;

      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;
      (document.body.style as any).overscrollBehavior = prevBodyOverscroll;

      abortRef.current?.abort();
      setRouteBusy(false);

      try {
        navigationPuckRef.current?.remove();
      } catch {}
      navigationPuckRef.current = null;
    };
  }, [controlsCssText]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    console.log("[destination effect]", {
      hasDestination: !!destination,
      hasVariants: !!variantsRef.current,
    });

    if (!destination) {
      if (variantsRef.current) return;

      try {
        destMarkerRef.current?.remove();
      } catch {}
      destMarkerRef.current = null;

      lastGoodDestRef.current = null;
      clearOverviewRoute(map);
      clearRouteLayers(map);
      sweepRef.current.clear(map);
      renderedRouteModeRef.current = null;

      return;
    }

    const existing = destMarkerRef.current?.getLngLat();
    const changed =
      !existing ||
      Math.abs(existing.lng - destination.lng) > 0.00005 ||
      Math.abs(existing.lat - destination.lat) > 0.00005;

    ensureDestMarker(map, [destination.lng, destination.lat]);

    if (changed) {
      map.flyTo({ center: [destination.lng, destination.lat], zoom: 15, essential: true });
    }
  }, [destination]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!routeRequestNonce) return;

    const from = fromMarkerRef.current?.getLngLat();
    const to = destMarkerRef.current?.getLngLat();
    if (!from || !to) return;

    void drawRouteBetweenPoints(map, from, to);
  }, [routeRequestNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (clearRouteNonce == null) return;
    if (!map) return;

    abortRef.current?.abort();
    routeReqIdRef.current += 1;

    clearOverviewRoute(map);
    clearRouteLayers(map);
    sweepRef.current.clear(map);

    lastGoodDestRef.current = null;
    variantsRef.current = null;
    selectedVariantRef.current = null;
    renderedRouteModeRef.current = null;
    setRouteBusy(false);
    restoreFromToCurrentLocation(map);

    console.log("[clearRouteNonce] clearing route");
  }, [clearRouteNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clearDestinationNonce == null) return;

    abortRef.current?.abort();
    routeReqIdRef.current += 1;

    try {
      destMarkerRef.current?.remove();
    } catch {}
    destMarkerRef.current = null;

    clearOverviewRoute(map);
    clearRouteLayers(map);
    sweepRef.current.clear(map);
    lastGoodDestRef.current = null;
    variantsRef.current = null;
    selectedVariantRef.current = null;
    renderedRouteModeRef.current = null;
    setRouteBusy(false);
    restoreFromToCurrentLocation(map);

    console.log("[clearDestinationNonce] clearing destination");
  }, [clearDestinationNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!recenterNonce) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const ll = new mapboxgl.LngLat(longitude, latitude);
        latestDeviceLocationRef.current = ll;

        if (!isNavigatingRef.current) {
          const existing = fromMarkerRef.current?.getLngLat();

          if (
            !existing ||
            Math.abs(existing.lng - ll.lng) > 0.00005 ||
            Math.abs(existing.lat - ll.lat) > 0.00005
          ) {
            ensureFromMarker(map, ll);
          }
          void notifyFromPicked(ll, { immediateName: "Current location" });
        }

        followCameraPausedUntilRef.current = 0;

        map.easeTo({
          center: [longitude, latitude],
          zoom: Math.max(map.getZoom(), 14),
          duration: 550,
          essential: true,
        });
      },
      () => {
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
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [recenterNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!routeAlternativesNonce) return;

    const from = fromMarkerRef.current?.getLngLat();
    const to = destMarkerRef.current?.getLngLat();
    if (!from || !to) return;

    void generateAlternativesBetweenPoints(map, from, to);
  }, [routeAlternativesNonce]);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;
    if (!findDownhillNonce) return;
    if (lastHandledDownhillNonceRef.current === findDownhillNonce) return;

    lastHandledDownhillNonceRef.current = findDownhillNonce;

    const map: mapboxgl.Map = mapInstance;

    const markerFrom = fromMarkerRef.current?.getLngLat();
    if (!markerFrom) {
      onRouteFailed?.("Need your location first.");
      setRouteBusy(false);
      return;
    }

    const origin: mapboxgl.LngLat = markerFrom;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const reqId = ++routeReqIdRef.current;
    setRouteBusy(true, reqId);

    async function run() {
      try {
        const result = await findDownhillNearby(
          { lat: origin.lat, lng: origin.lng },
          async (
            start: { lat: number; lng: number },
            end: { lat: number; lng: number },
            signal: AbortSignal
          ) => {
            return buildNearbyRoute(new mapboxgl.LngLat(start.lng, start.lat), end, signal);
          },
          controller.signal
        );

        if (reqId !== routeReqIdRef.current) return;

        const to = new mapboxgl.LngLat(result.route.to.lng, result.route.to.lat);

        ensureDestMarker(map, to);
        lastGoodDestRef.current = to;
        onDestinationPicked?.({
          name: result.route.to.name ?? "Nearby Downhill",
          lat: result.route.to.lat,
          lng: result.route.to.lng,
        });

        const variant: Variant = {
          coords: result.route.coords,
          elevations: result.route.elevations ?? [],
          easyScore: result.route.score ?? 0,
          hardScore: result.route.score ?? 0,
          distanceMeters: result.route.distanceMeters,
          durationSeconds: result.route.durationSeconds,
          segments: result.route.segments,
          navSteps: result.route.navSteps ?? [],
        };

        selectedVariantRef.current = "easy";
        variantsRef.current = {
          easy: variant,
          hard: variant,
        };

        renderVariantForZoom(map, variant);
        emitRouteReady("easy", variant, origin, to, {
          fromName: fromLocation?.name ?? "Current location",
          toName: result.route.to.name ?? "Nearby Downhill",
        });

        onVariantSelected?.("easy");
        // onVariantsReady?.();
        onRouteDrawn?.();
        window.dispatchEvent(
          new CustomEvent("hf-toast", {
            detail: {
              message: "Found a downhill near you!",
            },
          })
        );
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("[findDownhillNearby effect]", err);
        onRouteFailed?.("Couldn't find a downhill nearby.");
      } finally {
        setRouteBusy(false, reqId);
      }
    }

    void run();
  }, [
    findDownhillNonce,
    fromLocation,
    onRouteDrawn,
    onRouteFailed,
    onRouteReady,
    onVariantSelected,
    onVariantsReady,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!savedRouteToLoad) return;

    console.log("[savedRouteToLoad effect]", {
      id: savedRouteToLoad._id ?? savedRouteToLoad.name,
      difficulty: savedRouteToLoad.difficulty,
    });

    loadSavedRoute(map, savedRouteToLoad);
  }, [savedRouteToLoad]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectedVariant) return;

    const v = variantsRef.current;
    if (!v) return;

    const active = selectedVariant === "hard" ? v.hard : v.easy;

    renderVariantForZoom(map, active);

    const from = fromMarkerRef.current?.getLngLat();
    const to = destMarkerRef.current?.getLngLat();

    if (from && to) {
      emitRouteReady(selectedVariant, active, from, to);
    }

    if (active.coords.length >= 2) {
      const bounds = new mapboxgl.LngLatBounds();

      active.coords.forEach(([lng, lat]) => {
        bounds.extend([lng, lat]);
      });

      const isHard = selectedVariant === "hard";

      map.fitBounds(bounds, {
        padding: {
          top: isHard ? 110 : 140,
          right: 40,
          bottom: 140,
          left: 40,
        },
        duration: 700,
        curve: 1.4,
        essential: true,
        maxZoom: isHard ? 17 : 16,
      });
    }
    console.log("[selectedVariant effect]", {
      selectedVariant,
      hasVariants: !!variantsRef.current,
    });
  }, [selectedVariant]);

  useEffect(() => {
    routeActiveRef.current = !!routeActive;
  }, [routeActive]);

  useEffect(() => {
    isNavigatingRef.current = !!isNavigating;

    console.log("[DashboardMap] isNavigating prop -> ref", {
      isNavigating,
      refValue: isNavigatingRef.current,
    });

    const map = mapRef.current;
    if (!map) return;

    if (isNavigatingRef.current) {
      const latest = latestDeviceLocationRef.current ?? fromMarkerRef.current?.getLngLat();

      if (latest) {
        const puck = ensureNavigationPuck(map, latest);

        puck.getElement().style.removeProperty("display");

        const puckEl = puck.getElement() as HTMLDivElement & {
          __setRotation?: (deg: number) => void;
        };

        puckEl.__setRotation?.(0);
      }

      fromMarkerRef.current?.getElement().style.setProperty("display", "none");
      return;
    }

    const latest = latestDeviceLocationRef.current;
    if (latest) {
      ensureFromMarker(map, latest);
    }

    fromMarkerRef.current?.getElement().style.removeProperty("display");
    navigationPuckRef.current?.getElement().style.setProperty("display", "none");
  }, [isNavigating]);
  return (
    <div
      ref={mapContainerRef}
      className="hf-map absolute inset-0 h-full w-full bg-[#e5e3df]"
      style={{ touchAction: "pan-x pan-y", overscrollBehavior: "none" as any }}
    />
  );
}
