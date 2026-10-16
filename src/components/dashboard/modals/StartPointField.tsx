"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Suggestion = {
  id: string;
  placeName: string;
  lng: number;
  lat: number;
};

// The From field in Plan Your Route. It shows the current start until focused, then searches
// places the same way the To field does, with a way back to the rider's own location
export default function StartPointField({
  label,
  isCurrentLocation,
  disabled = false,
  onStartSelected,
  onUseCurrentLocation,
}: {
  label: string;
  isCurrentLocation: boolean;
  disabled?: boolean;
  onStartSelected: (loc: { name: string; lat: number; lng: number }) => void;
  onUseCurrentLocation: () => void;
}) {
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reqSeqRef = useRef(0);

  const trimmed = query.trim();
  const showCurrentLocationOption = !isCurrentLocation;
  const showMenu = editing && !disabled && (showCurrentLocationOption || suggestions.length > 0);

  useEffect(() => {
    if (!editing || disabled || !MAPBOX_TOKEN || trimmed.length < 2) {
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
          `${encodeURIComponent(trimmed)}.json` +
          `?access_token=${MAPBOX_TOKEN}` +
          `&autocomplete=true&limit=6&language=en`;

        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (reqId !== reqSeqRef.current) return;

        const items: Suggestion[] = (data?.features ?? [])
          .map((f: any) => ({
            id: String(f.id ?? f.place_name),
            placeName: f.place_name ?? f.text ?? "",
            lng: f.center?.[0],
            lat: f.center?.[1],
          }))
          .filter((s: Suggestion) => Number.isFinite(s.lng) && Number.isFinite(s.lat));

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
  }, [trimmed, editing, disabled, MAPBOX_TOKEN]);

  function finish() {
    setEditing(false);
    setQuery("");
    setSuggestions([]);
    inputRef.current?.blur();
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        aria-label="Starting point"
        placeholder={isCurrentLocation ? "Current location" : "Search for a starting point"}
        value={editing ? query : label}
        disabled={disabled}
        aria-disabled={disabled}
        onFocus={(e) => {
          if (disabled) return;
          setEditing(true);
          // Start from the shown name so a small edit is easy, selected so typing replaces it
          setQuery(isCurrentLocation ? "" : label);
          const el = e.currentTarget;
          requestAnimationFrame(() => el.select());
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => {
          window.setTimeout(() => {
            if (document.activeElement !== inputRef.current) {
              setEditing(false);
              setQuery("");
              setSuggestions([]);
            }
          }, 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") finish();
        }}
        className={[
          "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-[1px] focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500",
          disabled
            ? "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed"
            : "bg-white dark:bg-slate-800",
        ].join(" ")}
      />

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -3, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
            className={[
              "absolute left-0 right-0 top-[calc(100%+4px)] z-[1000]",
              "rounded-xl overflow-hidden",
              "border border-white/70 dark:border-slate-700/70",
              "ring-1 ring-black/5 dark:ring-white/5",
              "shadow-[0_18px_50px_rgba(0,0,0,0.22)]",
              "bg-white dark:bg-slate-800",
              "pointer-events-auto",
            ].join(" ")}
          >
            <div className="max-h-56 overflow-auto divide-y divide-slate-200/40">
              {showCurrentLocationOption && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-semibold text-emerald-700 dark:text-emerald-300 transition hover:bg-slate-900/5 dark:hover:bg-white/8 active:bg-slate-900/10 dark:active:bg-white/12"
                  // Keep focus in the input so the blur handler doesn't close the menu first
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => {
                    onUseCurrentLocation();
                    finish();
                  }}
                >
                  <LocateFixed size={16} aria-hidden="true" />
                  Use current location
                </button>
              )}

              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full text-left px-3 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 transition hover:bg-slate-900/5 dark:hover:bg-white/8 active:bg-slate-900/10 dark:active:bg-white/12"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => {
                    onStartSelected({ name: s.placeName, lat: s.lat, lng: s.lng });
                    finish();
                  }}
                >
                  <div className="truncate">{s.placeName}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
