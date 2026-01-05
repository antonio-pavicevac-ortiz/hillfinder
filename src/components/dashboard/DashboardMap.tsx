"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// TODO: Will be reintroduced for skill-level routing (Beginner / Intermediate / Advanced)
// function classifyDifficulty(elevations: number[], coords: [number, number][]) {
//   if (elevations.length < 2 || coords.length < 2) return "easy";

//   let totalDrop = 0;
//   let totalDistance = 0;

//   for (let i = 1; i < elevations.length; i++) {
//     const elevationDiff = elevations[i - 1] - elevations[i];
//     if (elevationDiff > 0) {
//       totalDrop += elevationDiff;
//     }

//     const [lng1, lat1] = coords[i - 1];
//     const [lng2, lat2] = coords[i];

//     // Horizontal distance in meters (Haversine)
//     const R = 6371000; // Earth radius (m)

//     const dLat = (lat2 - lat1) * (Math.PI / 180);
//     const dLng = (lng2 - lng1) * (Math.PI / 180);

//     const a =
//       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//       Math.cos((lat1 * Math.PI) / 180) *
//         Math.cos((lat2 * Math.PI) / 180) *
//         Math.sin(dLng / 2) *
//         Math.sin(dLng / 2);

//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     const distance = R * c;

//     totalDistance += distance;
//   }

//   if (totalDistance === 0) return "easy";

//   const intensity = totalDrop / totalDistance;

//   if (intensity < 5) return "easy";
//   if (intensity < 15) return "medium";
//   return "hard";
// }

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

    const slope = elevationDiff / distance; // signed

    let difficulty: "easy" | "medium" | "hard" | "uphill";
    // 🟢 Flat or noise
    if (Math.abs(slope) < SLOPE_EPSILON) {
      difficulty = "easy";
    }
    // 🟣 Uphill (bad for Hillfinder)
    else if (slope > SLOPE_EPSILON) {
      difficulty = "uphill";
    }
    // 🔴 Too steep downhill (fast / sketchy)
    else if (slope < STEEP_DOWNHILL) {
      difficulty = "hard";
    }
    // 🟡 Good downhill
    else if (slope < EASY_DOWNHILL) {
      difficulty = "medium";
    }
    // 🟢 Gentle downhill
    else {
      difficulty = "easy";
    }

    segments.push({
      coords: [coords[i - 1], coords[i]],
      difficulty,
    });
  }

  return segments;
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
  onRouteDrawn,
  onDestinationPicked,
}: {
  destination: Destination | null;
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
    markerRef.current = new mapboxgl.Marker({ element: el, draggable: true, anchor: "center" })
      .setLngLat(lngLat)
      .addTo(map);
    return markerRef.current;
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

      // Notify Dashboard when user drags the TO pin
      destMarkerRef.current.on("dragend", () => {
        const ll = destMarkerRef.current!.getLngLat();
        void notifyDestinationPicked(ll);

        // If we have a FROM marker, redraw the route with the new destination
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
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes?.length) return;

    const rawCoords = data.routes[0].geometry.coordinates;
    const coords = resampleCoords(rawCoords);

    const elevations = coords.map(([lng, lat]) => {
      const elevation = map.queryTerrainElevation([lng, lat]);
      return typeof elevation === "number" ? elevation : 0;
    });

    const segments = classifySegments(elevations, coords);

    // Remove old segment layers
    const existingLayers = map.getStyle().layers ?? [];
    existingLayers
      .filter((l) => l.id.startsWith("route-segment-"))
      .forEach((l) => {
        if (map.getLayer(l.id)) map.removeLayer(l.id);
        if (map.getSource(l.id)) map.removeSource(l.id);
      });

    // Add new segment layers
    segments.forEach((segment, index) => {
      const color =
        segment.difficulty === "easy"
          ? "#22c55e" // green
          : segment.difficulty === "medium"
            ? "#eab308" // yellow
            : segment.difficulty === "uphill"
              ? "#7f1d1d" // 🟣 dark red (uphill)
              : "#ef4444"; // bright red (steep downhill)

      const id = `route-segment-${index}`;

      map.addSource(id, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: segment.coords,
          },
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
    });

    onRouteDrawn?.();
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-73.761, 40.715],
      zoom: 13,
    });

    mapRef.current = map;

    map.on("load", () => {
      // terrain source (required for elevation queries)
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.terrain-rgb",
        tileSize: 512,
        maxzoom: 14,
      });

      map.setTerrain({
        source: "mapbox-dem",
        exaggeration: 1,
      });

      // Try geolocation, but DO NOT depend on it.
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          ensureFromMarker(map, [longitude, latitude]);
          map.flyTo({ center: [longitude, latitude], zoom: 15 });
        },
        () => {
          // If user blocks location (or browser requires a gesture), fall back to "first click sets start".
          // No-op here.
        }
      );

      // Always allow clicks: first click sets FROM (if missing), second click sets TO + draws.
      map.on("click", (e) => {
        if (!mapRef.current || !e?.lngLat) return;

        const clicked = e.lngLat;

        // If we don't have a FROM marker yet (geolocation blocked), set it on first click.
        if (!markerRef.current) {
          ensureFromMarker(mapRef.current, clicked);
          return;
        }

        // Set / move destination marker
        ensureDestMarker(mapRef.current, clicked);
        void notifyDestinationPicked(clicked);

        // Draw route
        if (!markerRef.current || !destMarkerRef.current) return;
        void drawRouteBetweenPoints(
          mapRef.current,
          markerRef.current.getLngLat(),
          destMarkerRef.current.getLngLat()
        );
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !destination) return;

    const map = mapRef.current;

    // If we don't have a FROM marker yet (geolocation blocked), we can't draw a route.
    // In that case, just place the destination marker and fly there.
    const dest = ensureDestMarker(map, [destination.lng, destination.lat]);

    map.flyTo({ center: [destination.lng, destination.lat], zoom: 15 });

    if (!markerRef.current) return;

    void drawRouteBetweenPoints(map, markerRef.current.getLngLat(), dest.getLngLat());
  }, [destination]);

  return <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-[#e5e3df]" />;
}
