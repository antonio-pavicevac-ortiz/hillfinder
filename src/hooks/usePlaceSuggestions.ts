"use client";

import { useEffect, useRef, useState } from "react";

export type PlaceSuggestion = {
  id: string;
  placeName: string;
  lng: number;
  lat: number;
};

// Mapbox place search as the rider types, debounced; older replies are dropped
export function usePlaceSuggestions(query: string, enabled: boolean) {
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const reqSeqRef = useRef(0);
  const q = query.trim();

  useEffect(() => {
    if (!enabled || !MAPBOX_TOKEN || q.length < 2) {
      reqSeqRef.current += 1;
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      const reqId = ++reqSeqRef.current;
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
          `${encodeURIComponent(q)}.json` +
          `?access_token=${MAPBOX_TOKEN}` +
          `&autocomplete=true&limit=6&language=en`;

        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (reqId !== reqSeqRef.current) return;

        const items: PlaceSuggestion[] = (data?.features ?? [])
          .map((f: any) => ({
            id: String(f.id ?? f.place_name),
            placeName: f.place_name ?? f.text ?? "",
            lng: f.center?.[0],
            lat: f.center?.[1],
          }))
          .filter((s: PlaceSuggestion) => Number.isFinite(s.lng) && Number.isFinite(s.lat));

        setSuggestions(items);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setSuggestions([]);
      }
    }, 220);

    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [q, enabled, MAPBOX_TOKEN]);

  return suggestions;
}
