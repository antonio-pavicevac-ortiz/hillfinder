"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type Suggestion = {
  id: string;
  placeName: string;
  lng: number;
  lat: number;
};

type Variant = "easy" | "hard";
type BtnState = "disabled" | "ready" | "selected";

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
  onVariantSelected,
}: {
  fromLabel: string;
  blocked?: boolean;
  open: boolean;
  initialTo?: string;
  onToChange?: (next: string) => void;
  onClose: () => void;
  onGenerate: (params: { from: string; to: string; variant: Variant }) => Promise<void> | void;
  onDestinationSelected?: (loc: { name: string; lat: number; lng: number }) => void;
  variantsReady?: boolean;
  selectedVariant?: Variant | null;
  onVariantSelected?: (v: Variant | null) => void;
}) {
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const [to, setTo] = useState(initialTo);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Lock generate after success until "To" changes
  const [generatedFor, setGeneratedFor] = useState<string>("");

  // After clicking Generate, we lock controls until parent says we're done
  const [waitingForVariants, setWaitingForVariants] = useState(false);

  // Suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const toInputRef = useRef<HTMLInputElement | null>(null);

  // Avoid overwriting user typing when initialTo changes
  const userEditingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const suppressOpenRef = useRef(false);

  const trimmedTo = useMemo(() => to.trim(), [to]);
  const hasDestination = trimmedTo.length > 0;
  const hasDifficulty = !!selectedVariant;

  const isGenerated = hasDestination && trimmedTo === generatedFor;

  // “Locked” states should force buttons gray:
  // - no destination
  // - loading / blocked
  // - waiting for map variants
  // - already generated for this destination
  const canPickDifficulty =
    hasDestination && !loading && !blocked && !waitingForVariants && !isGenerated;

  const canGenerate =
    hasDestination && hasDifficulty && !isGenerated && !loading && !blocked && !waitingForVariants;

  async function handleGenerate(destOverride?: string) {
    const dest = (destOverride ?? to).trim();

    if (!dest) {
      setMessage("Please enter a destination to generate your downhill route.");
      return;
    }
    if (!selectedVariant) {
      setMessage("Please choose Easy or Hard before generating.");
      return;
    }

    // Keep local + parent aligned
    if (destOverride != null && destOverride !== to) {
      setTo(destOverride);
      onToChange?.(destOverride);
    }

    if (dest === generatedFor) return;
    if (blocked) return;

    setLoading(true);
    setWaitingForVariants(true);
    setMessage("Computing your route…");

    try {
      await onGenerate({ from: fromLabel, to: dest, variant: selectedVariant });
      setGeneratedFor(dest);
      setMessage("");
    } catch (err: any) {
      setWaitingForVariants(false);

      if (err && (err as any).hfSilent) {
        setMessage("");
        return;
      }
      setMessage(err?.message ?? "Something went wrong generating the route.");
    } finally {
      setLoading(false);
    }
  }

  // When parent says route/variants are ready, unlock controls
  useEffect(() => {
    if (!open) return;
    if (variantsReady) setWaitingForVariants(false);
  }, [variantsReady, open]);

  // Sync initialTo -> local "to"
  useEffect(() => {
    if (!open) return;

    const next = (initialTo ?? "").trim();
    const shouldSync = !userEditingRef.current || to.trim() === "";

    if (shouldSync && next !== to) {
      setTo(next);
      onToChange?.(next);

      // destination changed => force re-pick difficulty
      onVariantSelected?.(null);

      // reset locks/messages for new destination
      setGeneratedFor("");
      setWaitingForVariants(false);
      setMessage("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTo]);

  // Fetch suggestions (debounced + abortable)
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

        const items: Suggestion[] = (data?.features ?? [])
          .map((f: any) => ({
            id: String(f.id ?? f.place_name),
            placeName: f.place_name ?? f.text ?? "",
            lng: f.center?.[0],
            lat: f.center?.[1],
          }))
          .filter((s: any) => Number.isFinite(s.lng) && Number.isFinite(s.lat));

        setSuggestions(items);
        setSuggestOpen(isFocusedRef.current && !suppressOpenRef.current && items.length > 0);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setSuggestions([]);
        setSuggestOpen(false);
      }
    }, 220);

    return () => window.clearTimeout(t);
  }, [trimmedTo, open, MAPBOX_TOKEN]);

  const SPRING_IN = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const;
  const SPRING_OUT = { type: "spring", stiffness: 360, damping: 38, mass: 0.9 } as const;

  function stateFor(variant: Variant): BtnState {
    if (!canPickDifficulty) return "disabled";
    if (selectedVariant === variant) return "selected";
    return "ready";
  }

  const baseBtn =
    "relative w-full rounded-xl py-3 px-10 transition active:scale-[0.99] border focus:outline-none focus-visible:ring-[1px] flex items-center justify-center";

  const disabledClass =
    "bg-slate-200/85 text-slate-500 border-slate-300/80 cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";

  // READY (destination entered): light tint + BLACK text
  // READY (destination entered): light tint + GREY text (B version)
  const easyReady =
    "bg-emerald-200/80 text-slate-600 border-emerald-300/80 shadow-[0_10px_26px_rgba(16,185,129,0.14)] hover:bg-emerald-200/95 hover:shadow-[0_14px_34px_rgba(16,185,129,0.18)] cursor-pointer font-semibold focus-visible:ring-emerald-300/70";

  const hardReady =
    "bg-rose-200/80 text-slate-600 border-rose-300/80 shadow-[0_10px_26px_rgba(244,63,94,0.12)] hover:bg-rose-200/95 hover:shadow-[0_14px_34px_rgba(244,63,94,0.16)] cursor-pointer font-semibold focus-visible:ring-rose-300/70";

  // SELECTED: deeper + WHITE text + stronger halo glow
  const easySelectedClass =
    "bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500/55 shadow-[0_18px_46px_rgba(16,185,129,0.45),0_0_0_6px_rgba(16,185,129,0.10)] cursor-pointer font-extrabold focus-visible:ring-emerald-500/80";

  const hardSelectedClass =
    "bg-rose-600 text-white border-rose-700 ring-2 ring-rose-500/55 shadow-[0_18px_46px_rgba(244,63,94,0.42),0_0_0_6px_rgba(244,63,94,0.10)] cursor-pointer font-extrabold focus-visible:ring-rose-500/80";

  const dotBase = "absolute left-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full";

  const checkBase =
    "absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-extrabold transition-all duration-150";

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
              "relative isolate",
            ].join(" ")}
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
                ref={toInputRef}
                onChange={(e) => {
                  const next = e.target.value;

                  userEditingRef.current = true;
                  window.setTimeout(() => (userEditingRef.current = false), 350);

                  setTo(next);
                  onToChange?.(next);

                  setMessage("");
                  setGeneratedFor("");
                  setWaitingForVariants(false);

                  // destination changed => force re-pick difficulty
                  onVariantSelected?.(null);

                  suppressOpenRef.current = false;
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
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[1px] focus:ring-emerald-500 focus:border-emerald-500"
              />

              <AnimatePresence>
                {suggestOpen && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -3, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -3, scale: 0.985 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
                    className={[
                      "absolute left-0 right-0 top-[calc(100%+4px)] z-[999]",
                      "rounded-xl overflow-hidden border border-white/70 ring-1 ring-black/5",
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
                            suppressOpenRef.current = true;
                            abortRef.current?.abort();
                            abortRef.current = null;

                            setTo(s.placeName);
                            onToChange?.(s.placeName);

                            setSuggestOpen(false);
                            setMessage("");
                            setGeneratedFor("");
                            setWaitingForVariants(false);
                            onVariantSelected?.(null);

                            onDestinationSelected?.({
                              name: s.placeName,
                              lat: s.lat,
                              lng: s.lng,
                            });

                            // ✅ Stop caret movement after selection
                            isFocusedRef.current = false;
                            toInputRef.current?.blur();
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

            {/* Easy/Hard toggle */}
            <div className="mt-3">
              {(() => {
                const showWaitingHint = waitingForVariants;

                const easyState = stateFor("easy");
                const hardState = stateFor("hard");

                const easyClass =
                  easyState === "disabled"
                    ? disabledClass
                    : easyState === "selected"
                      ? easySelectedClass
                      : easyReady;

                const hardClass =
                  hardState === "disabled"
                    ? disabledClass
                    : hardState === "selected"
                      ? hardSelectedClass
                      : hardReady;

                return (
                  <>
                    <div
                      className={[
                        "grid grid-cols-2 gap-2 rounded-2xl p-2",
                        "bg-slate-200/45 border border-slate-300/60 ring-1 ring-black/5",
                        "shadow-[inset_0_1px_0_rgba(0,0,0,0.04)]",
                        "[-webkit-backdrop-filter:blur(20px)] [backdrop-filter:blur(20px)]",
                      ].join(" ")}
                    >
                      {/* EASY */}
                      <button
                        type="button"
                        disabled={!canPickDifficulty}
                        onClick={() => onVariantSelected?.("easy")}
                        aria-pressed={selectedVariant === "easy"}
                        className={[baseBtn, easyClass].join(" ")}
                      >
                        <span
                          className={dotBase}
                          style={{
                            background:
                              easyState === "disabled"
                                ? "rgba(156,163,175,0.85)"
                                : easyState === "selected"
                                  ? "rgba(255,255,255,0.95)"
                                  : "rgba(100,116,139,0.85)", // dusty grey
                          }}
                          aria-hidden="true"
                        />
                        <span className="text-center">Easy</span>

                        <span
                          aria-hidden="true"
                          className={[
                            checkBase,
                            easyState === "selected"
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-95",
                            "bg-white/18 ring-1 ring-white/35 text-white",
                            "shadow-[0_10px_22px_rgba(0,0,0,0.18)]",
                          ].join(" ")}
                        >
                          ✓
                        </span>
                      </button>

                      {/* HARD */}
                      <button
                        type="button"
                        disabled={!canPickDifficulty}
                        onClick={() => onVariantSelected?.("hard")}
                        aria-pressed={selectedVariant === "hard"}
                        className={[baseBtn, hardClass].join(" ")}
                      >
                        <span
                          className={dotBase}
                          style={{
                            background:
                              hardState === "disabled"
                                ? "rgba(156,163,175,0.85)"
                                : hardState === "selected"
                                  ? "rgba(255,255,255,0.95)"
                                  : "rgba(100,116,139,0.85)", // dusty grey
                          }}
                          aria-hidden="true"
                        />
                        <span className="text-center">Hard</span>

                        <span
                          aria-hidden="true"
                          className={[
                            checkBase,
                            hardState === "selected"
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-95",
                            "bg-white/18 ring-1 ring-white/35 text-white",
                            "shadow-[0_10px_22px_rgba(0,0,0,0.18)]",
                          ].join(" ")}
                        >
                          ✓
                        </span>
                      </button>
                    </div>

                    {showWaitingHint && (
                      <p className="mt-2 text-center text-xs text-slate-500">
                        Computing your route…
                      </p>
                    )}

                    {!showWaitingHint && hasDestination && (
                      <p className="mt-2 text-center text-xs text-slate-600">
                        Pick <span className="font-semibold">Easy</span> or{" "}
                        <span className="font-semibold">Hard</span>.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Generate */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99]",
                  canGenerate
                    ? [
                        "bg-emerald-500",
                        "text-white",
                        "border border-emerald-500/60",
                        "shadow-[0_12px_30px_rgba(16,185,129,0.35)]",
                        "hover:bg-emerald-600",
                      ].join(" ")
                    : [
                        "bg-gray-200",
                        "text-gray-500",
                        "border border-slate-300/70",
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
                        "cursor-not-allowed",
                      ].join(" "),
                ].join(" ")}
              >
                {loading
                  ? "Generating…"
                  : waitingForVariants
                    ? "Working…"
                    : isGenerated
                      ? "Route Generated"
                      : "Generate Route"}
              </button>

              {blocked && (
                <p className="mt-2 text-center text-xs text-rose-600">
                  This route is currently blocked. Try a closer destination.
                </p>
              )}
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
