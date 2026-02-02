"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  onSelectLocation: (loc: { name: string; lat: number; lng: number }) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onQueryChange?: (query: string) => void;
}

export default function SearchDestination({
  onSelectLocation,
  onFocus,
  onBlur,
  onQueryChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (results.length > 0) setActiveIndex(0);
    else setActiveIndex(-1);
  }, [results]);

  // Fetch suggestions
  useEffect(() => {
    if (justSelected) {
      setShowDropdown(false);
      return setJustSelected(false);
    }

    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const delay = setTimeout(async () => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=5`;

      const res = await fetch(url);
      const data = await res.json();

      setResults(data.features || []);
      setShowDropdown(true);
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  function selectPlace(place: any) {
    onSelectLocation({
      name: place.place_name,
      lat: place.center[1],
      lng: place.center[0],
    });

    setQuery(place.place_name);
    setJustSelected(true);
    setResults([]);
    setShowDropdown(false);
    onBlur?.(); // optional: sync parent state
    inputRef.current?.blur(); // key: forces blur so parent UI behaves consistently
  }

  return (
    <div className="w-full flex justify-center pointer-events-none">
      <div
        className="
          w-[92%] max-w-xl
          bg-white
          border border-gray-200
          shadow-md
          rounded-2xl
          px-4 py-3 flex flex-col gap-2 pointer-events-auto
        "
      >
        {/* Search Input */}
        <div className="flex items-center gap-3">
          <Search className="text-gray-500" size={20} />
          <input
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown && results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={
              showDropdown && results.length > 0 && activeIndex >= 0
                ? `search-option-${activeIndex}`
                : undefined
            }
            placeholder="Search destination"
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              onQueryChange?.(next);
              setQuery(next);
            }}
            onFocus={() => {
              onFocus?.();
              if (query.trim() && results.length > 0) {
                setShowDropdown(true);
              }
            }}
            onBlur={() => {
              onBlur?.();
              setShowDropdown(false);
            }}
            onKeyDown={(e) => {
              if (!showDropdown || results.length === 0) return;

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
              }

              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              }

              if (e.key === "Enter") {
                e.preventDefault();
                const place = results[activeIndex];
                if (place) selectPlace(place);
              }

              if (e.key === "Escape") {
                e.preventDefault();
                setShowDropdown(false);
              }
            }}
            className="
    flex-1 bg-transparent text-gray-800 placeholder-gray-500
    outline-none focus:outline-none focus:ring-0
  "
          />
        </div>

        {/* Results Dropdown */}
        {showDropdown && results.length > 0 && (
          <div
            id="search-results"
            role="listbox"
            className={`
    relative z-[100]
    bg-white/20 backdrop-blur-2xl
    supports-[backdrop-filter]:bg-white/10
    border border-white/30
    rounded-xl shadow-lg mt-3 max-h-60
    overflow-y-auto overflow-x-visible overscroll-contain
    px-2 pt-3 pb-6
    transform transition-all duration-200 ease-out
            `}
          >
            {results.map((place, idx) => (
              <button
                key={place.id}
                id={`search-option-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                type="button"
                className={`
      p-3 text-left w-full text-gray-700 rounded-lg
      hover:bg-green-100
      ${idx === activeIndex ? "bg-green-100" : ""}
      focus:outline-none
      focus-visible:ring-2
      focus-visible:ring-green-600
      focus-visible:ring-offset-2
      focus-visible:ring-offset-white
    `}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()} // prevents input blur before click
                onClick={() => selectPlace(place)}
              >
                {place.place_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
