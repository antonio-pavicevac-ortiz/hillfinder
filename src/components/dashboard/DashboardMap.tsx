"use client";
import type { Difficulty } from "@/lib/hillfinder/difficulty";
import mapboxgl from "mapbox-gl";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export interface DashboardMapRef {
  flyTo: (lat: number, lng: number) => void;
  addPin: (lat: number, lng: number) => void;
  addUserPin: (lat: number, lng: number) => void;
  getUserLocation: () => { lat: number; lng: number } | null;
  getDestination: () => { lat: number; lng: number } | null;
  drawRoute: (coords: [number, number][], difficulty: Difficulty) => void;
}

interface Props {
  onReady?: () => void;
}

function DashboardMapInner({ onReady }: Props, ref: React.Ref<DashboardMapRef>) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);

  /** INIT MAP (runs once) */
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-73.761, 40.715],
      zoom: 12,
    });

    mapRef.current = map;

    map.on("load", () => {
      console.log("Map initialized ✔️");
      onReady?.();
    });
  }, [onReady]);

  /** Imperative API exposed to Dashboard.tsx */
  useImperativeHandle(
    ref,
    () => ({
      flyTo(lat: number, lng: number) {
        if (!mapRef.current) return;
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: 14,
          speed: 1.4,
        });
      },

      addPin(lat: number, lng: number) {
        if (!mapRef.current) return;

        if (destMarkerRef.current) {
          destMarkerRef.current.remove();
        }

        destMarkerRef.current = new mapboxgl.Marker({
          color: "#1d4ed8",
        })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);

        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: 14,
        });
      },

      addUserPin(lat: number, lng: number) {
        if (!mapRef.current) return;

        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        userMarkerRef.current = new mapboxgl.Marker({
          color: "#16a34a",
        })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);

        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: 14,
        });
      },

      getUserLocation() {
        if (!userMarkerRef.current) return null;
        const pos = userMarkerRef.current.getLngLat();
        return { lat: pos.lat, lng: pos.lng };
      },

      getDestination() {
        if (!destMarkerRef.current) return null;
        const pos = destMarkerRef.current.getLngLat();
        return { lat: pos.lat, lng: pos.lng };
      },

      drawRoute(coords, difficulty) {
        if (!mapRef.current) return;

        const map = mapRef.current;

        if (map.getLayer("route-line")) map.removeLayer("route-line");
        if (map.getSource("route-line")) map.removeSource("route-line");

        const color =
          difficulty === "easy" ? "#22c55e" : difficulty === "medium" ? "#eab308" : "#ef4444"; // frisco

        map.addSource("route-line", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: coords.map(([lat, lng]) => [lng, lat]),
            },
          },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-line",
          paint: {
            "line-color": color,
            "line-width": 5,
          },
        });
      },
    }),
    []
  );

  return <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-[#e5e3df]" />;
}

export default forwardRef(DashboardMapInner);
