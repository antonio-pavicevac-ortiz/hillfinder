"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

function classifySegments(elevations: number[], coords: [number, number][]) {
  const segments: {
    coords: [number, number][];
    difficulty: "easy" | "medium" | "hard" | "uphill";
  }[] = [];

  if (elevations.length < 2 || coords.length < 2) return segments;

  const SLOPE_EPSILON = 0.001; // ignore noise
  const EASY_DOWNHILL = -0.003; // ~ -0.3%
  const STEEP_DOWNHILL = -0.01; // ~ -1%

  for (let i = 1; i < elevations.length; i++) {
    const elevationDiff = elevations[i] - elevations[i - 1];

    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];

    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance === 0) continue;

    const slope = elevationDiff / distance;

    let difficulty: "easy" | "medium" | "hard" | "uphill";
    if (Math.abs(slope) < SLOPE_EPSILON) difficulty = "easy";
    else if (slope > SLOPE_EPSILON) difficulty = "uphill";
    else if (slope < STEEP_DOWNHILL) difficulty = "hard";
    else if (slope < EASY_DOWNHILL) difficulty = "medium";
    else difficulty = "easy";

    segments.push({ coords: [coords[i - 1], coords[i]], difficulty });
  }

  return segments;
}

function removeRouteSegments(map: mapboxgl.Map) {
  if (!map.isStyleLoaded()) {
    map.once("idle", () => removeRouteSegments(map));
    return;
  }

  const layers = map.getStyle().layers ?? [];
  layers
    .filter((l) => l.id.startsWith("route-segment-"))
    .forEach((l) => {
      try {
        if (map.getLayer(l.id)) map.removeLayer(l.id);
      } catch {}
      try {
        if (map.getSource(l.id)) map.removeSource(l.id);
      } catch {}
    });
}

function resampleCoords(coords: [number, number][], stepMeters = 15): [number, number][] {
  const result: [number, number][] = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];

    result.push([lng1, lat1]);

    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const steps = Math.floor((distance * 111_000) / stepMeters);
    if (steps < 1) continue;

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      result.push([lng1 + dx * t, lat1 + dy * t]);
    }
  }

  result.push(coords[coords.length - 1]);
  return result;
}

type Destination = {
  lat: number;
  lng: number;
  name?: string;
};

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

    // ✅ When FROM marker moves, redraw route (if we have a destination)
    fromMarker.on("dragend", () => {
      const from = fromMarker.getLngLat();
      const to = destMarkerRef.current?.getLngLat();
      if (!to) return;

      if (mapRef.current) {
        void drawRouteBetweenPoints(mapRef.current, from, to);
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

      destMarkerRef.current.on("dragend", () => {
        const ll = destMarkerRef.current!.getLngLat();
        void notifyDestinationPicked(ll);
        if (mapRef.current && markerRef.current) {
          void drawRouteBetweenPoints(mapRef.current, markerRef.current.getLngLat(), ll);
        }
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
    // Ensure style is ready before touching layers/sources.
    if (!map.isStyleLoaded()) {
      await new Promise<void>((resolve) => map.once("idle", () => resolve()));
    }

    // Clear any prior route layers/sources before drawing the next route.
    removeRouteSegments(map);

    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${from.lng},${from.lat};${to.lng},${to.lat}?alternatives=true&geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes?.length) return;

    const rawCoords = data.routes[0].geometry.coordinates as [number, number][];
    const coords = resampleCoords(rawCoords);

    const elevations = coords.map(([lng, lat]) => {
      const elevation = map.queryTerrainElevation([lng, lat]);
      return typeof elevation === "number" ? elevation : 0;
    });

    const segments = classifySegments(elevations, coords);

    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];

      const color =
        segment.difficulty === "easy"
          ? "#22c55e"
          : segment.difficulty === "medium"
            ? "#eab308"
            : segment.difficulty === "uphill"
              ? "#7f1d1d"
              : "#ef4444";

      const id = `route-segment-${index}`;

      // Defensive: if something left a dangling layer/source, remove it.
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
        },
      });
    }

    onRouteDrawn?.();
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // ✅ iOS Safari: prevent page from grabbing downward swipes
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

    // Force-enable interactions (helps on iOS Safari)
    map.dragPan.enable();
    map.touchZoomRotate.enable();
    map.doubleClickZoom.enable();
    map.scrollZoom.enable();

    // iOS: pinch should zoom (rotation can feel janky / conflict with page gestures)
    map.touchZoomRotate.disableRotation();

    const containerEl = map.getContainer();
    const canvasEl = map.getCanvas();
    const canvasContainerEl = map.getCanvasContainer();

    // Let Mapbox own touch inside the map
    containerEl.style.touchAction = "none";
    canvasContainerEl.style.touchAction = "none";
    canvasEl.style.touchAction = "none";

    // ✅ stop the page from rubber-banding / scrolling on single-finger pans
    function stopPageScroll(e: TouchEvent) {
      if (e.touches.length === 1) e.preventDefault();
    }

    canvasContainerEl.addEventListener("touchmove", stopPageScroll, { passive: false });
    containerEl.addEventListener("touchmove", stopPageScroll, { passive: false });

    function handlePickAt(lngLat: mapboxgl.LngLat) {
      if (!mapRef.current) return;

      // If you NEVER want long-press to create the "from" marker, use:
      // if (!markerRef.current) return;

      if (!markerRef.current) return;

      ensureDestMarker(mapRef.current, lngLat);
      void notifyDestinationPicked(lngLat);

      if (!markerRef.current || !destMarkerRef.current) return;
      void drawRouteBetweenPoints(
        mapRef.current,
        markerRef.current.getLngLat(),
        destMarkerRef.current.getLngLat()
      );
    }

    // ---- LONG PRESS SETUP (removable handlers) ----
    const LONG_PRESS_MS = 650; // 650–1000
    const MOVE_CANCEL_PX = 10;

    let pressTimer: number | null = null;
    let pressStart: { x: number; y: number } | null = null;
    let pressCanceled = false;

    function clearPress() {
      if (pressTimer) window.clearTimeout(pressTimer);
      pressTimer = null;
      pressStart = null;
      pressCanceled = false;
    }

    function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    // IMPORTANT: these are variables so cleanup can remove listeners
    let onTouchStart: (ev: TouchEvent) => void;
    let onTouchMove: (ev: TouchEvent) => void;
    let onTouchEnd: () => void;

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

      // ✅ ONLY long-press creates destination
      onTouchStart = (ev: TouchEvent) => {
        // only 1 finger allowed
        if (ev.touches.length !== 1) {
          pressCanceled = true;
          clearPress();
          return;
        }

        const t = ev.touches[0];
        pressStart = { x: t.clientX, y: t.clientY };
        pressCanceled = false;

        pressTimer = window.setTimeout(() => {
          if (!mapRef.current || !pressStart || pressCanceled) return;

          const rect = canvasContainerEl.getBoundingClientRect();
          const point = new mapboxgl.Point(pressStart.x - rect.left, pressStart.y - rect.top);
          const lngLat = mapRef.current.unproject(point);

          handlePickAt(lngLat);
        }, LONG_PRESS_MS);
      };

      onTouchMove = (ev: TouchEvent) => {
        if (!pressStart) return;

        // second finger = pinch => cancel
        if (ev.touches.length !== 1) {
          pressCanceled = true;
          clearPress();
          return;
        }

        const t = ev.touches[0];
        const now = { x: t.clientX, y: t.clientY };
        if (dist(pressStart, now) > MOVE_CANCEL_PX) {
          pressCanceled = true;
          clearPress();
        }
      };

      onTouchEnd = () => {
        clearPress();
      };

      // attach to canvas container (best for iOS)
      canvasContainerEl.addEventListener("touchstart", onTouchStart, { passive: true });
      canvasContainerEl.addEventListener("touchmove", onTouchMove, { passive: true });
      canvasContainerEl.addEventListener("touchend", onTouchEnd, { passive: true });
      canvasContainerEl.addEventListener("touchcancel", onTouchEnd, { passive: true });
    });

    return () => {
      // remove rubber-band blockers
      canvasContainerEl.removeEventListener("touchmove", stopPageScroll);
      containerEl.removeEventListener("touchmove", stopPageScroll);

      // remove long-press listeners (safe even if load never ran)
      if (onTouchStart) canvasContainerEl.removeEventListener("touchstart", onTouchStart);
      if (onTouchMove) canvasContainerEl.removeEventListener("touchmove", onTouchMove);
      if (onTouchEnd) {
        canvasContainerEl.removeEventListener("touchend", onTouchEnd);
        canvasContainerEl.removeEventListener("touchcancel", onTouchEnd);
      }

      map.remove();
      mapRef.current = null;

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !destination) return;

    const map = mapRef.current;
    const dest = ensureDestMarker(map, [destination.lng, destination.lat]);

    map.flyTo({ center: [destination.lng, destination.lat], zoom: 15 });

    if (!markerRef.current) return;
    void drawRouteBetweenPoints(map, markerRef.current.getLngLat(), dest.getLngLat());
  }, [destination]);

  useEffect(() => {
    if (clearRouteNonce == null) return;

    const map = mapRef.current;
    if (!map) return;

    removeRouteSegments(map);
  }, [clearRouteNonce]);

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0 w-full h-full bg-[#e5e3df] outline outline-2 outline-red-500"
      style={{ touchAction: "none" }}
    />
  );
}
