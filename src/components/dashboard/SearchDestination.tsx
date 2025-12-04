"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  onSelectLocation: (loc: { name: string; lat: number; lng: number }) => void;
}

export default function SearchDestination({ onSelectLocation }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [justSelected, setJustSelected] = useState(false);

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

  return (
    <div className="absolute top-3 left-0 right-0 z-20 flex justify-center pointer-events-none">
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
            placeholder="Search destination"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value); // <-- typing works again
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
            className={`
     bg-white/20 backdrop-blur-2xl
    supports-[backdrop-filter]:bg-white/10
    border border-white/30
    rounded-xl shadow-lg mt-3 max-h-60
    overflow-y-auto overflow-x-visible
    px-2 pt-3 pb-6
    transform transition-all duration-200 ease-out
            `}
          >
            {results.map((place) => (
              <button
                key={place.id}
                className="
                  p-3 text-left w-full text-gray-700
                  hover:bg-green-100
                  focus:outline-none
                  focus-visible:ring-2
focus-visible:ring-green-600
focus-visible:ring-offset-2
focus-visible:ring-offset-white
                  rounded-lg
                "
                onClick={() => {
                  onSelectLocation({
                    name: place.place_name,
                    lat: place.center[1],
                    lng: place.center[0],
                  });

                  setQuery(place.place_name); // keep value in input
                  setJustSelected(true);
                  setResults([]); // hide results instantly
                  setShowDropdown(false);
                }}
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
