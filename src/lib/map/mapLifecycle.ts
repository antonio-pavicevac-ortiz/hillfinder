// src/lib/map/mapLifecycle.ts
import mapboxgl from "mapbox-gl";

type InitializeMapOptions = {
  accessToken?: string; // optional override
  style?: string;
  center?: [number, number];
  zoom?: number;
};

function ensureAccessToken(explicit?: string) {
  const token = explicit ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? mapboxgl.accessToken ?? "";

  if (token) {
    mapboxgl.accessToken = token;
    return token;
  }

  return null;
}

export function initializeMap(
  container: HTMLElement,
  opts: InitializeMapOptions = {}
): mapboxgl.Map {
  const token = ensureAccessToken(opts.accessToken);

  if (!token) {
    // Don’t crash with a mysterious Mapbox error — throw a clear one.
    throw new Error(
      "Missing Mapbox token. Set NEXT_PUBLIC_MAPBOX_TOKEN (client-side) and restart/redeploy."
    );
  }

  const map = new mapboxgl.Map({
    container,
    style: opts.style ?? "mapbox://styles/mapbox/outdoors-v12",
    center: opts.center ?? [-73.761, 40.715],
    zoom: opts.zoom ?? 13,
    clickTolerance: 8,
  });

  // Gesture defaults (safe)
  map.dragPan.enable();
  map.touchZoomRotate.enable();
  map.touchZoomRotate.disableRotation();
  map.doubleClickZoom.enable();
  map.scrollZoom.enable();
  map.keyboard.enable();

  // Help iOS/Safari
  const el = map.getContainer();
  el.style.touchAction = "none";
  (el.style as any).overscrollBehavior = "none";

  return map;
}
