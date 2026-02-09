"use client";

import { classifySegments } from "@/lib/map/classifySegments";
import { clearRouteLayers } from "@/lib/map/clearRouteLayers";
import { resampleCoords } from "@/lib/map/resampleCoords";
import { createTerrainElevationGetter, type TileKey } from "@/lib/map/terrainReady";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
} else if (!mapboxgl.accessToken) {
  console.warn("[DashboardMap] Missing NEXT_PUBLIC_MAPBOX_TOKEN — Mapbox may not initialize");
}

type Destination = { lat: number; lng: number; name?: string };

export default function DashboardMap({
  destination,
  clearRouteNonce,
  onRouteDrawn,
  onDestinationPicked,
}: {
  destination: Destination | null;
  clearRouteNonce?: number;
  onRouteDrawn?: () => void;
  onDestinationPicked?: (loc: { name: string; lat: number; lng: number }) => void;
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

  function ensureFromMarker(map: mapboxgl.Map, lngLat: mapboxgl.LngLatLike) {
    if (markerRef.current) return markerRef.current;

    const el = createCircleEl("#16a34a");
    const fromMarker = new mapboxgl.Marker({
      element: el,
      draggable: true,
      anchor: "center",
    })
      .setLngLat(lngLat)
      .addTo(map);

    (fromMarker.getElement() as HTMLElement).style.touchAction = "none";

    // When FROM marker moves, redraw route (if destination exists)
    fromMarker.on("dragend", () => {
      const from = fromMarker.getLngLat();
      const to = destMarkerRef.current?.getLngLat();
      if (!to) return;
      if (!mapRef.current) return;

      void drawRouteBetweenPoints(mapRef.current, from, to);
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

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${from.lng},${from.lat};${to.lng},${to.lat}?alternatives=true&geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();

      if (reqId !== routeReqIdRef.current) return;

      // If Mapbox returns no route, keep old route and optionally snap marker back
      if (!data?.routes?.length) {
        const fallback = lastGoodDestRef.current;
        if (fallback && destMarkerRef.current) {
          destMarkerRef.current.setLngLat(fallback);
          void notifyDestinationPicked(fallback);
        }
        return;
      }

      // Safe: clear + redraw
      clearRouteLayers(map);

      const rawCoords = data.routes[0].geometry.coordinates as [number, number][];
      const coords = resampleCoords(rawCoords);

      const getElevation = getElevationRef.current;
      const elevations = await Promise.all(
        coords.map(([lng, lat]) =>
          getElevation ? getElevation(map, lng, lat) : Promise.resolve(0)
        )
      );

      const segments = classifySegments(elevations, coords);

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

        // defensive (in case something was left behind)
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
          paint: {
            "line-color": color,
            "line-width": 5,
            "line-opacity": 0.9,
            "line-cap": "round",
            "line-join": "round",
          },
        } as any);
      });

      // route succeeded -> remember this destination as last-good
      lastGoodDestRef.current = new mapboxgl.LngLat(to.lng, to.lat);

      if (segments.length > 0) onRouteDrawn?.();
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

    mapRef.current = map;

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
          ensureFromMarker(map, [longitude, latitude]);
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

      map.remove();
      mapRef.current = null;

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;

      abortRef.current?.abort();
    };
  }, []);

  // When parent picks a destination, mirror marker + draw route
  useEffect(() => {
    if (!mapRef.current || !destination) return;
    const map = mapRef.current;

    const dest = ensureDestMarker(map, [destination.lng, destination.lat]);
    map.flyTo({ center: [destination.lng, destination.lat], zoom: 15 });

    if (!markerRef.current) return;
    void drawRouteBetweenPoints(map, markerRef.current.getLngLat(), dest.getLngLat());
  }, [destination]);

  // Clear route when parent bumps the nonce
  useEffect(() => {
    if (clearRouteNonce == null) return;
    if (!mapRef.current) return;

    clearRouteLayers(mapRef.current);
    lastGoodDestRef.current = null;
  }, [clearRouteNonce]);

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0 w-full h-full bg-[#e5e3df]"
      style={{ touchAction: "none" }}
    />
  );
}
