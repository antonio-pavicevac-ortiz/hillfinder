"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  onSelectLocation: (loc: { name: string; lat: number; lng: number }) => void;
}

export default function SearchDestination({ onSelectLocation }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Fetch suggestions from Mapbox
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      setIsTyping(true);

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=5`;

      const res = await fetch(url);
      const data = await res.json();

      setResults(data.features || []);
      setIsTyping(false);
    }, 300); // debounce

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
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-500"
          />
        </div>

        {/* Results Dropdown */}
        {results.length > 0 && (
          <div
            className="
            bg-white/20
            backdrop-blur-2xl
            supports-[backdrop-filter]:bg-white/10
            border border-white/30
            rounded-xl
            shadow-lg
            mt-1 max-h-60 overflow-auto
          "
          >
            {results.map((place) => (
              <button
                key={place.id}
                className="p-3 text-left w-full hover:bg-gray-100 text-gray-700"
                onClick={() => {
                  onSelectLocation({
                    name: place.place_name,
                    lat: place.center[1],
                    lng: place.center[0],
                  });
                  setResults([]);
                  setQuery(place.place_name);
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
