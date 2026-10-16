"use client";

import { LocateFixed, MapPin } from "lucide-react";

import type { PlaceSuggestion } from "@/hooks/usePlaceSuggestions";

// Search results for Plan Your Route, shown in place of the difficulty and Generate controls
// while the rider types in From or To
export default function PlaceResults({
  suggestions,
  query,
  onPick,
  onUseCurrentLocation,
}: {
  suggestions: PlaceSuggestion[];
  query: string;
  onPick: (s: PlaceSuggestion) => void;
  onUseCurrentLocation?: () => void;
}) {
  // Picking must not blur the field first, or leaving search mode would remove the row
  // before its click lands
  const keepFocus = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const rowClass =
    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-slate-900/5 dark:hover:bg-white/8 active:bg-slate-900/10 dark:active:bg-white/12";

  const searching = query.trim().length >= 2;

  return (
    <div role="listbox" aria-label="Places" className="space-y-0.5">
      {onUseCurrentLocation && (
        <button
          type="button"
          role="option"
          aria-selected={false}
          className={rowClass}
          onPointerDown={keepFocus}
          onClick={onUseCurrentLocation}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
            <LocateFixed size={16} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Use current location</span>
        </button>
      )}

      {suggestions.map((s) => {
        const [title, ...rest] = s.placeName.split(", ");
        return (
          <button
            key={s.id}
            type="button"
            role="option"
            aria-selected={false}
            className={rowClass}
            onPointerDown={keepFocus}
            onClick={() => onPick(s)}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900/6 text-slate-600 dark:bg-white/8 dark:text-slate-300">
              <MapPin size={16} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
              {rest.length > 0 && (
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{rest.join(", ")}</span>
              )}
            </span>
          </button>
        );
      })}

      {suggestions.length === 0 && (
        <p className="px-2.5 py-3 text-sm text-slate-500 dark:text-slate-400">
          {searching ? "No matching places yet." : "Type a place, address or landmark."}
        </p>
      )}
    </div>
  );
}
