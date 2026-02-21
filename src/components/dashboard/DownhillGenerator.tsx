"use client";

import { AnimatePresence, motion } from "framer-motion";
import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";

type Suggestion = {
  id: string;
  name: string;
  placeName: string;
  lng: number;
  lat: number;
};

type Variant = {
  coords: [number, number][];
  elevations: number[];
  score: number;
};

export default function DownhillGenerator({
  fromLabel,
  blocked = false,
  open,
  initialTo = "",
  onToChange,
  onClose,
  onGenerate,
  onDestinationSelected,
  variantsReady = false,
  selectedVariant,
  onVariantsReady,
  onVariantSelected,
  routeAlternativesNonce,
}: {
  fromLabel: string;
  blocked?: boolean;
  open: boolean;
  initialTo?: string;
  onToChange?: (next: string) => void; // ✅ NEW
  onClose: () => void;
  onGenerate: (params: { from: string; to: string }) => Promise<void> | void;
  onDestinationSelected?: (loc: { name: string; lat: number; lng: number }) => void;
  routeAlternativesNonce?: number;
  variantsReady?: boolean;
  selectedVariant?: "easy" | "hard" | null;
  onVariantsReady?: () => void;
  onVariantSelected?: (v: "easy" | "hard") => void;
}) {
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const [to, setTo] = useState(initialTo);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Lock generate after success until "To" changes
  const [generatedFor, setGeneratedFor] = useState<string>("");

  // Suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ✅ Helps avoid overwriting user typing when initialTo changes
  const userEditingRef = useRef(false);

  const isFocusedRef = useRef(false);
  const suppressOpenRef = useRef(false);

  const easyPillRef = useRef<mapboxgl.Marker | null>(null);
  const hardPillRef = useRef<mapboxgl.Marker | null>(null);

  const variantsRef = useRef<{ easy: Variant; hard: Variant } | null>(null);

  async function handleGenerate() {
    const dest = to.trim();
    if (!dest) {
      setMessage("Please enter a destination to generate your downhill route.");
      return;
    }
    if (dest === generatedFor) return;

    setLoading(true);
    setMessage("Analyzing elevation and computing downhill segments…");

    try {
      await onGenerate({ from: fromLabel, to: dest });
      // If the parent accepted the request, we can clear the helper text.
      setGeneratedFor(dest);
      setMessage("");
    } catch (err: any) {
      // Guardrail errors are handled by a global toast; don’t show an extra inline message.
      if (err && (err as any).hfSilent) {
        setMessage("");
        return;
      }
      setMessage(err?.message ?? "Something went wrong generating the route.");
    } finally {
      setLoading(false);
    }
  }

  function createPillEl(label: string) {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = label;
    el.style.padding = "6px 10px";
    el.style.borderRadius = "999px";
    el.style.border = "1px solid rgba(255,255,255,0.35)";
    el.style.background = "rgba(255,255,255,0.20)";
    el.style.backdropFilter = "blur(18px)";
    (el.style as any)["-webkit-backdrop-filter"] = "blur(18px)";
    el.style.color = "rgba(0,0,0,0.92)";
    el.style.fontSize = "11px";
    el.style.fontWeight = "700";
    el.style.letterSpacing = "0.04em";
    el.style.boxShadow = "0 8px 30px rgba(0,0,0,0.14)";
    el.style.cursor = "pointer";
    return el;
  }

  function ensurePill(
    map: mapboxgl.Map,
    kind: "easy" | "hard",
    lngLat: [number, number],
    onPick?: () => void
  ) {
    const ref = kind === "easy" ? easyPillRef : hardPillRef;
    if (!ref.current) {
      const el = createPillEl(kind === "easy" ? "EASY" : "HARD");
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onPick?.();
      });
      ref.current = new mapboxgl.Marker({ element: el, anchor: "left" })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      ref.current.setLngLat(lngLat);
    }
  }

  useEffect(() => {
    if (!open) return;

    // Only sync from parent when:
    // - user is not actively editing, OR
    // - local is empty (fresh open), OR
    // - initialTo changed and we want the map-as-source-of-truth
    const next = initialTo ?? "";
    const shouldSync = !userEditingRef.current || to.trim() === "";

    if (shouldSync && next !== to) {
      setTo(next);
      // don’t force-open dropdown here; let focus decide
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTo]);

  const trimmedTo = useMemo(() => to.trim(), [to]);
  const isGenerated = !!trimmedTo && trimmedTo === generatedFor;
  const canGenerate = !!trimmedTo && !isGenerated && !loading && !blocked;
  // ✅ Fetch suggestions (debounced + abortable)
  useEffect(() => {
    if (!open) return;

    if (!MAPBOX_TOKEN) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }

    const q = trimmedTo;

    if (q.length < 2) {
      abortRef.current?.abort();
      abortRef.current = null;
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }

    const t = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
          `${encodeURIComponent(q)}.json` +
          `?access_token=${MAPBOX_TOKEN}` +
          `&autocomplete=true&limit=6&language=en`;

        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();

        const items: Suggestion[] = (data?.features ?? []).map((f: any) => ({
          id: String(f.id ?? f.place_name),
          name: f.text ?? "",
          placeName: f.place_name ?? f.text ?? "",
          lng: f.center?.[0],
          lat: f.center?.[1],
        }));

        const nextSuggestions = items.filter(
          (s) => Number.isFinite(s.lng) && Number.isFinite(s.lat)
        );
        setSuggestions(nextSuggestions);

        // ✅ Only open if input is focused and we aren't suppressing (e.g., right after selecting)
        setSuggestOpen(
          isFocusedRef.current && !suppressOpenRef.current && nextSuggestions.length > 0
        );
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setSuggestions([]);
        setSuggestOpen(false);
      }
    }, 220);

    return () => window.clearTimeout(t);
  }, [trimmedTo, open, MAPBOX_TOKEN]);

  // --- Sheet motion tuning ---
  const CLOSE_DISTANCE_PX = 90;
  const FLICK_VELOCITY = 900;
  const DRAG_ELASTIC: number = 0.18;

  const SPRING_IN = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const;
  const SPRING_OUT = { type: "spring", stiffness: 360, damping: 38, mass: 0.9 } as const;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="downhill-generator"
          className="w-full"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: SPRING_IN }}
          exit={{ y: 320, opacity: 0, transition: SPRING_OUT }}
        >
          <motion.div
            className={[
              "pointer-events-auto w-full",
              "bg-white/70 backdrop-blur-xl",
              "rounded-2xl border border-white/30 shadow-xl p-5",
              "relative",
              "isolate",
            ].join(" ")}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 9999 }}
            dragElastic={DRAG_ELASTIC}
            onDragEnd={(_, info) => {
              const offsetY = info.offset.y;
              const velocityY = info.velocity.y;
              const shouldClose = offsetY > CLOSE_DISTANCE_PX || velocityY > FLICK_VELOCITY;
              if (shouldClose) onClose();
            }}
            style={{ touchAction: "none" }}
          >
            {/* Header */}
            <div className="mb-4">
              <div className="flex justify-center mb-3">
                <button
                  type="button"
                  aria-label="Close planner"
                  className="group w-full flex justify-center py-4 -my-2 cursor-grab active:cursor-grabbing"
                  onClick={onClose}
                >
                  <div className="h-1.5 w-12 rounded-full bg-gray-400/60 transition-colors duration-200 group-hover:bg-gray-600/70 group-active:bg-gray-600/70" />
                </button>
              </div>

              <div className="flex items-center justify-center">
                <h2 className="text-lg font-semibold text-gray-900">Plan Your Downhill Route</h2>
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700">From</label>
            <input
              type="text"
              value={fromLabel}
              readOnly
              className="w-full mt-1 mb-4 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-default"
            />

            <label className="block text-sm font-medium text-gray-700">To</label>

            <div className="relative mb-4">
              <input
                type="text"
                value={to}
                onChange={(e) => {
                  const next = e.target.value;

                  userEditingRef.current = true;
                  window.setTimeout(() => {
                    userEditingRef.current = false;
                  }, 350);

                  setTo(next);
                  onToChange?.(next); // ✅ PERSIST IN DASHBOARD STATE

                  setMessage("");
                  setGeneratedFor(""); // ✅ re-enable after edit

                  // Typing should allow suggestions again
                  suppressOpenRef.current = false;

                  // Keep the dropdown "open intent" while focused (results will populate asynchronously)
                  setSuggestOpen(isFocusedRef.current && next.trim().length >= 2);
                }}
                onFocus={() => {
                  isFocusedRef.current = true;
                  if (suggestions.length && !suppressOpenRef.current) setSuggestOpen(true);
                }}
                onBlur={() => {
                  isFocusedRef.current = false;
                  window.setTimeout(() => setSuggestOpen(false), 140);
                }}
                placeholder="Enter destination"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />

              <AnimatePresence>
                {suggestOpen && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -3, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -3, scale: 0.985 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
                    className={[
                      "absolute left-0 right-0",
                      "top-[calc(100%+4px)]",
                      "z-[999]",
                      "rounded-xl",
                      "overflow-hidden",
                      "border border-white/70",
                      "ring-1 ring-black/5",
                      "shadow-[0_18px_50px_rgba(0,0,0,0.22)]",
                    ].join(" ")}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.98)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                    }}
                  >
                    <div className="max-h-56 overflow-auto divide-y divide-slate-200/40">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3 py-3 text-sm font-medium text-slate-900 hover:bg-slate-900/5 active:bg-slate-900/10 transition"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            // ✅ Prevent the fetch effect from reopening the list after selection.
                            // We'll re-enable opening on the next user edit (onChange clears this).
                            suppressOpenRef.current = true;

                            // Also abort any in-flight autocomplete fetch to reduce racey reopen behavior
                            abortRef.current?.abort();
                            abortRef.current = null;

                            setTo(s.placeName);
                            onToChange?.(s.placeName); // ✅ PERSIST SELECTION TOO

                            setSuggestOpen(false);
                            setMessage("");
                            setGeneratedFor("");
                            onDestinationSelected?.({
                              name: s.placeName,
                              lat: s.lat,
                              lng: s.lng,
                            });
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

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!variantsReady}
                onClick={() => onVariantSelected?.("easy")}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-semibold border transition",
                  variantsReady ? "cursor-pointer" : "opacity-50 cursor-not-allowed",
                  selectedVariant === "easy"
                    ? "bg-white/25 border-white/30"
                    : "bg-white/10 border-white/20",
                ].join(" ")}
              >
                Easy
              </button>

              <button
                type="button"
                disabled={!variantsReady}
                onClick={() => onVariantSelected?.("hard")}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-semibold border transition",
                  variantsReady ? "cursor-pointer" : "opacity-50 cursor-not-allowed",
                  selectedVariant === "hard"
                    ? "bg-white/25 border-white/30"
                    : "bg-white/10 border-white/20",
                ].join(" ")}
              >
                Hard
              </button>
            </div>

            {message && (
              <p className="text-center text-sm text-gray-700 mt-4 whitespace-pre-line">
                {message}
              </p>
            )}

            {!MAPBOX_TOKEN && (
              <p className="mt-3 text-center text-xs text-slate-600">
                Missing <span className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</span> — autocomplete
                disabled.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
