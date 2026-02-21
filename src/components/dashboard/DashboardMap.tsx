"use client";

import { classifySegments } from "@/lib/map/classifySegments";
import { clearRouteLayers } from "@/lib/map/clearRouteLayers";
import { resampleCoords } from "@/lib/map/resampleCoords";
import { computeRouteStats, scoreEasy } from "@/lib/map/routeDifficulty";
import { createRouteSweepController } from "@/lib/map/routeSweep";
import { createTerrainElevationGetter, type TileKey } from "@/lib/map/terrainReady";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
} else if (!mapboxgl.accessToken) {
  console.warn("[DashboardMap] Missing NEXT_PUBLIC_MAPBOX_TOKEN — Mapbox may not initialize");
}

type FromLocation = {
  lat: number;
  lng: number;
  name?: string;
};
type Destination = { lat: number; lng: number; name?: string };

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
}: {
  destination: Destination | null;
  clearRouteNonce?: number;
  onRouteDrawn?: () => void;
  onDestinationPicked?: (loc: { name: string; lat: number; lng: number }) => void;
  routeRequestNonce?: number;
  routeActive?: boolean;
  onFromPicked?: (loc: { name: string; lat: number; lng: number }) => void;
  fromLocation?: { lat: number; lng: number } | null;
  recenterNonce?: number;
  routeAlternativesNonce?: number;
  selectedVariant?: "easy" | "hard" | null;
  onVariantsReady?: () => void;
  onVariantSelected?: (v: "easy" | "hard") => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
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
  type Variant = {
    coords: [number, number][];
    elevations: number[];
    score: number;
  };

  const variantsRef = useRef<{ easy: Variant; hard: Variant } | null>(null);

  const sweepRef = useRef<ReturnType<typeof createRouteSweepController>>(
    createRouteSweepController()
  );
  function createCircleEl(color: string) {
    const el = document.createElement("div");
    el.style.width = "32px";
    el.style.height = "32px";
    el.style.backgroundColor = color;
    el.style.borderRadius = "50%";
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
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

    // ✅ Immediately set something so Dashboard state isn't null while reverse-geocoding.
    const immediateName = opts?.immediateName;
    if (immediateName) {
      onFromPicked({ name: immediateName, lat: lngLat.lat, lng: lngLat.lng });
    }

    // Then refine with a real place name (best-effort)
    const name = await reverseGeocodeName(lngLat.lng, lngLat.lat);
    onFromPicked({ name, lat: lngLat.lat, lng: lngLat.lng });
  }

  function ensureFromMarker(map: mapboxgl.Map, lngLat: mapboxgl.LngLatLike) {
    if (markerRef.current) {
      // ✅ keep marker in sync when parent updates fromLocation
      markerRef.current.setLngLat(lngLat);
      return markerRef.current;
    }

    const el = createCircleEl("#16a34a");
    const fromMarker = new mapboxgl.Marker({
      element: el,
      draggable: true,
      anchor: "center",
    })
      .setLngLat(lngLat)
      .addTo(map);

    (fromMarker.getElement() as HTMLElement).style.touchAction = "none";

    // When FROM marker moves:
    // - always update parent label
    // - only redraw the *real* route if a route is already active
    // - otherwise, keep this as "exploration" and only update the preview line (if present)
    fromMarker.on("dragend", () => {
      const from = fromMarker.getLngLat();
      void notifyFromPicked(from);

      const to = destMarkerRef.current?.getLngLat();
      const map = mapRef.current;
      if (!to || !map) return;

      // ✅ If a route is already active, keep the alternatives in sync.
      if (routeActive) {
        void generateAlternativesBetweenPoints(map, from, to);
      }
    });

    markerRef.current = fromMarker;
    return fromMarker;
  }

  function ensureDestMarker(map: mapboxgl.Map, lngLat: mapboxgl.LngLatLike) {
    if (!destMarkerRef.current) {
      const el = createCircleEl("#2563eb");
      destMarkerRef.current = new mapboxgl.Marker({
        element: el,
        draggable: true,
        anchor: "center",
      })
        .setLngLat(lngLat)
        .addTo(map);

      (destMarkerRef.current.getElement() as HTMLElement).style.touchAction = "none";

      // When DEST marker moves, notify parent (route drawing happens in [destination] effect)
      destMarkerRef.current.on("dragend", () => {
        const ll = destMarkerRef.current!.getLngLat();
        void notifyDestinationPicked(ll);
      });

      return destMarkerRef.current;
    }

    destMarkerRef.current.setLngLat(lngLat);
    return destMarkerRef.current;
  }

  async function drawRouteBetweenPoints(
    map: mapboxgl.Map,
    from: mapboxgl.LngLat,
    to: mapboxgl.LngLat
  ) {
    if (!map.isStyleLoaded()) {
      await new Promise<void>((resolve) => map.once("load", () => resolve()));
    }

    // cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const reqId = ++routeReqIdRef.current;

    const drawSegmented = async (coords: [number, number][]) => {
      const getElevation = getElevationRef.current;
      const elevations = await Promise.all(
        coords.map(([lng, lat]) =>
          getElevation ? getElevation(map, lng, lat) : Promise.resolve(0)
        )
      );

      const segments = classifySegments(elevations, coords);

      // Safe: clear + redraw
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
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": color,
            "line-width": 5,
            "line-opacity": 0.9,
          },
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
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${from.lng},${from.lat};${to.lng},${to.lat}?alternatives=true&geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

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
    }
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
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": color,
          "line-width": 5,
          "line-opacity": 0.9,
        },
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

  async function buildVariant(map: mapboxgl.Map, coords: [number, number][]) {
    const getElevation = getElevationRef.current;
    const elevations = await Promise.all(
      coords.map(([lng, lat]) => (getElevation ? getElevation(map, lng, lat) : Promise.resolve(0)))
    );

    const stats = computeRouteStats(elevations);
    const score = scoreEasy(stats); // ✅ easy = lowest, hard = highest

    return { coords, elevations, score } as Variant;
  }

  // --- helpers for "always two routes" ---

  function metersToDegreesLat(m: number) {
    // ~111,320m per degree latitude
    return m / 111_320;
  }

  function metersToDegreesLng(m: number, atLat: number) {
    // degrees longitude shrink by cos(latitude)
    const cos = Math.cos((atLat * Math.PI) / 180);
    return m / (111_320 * Math.max(0.2, cos)); // clamp to avoid exploding near poles
  }

  function midpoint(a: mapboxgl.LngLat, b: mapboxgl.LngLat) {
    return new mapboxgl.LngLat((a.lng + b.lng) / 2, (a.lat + b.lat) / 2);
  }

  function detourWaypoints(mid: mapboxgl.LngLat, meters: number) {
    const dLat = metersToDegreesLat(meters);
    const dLng = metersToDegreesLng(meters, mid.lat);

    // 8-way detours around midpoint
    const pts: mapboxgl.LngLat[] = [
      new mapboxgl.LngLat(mid.lng + dLng, mid.lat), // E
      new mapboxgl.LngLat(mid.lng - dLng, mid.lat), // W
      new mapboxgl.LngLat(mid.lng, mid.lat + dLat), // N
      new mapboxgl.LngLat(mid.lng, mid.lat - dLat), // S
      new mapboxgl.LngLat(mid.lng + dLng, mid.lat + dLat), // NE
      new mapboxgl.LngLat(mid.lng + dLng, mid.lat - dLat), // SE
      new mapboxgl.LngLat(mid.lng - dLng, mid.lat + dLat), // NW
      new mapboxgl.LngLat(mid.lng - dLng, mid.lat - dLat), // SW
    ];

    return pts;
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
      `?alternatives=true&geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

    const res = await fetch(url, { signal });
    const data = await res.json();
    return data;
  }

  // --- replace generateAlternativesBetweenPoints with this ---

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

    try {
      // 1) First try normal alternatives
      const baseData = await fetchDirectionsRoute({
        from,
        to,
        signal: controller.signal,
      });

      if (reqId !== routeReqIdRef.current) return;

      const baseRoutes: any[] = Array.isArray(baseData?.routes) ? baseData.routes : [];
      const candidates: Variant[] = [];

      // Build candidates from base routes (up to 3)
      for (const r of baseRoutes.slice(0, 3)) {
        const raw = r?.geometry?.coordinates as [number, number][] | undefined;
        if (!raw?.length) continue;
        const coords = resampleCoords(raw);
        candidates.push(await buildVariant(map, coords));
      }

      // 2) Fallback: if we didn't get enough unique candidates, generate detour candidates
      if (candidates.length < 2) {
        const mid = midpoint(from, to);

        // distance-based detour size (bigger trip => bigger detour), clamped
        // walking: 250m–900m tends to create meaningful alternates without going crazy
        const approxMeters = Math.max(250, Math.min(900, (from.distanceTo(to) ?? 1500) * 0.12));

        const waypoints = detourWaypoints(mid, approxMeters);

        // Try a handful; stop early once we have enough
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

          // Use the best route from this detour call (index 0)
          const raw = detourRoutes[0]?.geometry?.coordinates as [number, number][] | undefined;
          if (!raw?.length) continue;

          const coords = resampleCoords(raw);

          // crude dedupe: avoid adding if the first coord sequence length is nearly identical
          // (keeps us from picking the same path repeatedly)
          const maybe = await buildVariant(map, coords);
          const isNearDup = candidates.some(
            (c) => Math.abs(c.coords.length - maybe.coords.length) < 6
          );
          if (!isNearDup) candidates.push(maybe);

          if (candidates.length >= 4) break; // plenty for min/max
        }
      }

      if (reqId !== routeReqIdRef.current) return;
      if (candidates.length === 0) return;

      // 3) Pick easy/hard by score
      let easy = candidates[0];
      let hard = candidates[0];

      for (const v of candidates) {
        if (v.score < easy.score) easy = v;
        if (v.score > hard.score) hard = v;
      }

      // If we *still* only have 1 candidate, force both to same (UI still works),
      // but ideally candidates.length >= 2 now.
      variantsRef.current = { easy, hard };
      onVariantsReady?.();

      // Helpful debug
      console.log("ROUTES RETURNED:", baseRoutes.length);
      console.log(
        "CANDIDATES BUILT:",
        candidates.length,
        candidates.map((c) => c.coords.length)
      );

      const initial = selectedVariant ?? "easy";
      drawVariantRoute(map, initial === "hard" ? hard : easy);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("generateAlternativesBetweenPoints error:", err);
    }
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && !mapboxgl.accessToken) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-73.761, 40.715],
      zoom: 13,
      clickTolerance: 8,
    });

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true,
    });

    map.addControl(geolocate, "top-right");

    mapRef.current = map;
    // ✅ Seed a temporary FROM marker/state immediately so UI doesn't think "From" is missing.
    // We'll replace it with the real geolocation position once available.
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

    // Force-enable interactions (helps on iOS Safari)
    map.dragPan.enable();
    map.touchZoomRotate.enable();
    map.doubleClickZoom.enable();
    map.scrollZoom.enable();

    // iOS: pinch should zoom; rotation can fight gestures
    map.touchZoomRotate.disableRotation();

    const containerEl = map.getContainer();
    const canvasContainerEl = map.getCanvasContainer();

    containerEl.style.touchAction = "none";
    canvasContainerEl.style.touchAction = "none";

    function stopPageScroll(e: TouchEvent) {
      if (e.touches.length === 1) e.preventDefault();
    }

    canvasContainerEl.addEventListener("touchmove", stopPageScroll, { passive: false });
    containerEl.addEventListener("touchmove", stopPageScroll, { passive: false });

    let lastTouchTapAt = 0;

    function handlePickAt(lngLat: mapboxgl.LngLat) {
      if (!mapRef.current) return;
      ensureDestMarker(mapRef.current, lngLat);
      void notifyDestinationPicked(lngLat);
    }

    map.on("click", (e) => {
      if (Date.now() - lastTouchTapAt < 450) return;
      if (!e?.lngLat) return;
      handlePickAt(e.lngLat);
    });

    const TAP_MAX_MS = 260;
    const MOVE_CANCEL_PX = 10;

    let tapStartAt = 0;
    let tapStart: { x: number; y: number } | null = null;
    let canceled = false;
    let touchStartedOnMarker = false;

    function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function onTouchStart(ev: TouchEvent) {
      if (ev.touches.length !== 1) {
        canceled = true;
        tapStart = null;
        return;
      }

      const target = ev.target as HTMLElement | null;
      touchStartedOnMarker = !!target?.closest?.(".mapboxgl-marker");

      if (touchStartedOnMarker) {
        canceled = true;
        tapStart = null;
        return;
      }

      const t = ev.touches[0];
      tapStartAt = Date.now();
      tapStart = { x: t.clientX, y: t.clientY };
      canceled = false;
    }

    function onTouchMove(ev: TouchEvent) {
      if (!tapStart) return;

      if (ev.touches.length !== 1) {
        canceled = true;
        tapStart = null;
        return;
      }

      const t = ev.touches[0];
      const now = { x: t.clientX, y: t.clientY };
      if (dist(tapStart, now) > MOVE_CANCEL_PX) {
        canceled = true;
        tapStart = null;
      }
    }

    function onTouchEnd(ev: TouchEvent) {
      const startedOnMarker = touchStartedOnMarker;
      touchStartedOnMarker = false;

      if (startedOnMarker) {
        tapStart = null;
        return;
      }

      if (!tapStart || canceled) {
        tapStart = null;
        return;
      }

      const elapsed = Date.now() - tapStartAt;
      if (elapsed > TAP_MAX_MS) {
        tapStart = null;
        return;
      }

      const t = ev.changedTouches[0];
      const rect = canvasContainerEl.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;

      const lngLat = map.unproject([x, y]);

      lastTouchTapAt = Date.now();
      handlePickAt(lngLat);

      tapStart = null;
    }

    map.on("load", () => {
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.terrain-rgb",
        tileSize: 512,
        maxzoom: 14,
      });

      map.setTerrain({ source: "mapbox-dem", exaggeration: 1 });

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const ll = new mapboxgl.LngLat(longitude, latitude);
          ensureFromMarker(map, ll);
          void notifyFromPicked(ll, { immediateName: "Current location" });
          map.flyTo({ center: [longitude, latitude], zoom: 15 });
        },
        () => {}
      );

      canvasContainerEl.addEventListener("touchstart", onTouchStart, { passive: true });
      canvasContainerEl.addEventListener("touchmove", onTouchMove, { passive: true });
      canvasContainerEl.addEventListener("touchend", onTouchEnd, { passive: true });
      canvasContainerEl.addEventListener("touchcancel", onTouchEnd, { passive: true });
    });

    return () => {
      canvasContainerEl.removeEventListener("touchmove", stopPageScroll);
      containerEl.removeEventListener("touchmove", stopPageScroll);

      canvasContainerEl.removeEventListener("touchstart", onTouchStart);
      canvasContainerEl.removeEventListener("touchmove", onTouchMove);
      canvasContainerEl.removeEventListener("touchend", onTouchEnd);
      canvasContainerEl.removeEventListener("touchcancel", onTouchEnd);

      try {
        markerRef.current?.remove();
      } catch {}
      try {
        destMarkerRef.current?.remove();
      } catch {}
      markerRef.current = null;
      destMarkerRef.current = null;

      try {
        sweepRef.current.destroy(map);
      } catch {}

      map.remove();
      mapRef.current = null;

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;

      abortRef.current?.abort();
    };
  }, []);

  // When parent picks a destination, mirror marker + fly to it, but DO NOT draw route automatically
  useEffect(() => {
    if (!mapRef.current || !destination) return;
    const map = mapRef.current;

    ensureDestMarker(map, [destination.lng, destination.lat]);
    map.flyTo({ center: [destination.lng, destination.lat], zoom: 15 });
  }, [destination]);

  // Draw route only when routeRequestNonce changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (!routeRequestNonce) return;

    const map = mapRef.current;
    const from = markerRef.current?.getLngLat();
    const to = destMarkerRef.current?.getLngLat();
    if (!from || !to) return;

    void drawRouteBetweenPoints(map, from, to);
  }, [routeRequestNonce]);

  // Clear route when parent bumps the nonce
  useEffect(() => {
    if (clearRouteNonce == null) return;
    if (!mapRef.current) return;

    clearRouteLayers(mapRef.current);
    sweepRef.current.clear(mapRef.current);
    const map = mapRef.current;

    lastGoodDestRef.current = null;
    variantsRef.current = null;
  }, [clearRouteNonce]);

  useEffect(() => {
    if (!recenterNonce) return;
    if (!fromLocation) return;

    const map = mapRef.current; // ✅ use your real map ref
    if (!map) return;

    const targetZoom = Math.max(map.getZoom(), 14);

    map.flyTo({
      center: [fromLocation.lng, fromLocation.lat],
      zoom: targetZoom,
      speed: 1.2,
      curve: 1.42,
      essential: true,
    });
  }, [recenterNonce, fromLocation]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!routeAlternativesNonce) return;

    const map = mapRef.current;
    const from = markerRef.current?.getLngLat();
    const to = destMarkerRef.current?.getLngLat();
    if (!from || !to) return;

    void generateAlternativesBetweenPoints(map, from, to);
  }, [routeAlternativesNonce]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!selectedVariant) return;

    const v = variantsRef.current;
    if (!v) return;

    drawVariantRoute(mapRef.current, selectedVariant === "hard" ? v.hard : v.easy);
  }, [selectedVariant]);

  // ✅ Keep the FROM marker synced with parent state (and create it if needed)
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
      className="absolute inset-0 w-full h-full bg-[#e5e3df]"
      style={{ touchAction: "none" }}
    />
  );
}
