"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
} else {
  console.warn("[DashboardMap] Missing NEXT_PUBLIC_MAPBOX_TOKEN — Mapbox will not initialize");
}

type Difficulty = "easy" | "medium" | "hard" | "uphill";

function classifySegments(elevations: number[], coords: [number, number][]) {
  const segments: { coords: [number, number][]; difficulty: Difficulty }[] = [];
  if (elevations.length < 2 || coords.length < 2) return segments;

  const SLOPE_EPSILON = 0.001;
  const EASY_DOWNHILL = -0.003;
  const STEEP_DOWNHILL = -0.01;

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

    let difficulty: Difficulty;
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

/**
 * ================================
 * Option C: iOS Safari-proof elevation
 * - Use queryTerrainElevation when it works
 * - Fallback to decoding mapbox.terrain-rgb tiles
 * - Cache decoded tiles (big speedup)
 * ================================
 */

const DEM_TILESET = "mapbox.terrain-rgb";
const ELEV_ZOOM = 14; // matches your DEM maxzoom=14

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lngLatToTile(lng: number, lat: number, z: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1), z };
}

function tilePixelXY(lng: number, lat: number, z: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** z;

  const xFloat = ((lng + 180) / 360) * n;
  const yFloat = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const xTile = Math.floor(xFloat);
  const yTile = Math.floor(yFloat);

  const xFrac = xFloat - xTile;
  const yFrac = yFloat - yTile;

  const px = clamp(Math.floor(xFrac * 256), 0, 255);
  const py = clamp(Math.floor(yFrac * 256), 0, 255);

  return { xTile: clamp(xTile, 0, n - 1), yTile: clamp(yTile, 0, n - 1), px, py };
}

function decodeTerrainRgb(r: number, g: number, b: number) {
  // Mapbox Terrain-RGB: elevation(m) = -10000 + (R*256*256 + G*256 + B) * 0.1
  return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
}

type TileKey = string;

async function decodeTileToRGBA(url: string): Promise<Uint8ClampedArray> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Terrain tile fetch failed: ${res.status}`);
  const blob = await res.blob();

  const bitmap = await createImageBitmap(blob);
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(256, 256)
      : (document.createElement("canvas") as HTMLCanvasElement);

  // @ts-ignore - for HTMLCanvasElement path
  canvas.width = 256;
  // @ts-ignore
  canvas.height = 256;

  // @ts-ignore
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No 2D context for terrain decode");

  // @ts-ignore
  ctx.drawImage(bitmap, 0, 0, 256, 256);
  // @ts-ignore
  const img = ctx.getImageData(0, 0, 256, 256);
  return img.data; // RGBA array
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

    fromMarker.on("dragend", () => {
      const from = fromMarker.getLngLat();
      const to = destMarkerRef.current?.getLngLat();
      if (!to) return;
      if (mapRef.current) void drawRouteBetweenPoints(mapRef.current, from, to);
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

  function getTileUrl(z: number, x: number, y: number) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || mapboxgl.accessToken;
    // v4 terrain-rgb tiles
    return `https://api.mapbox.com/v4/${DEM_TILESET}/${z}/${x}/${y}.pngraw?access_token=${token}`;
  }

  async function getElevationTerrainRgb(lng: number, lat: number): Promise<number | null> {
    try {
      const { xTile, yTile, px, py } = tilePixelXY(lng, lat, ELEV_ZOOM);
      const key = `${ELEV_ZOOM}/${xTile}/${yTile}`;
      const url = getTileUrl(ELEV_ZOOM, xTile, yTile);

      let p = tileCacheRef.current.get(key);
      if (!p) {
        p = decodeTileToRGBA(url);
        tileCacheRef.current.set(key, p);
      }

      const rgba = await p;
      const idx = (py * 256 + px) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];

      const elev = decodeTerrainRgb(r, g, b);
      return Number.isFinite(elev) ? elev : null;
    } catch {
      return null;
    }
  }

  async function getElevation(map: mapboxgl.Map, lng: number, lat: number): Promise<number> {
    // First try Mapbox GL’s built-in terrain query
    const e = map.queryTerrainElevation([lng, lat]);
    if (typeof e === "number" && Number.isFinite(e)) return e;

    // Fallback: decode from terrain-rgb tiles (Safari iOS reliability)
    const fallback = await getElevationTerrainRgb(lng, lat);
    return typeof fallback === "number" && Number.isFinite(fallback) ? fallback : 0;
  }

  async function drawRouteBetweenPoints(
    map: mapboxgl.Map,
    from: mapboxgl.LngLat,
    to: mapboxgl.LngLat
  ) {
    if (!map.isStyleLoaded()) {
      await new Promise<void>((resolve) => map.once("load", () => resolve()));
    }

    removeRouteSegments(map);

    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${from.lng},${from.lat};${to.lng},${to.lat}?alternatives=true&geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.length) return;

    const rawCoords = data.routes[0].geometry.coordinates as [number, number][];
    const coords = resampleCoords(rawCoords);

    // ✅ async elevations (works in Safari iOS because we can fallback)
    const elevations = await Promise.all(coords.map(([lng, lat]) => getElevation(map, lng, lat)));

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
    }

    if (segments.length > 0) onRouteDrawn?.();
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) return;

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

    function handlePickAt(lngLat: mapboxgl.LngLat) {
      if (!mapRef.current) return;
      if (!markerRef.current) return;

      ensureDestMarker(mapRef.current, lngLat);
      void notifyDestinationPicked(lngLat);

      if (!destMarkerRef.current) return;
      void drawRouteBetweenPoints(
        mapRef.current,
        markerRef.current.getLngLat(),
        destMarkerRef.current.getLngLat()
      );
    }

    const onMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (!markerRef.current) return;
      handlePickAt(e.lngLat);
    };

    map.on("click", onMapClick);

    map.on("load", () => {
      // Keep your terrain visuals (not required for fallback, but nice)
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
    });

    return () => {
      map.off("click", onMapClick);
      canvasContainerEl.removeEventListener("touchmove", stopPageScroll);
      containerEl.removeEventListener("touchmove", stopPageScroll);

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
      className="absolute inset-0 w-full h-full bg-[#e5e3df]"
      style={{ touchAction: "none" }}
    />
  );
}
