"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export interface DashboardMapRef {
  flyTo: (lat: number, lng: number) => void;
}

const DashboardMap = forwardRef<DashboardMapRef>((props, ref) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng) {
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: 14,
        speed: 1.2,
      });
    },
  }));

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-73.761, 40.715],
      zoom: 12,
    });
  }, []);

  return <div ref={mapContainerRef} className="absolute inset-0" />;
});

DashboardMap.displayName = "DashboardMap";
export default DashboardMap;
