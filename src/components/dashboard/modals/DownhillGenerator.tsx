"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

function InlineDots({ className = "" }: { className?: string }) {
  return (
    <span className={["inline-flex items-center", className].join(" ")} aria-hidden="true">
      <motion.span
        className="mx-[1px]"
        initial={{ opacity: 0.25, y: 0 }}
        animate={{ opacity: [0.25, 1, 0.25], y: [0, -1, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      >
        .
      </motion.span>
      <motion.span
        className="mx-[1px]"
        initial={{ opacity: 0.25, y: 0 }}
        animate={{ opacity: [0.25, 1, 0.25], y: [0, -1, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
      >
        .
      </motion.span>
      <motion.span
        className="mx-[1px]"
        initial={{ opacity: 0.25, y: 0 }}
        animate={{ opacity: [0.25, 1, 0.25], y: [0, -1, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      >
        .
      </motion.span>
    </span>
  );
}

function ShimmerBar({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.8 }}
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-900/10"
          aria-hidden="true"
        >
          <motion.div
            className="h-full w-1/3 rounded-full bg-emerald-500/55"
            initial={{ x: "-40%" }}
            animate={{ x: ["-40%", "140%"] }}
            transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type Suggestion = {
  id: string;
  placeName: string;
  lng: number;
  lat: number;
};

type Variant = "easy" | "hard";
type BtnState = "disabled" | "ready" | "selected";
type ToastKind = "info" | "success" | "error";

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
  onMinimize,
  onHandlePointerDown,
  onToast,
}: {
  fromLabel: string;
  blocked?: boolean;
  open: boolean;
  initialTo?: string;
  onToChange?: (next: string) => void;
  onClose: () => void;
  onGenerate: (params: { from: string; to: string; variant: Variant }) => Promise<void> | void;
  onDestinationSelected?: (loc: {
    name: string;
    lat: string | number;
    lng: string | number;
  }) => void;
  variantsReady?: boolean;
  selectedVariant?: Variant | null;
  onVariantSelected?: (v: Variant | null) => void;
  onMinimize?: () => void;
  onHandlePointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onToast?: (t: { kind: ToastKind; message: string }) => void;
}) {
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const [to, setTo] = useState(initialTo);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [uiVariant, setUiVariant] = useState<Variant | null>(selectedVariant ?? null);
  const [generatedKey, setGeneratedKey] = useState<string>("");

  const lastCommittedRef = useRef<{ key: string; variant: Variant; ts: number } | null>(null);

  const [waitingForVariants, setWaitingForVariants] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const toInputRef = useRef<HTMLInputElement | null>(null);
  const suggestReqSeqRef = useRef(0);

  const waitTimerRef = useRef<number | null>(null);
  const failTimerRef = useRef<number | null>(null);

  const userEditingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const suppressOpenRef = useRef(false);

  const trimmedTo = useMemo(() => to.trim(), [to]);
  const hasDestination = trimmedTo.length > 0;
  const hasDifficulty = !!uiVariant;

  const controlsLocked = loading || waitingForVariants;
  const showSuggest = !controlsLocked && suggestOpen && suggestions.length > 0;
  const hideSheet = loading || waitingForVariants;

  const activeKey = hasDestination && uiVariant ? `${trimmedTo}::${uiVariant}` : "";
  const isGenerated = !!activeKey && activeKey === generatedKey;

  function nextFrame(times = 2) {
    return new Promise<void>((resolve) => {
      const step = (n: number) => {
        if (n <= 0) return resolve();
        requestAnimationFrame(() => step(n - 1));
      };
      step(times);
    });
  }

  const canPickDifficulty = hasDestination && !blocked && !controlsLocked;

  const canGenerate =
    hasDestination && hasDifficulty && !isGenerated && !blocked && !controlsLocked;

  function clearWaitTimer() {
    if (waitTimerRef.current != null) {
      window.clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }

    if (failTimerRef.current != null) {
      window.clearTimeout(failTimerRef.current);
      failTimerRef.current = null;
    }
  }

  function startWaitTimer() {
    clearWaitTimer();

    waitTimerRef.current = window.setTimeout(() => {
      setMessage("Still working on your route — this is taking longer than usual.");
      waitTimerRef.current = null;
    }, 8000);

    failTimerRef.current = window.setTimeout(() => {
      setWaitingForVariants(false);
      setLoading(false);
      setGeneratedKey("");
      lastCommittedRef.current = null;
      setMessage("Please try another destination.");
      onToast?.({
        kind: "error",
        message: "We couldn’t generate a route. Please try again.",
      });
      failTimerRef.current = null;
    }, 25000);
  }

  async function handleGenerate(destOverride?: string) {
    const dest = (destOverride ?? to).trim();

    if (!dest) {
      setMessage("Please enter a destination to generate your downhill route.");
      return;
    }
    if (!uiVariant) {
      setMessage("Please choose Easy or Hard before generating.");
      return;
    }

    if (destOverride != null && destOverride !== to) {
      setTo(destOverride);
      onToChange?.(destOverride);
    }

    const nextKey = `${dest}::${uiVariant}`;
    if (nextKey === generatedKey) return;

    if (blocked) {
      return;
    }

    suppressOpenRef.current = true;
    setSuggestOpen(false);
    setSuggestions([]);
    isFocusedRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    toInputRef.current?.blur();

    setLoading(true);
    setWaitingForVariants(true);
    setMessage("Finding downhill routes…");
    startWaitTimer();

    try {
      lastCommittedRef.current = { key: nextKey, variant: uiVariant, ts: Date.now() };
      onVariantSelected?.(uiVariant);

      await nextFrame(2);

      await onGenerate({ from: fromLabel, to: dest, variant: uiVariant });

      onVariantSelected?.(uiVariant);
      setMessage("Finding downhill routes…");
    } catch (err: any) {
      setWaitingForVariants(false);
      clearWaitTimer();
      setLoading(false);
      if (err && (err as any).hfSilent) {
        setMessage("");
        return;
      }
      setMessage(err?.message ?? "Something went wrong generating the route.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!variantsReady) return;

    const commit = lastCommittedRef.current;
    if (!commit) return;

    if (Date.now() - commit.ts > 30_000) return;

    setWaitingForVariants(false);
    clearWaitTimer();

    setGeneratedKey(commit.key);
    setMessage("");

    onVariantSelected?.(commit.variant);

    requestAnimationFrame(() => onClose());
  }, [variantsReady, open, onClose, onVariantSelected]);

  useEffect(() => {
    if (!open) {
      clearWaitTimer();
      setWaitingForVariants(false);
      setLoading(false);

      setSuggestOpen(false);
      setSuggestions([]);
      abortRef.current?.abort();
      abortRef.current = null;
      suggestReqSeqRef.current += 1;
      isFocusedRef.current = false;
      suppressOpenRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      clearWaitTimer();
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const next = (initialTo ?? "").trim();
    const shouldSync = !userEditingRef.current || to.trim() === "";

    if (shouldSync && next !== to) {
      setTo(next);
      onToChange?.(next);

      setUiVariant(null);
      onVariantSelected?.(null);

      setGeneratedKey("");
      setWaitingForVariants(false);
      clearWaitTimer();
      setMessage("");
    }
  }, [open, initialTo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    if (uiVariant == null && selectedVariant != null) {
      setUiVariant(selectedVariant);
    }
  }, [selectedVariant, uiVariant, open]);

  useEffect(() => {
    if (!open) return;
    if (controlsLocked) return;

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
      const reqId = ++suggestReqSeqRef.current;

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

        if (controller.signal.aborted) return;
        if (reqId !== suggestReqSeqRef.current) return;
        if (!isFocusedRef.current || suppressOpenRef.current) return;
        if (controlsLocked) return;

        const items: Suggestion[] = (data?.features ?? [])
          .map((f: any) => ({
            id: String(f.id ?? f.place_name),
            placeName: f.place_name ?? f.text ?? "",
            lng: f.center?.[0],
            lat: f.center?.[1],
          }))
          .filter((s: any) => Number.isFinite(s.lng) && Number.isFinite(s.lat));

        setSuggestions(items);
        setSuggestOpen(items.length > 0);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setSuggestions([]);
        setSuggestOpen(false);
      }
    }, 220);

    return () => window.clearTimeout(t);
  }, [trimmedTo, open, MAPBOX_TOKEN, controlsLocked]);

  function stateFor(variant: Variant): BtnState {
    if (!canPickDifficulty) return "disabled";
    if (uiVariant === variant) return "selected";
    return "ready";
  }

  function pickDifficulty(v: Variant) {
    if (!canPickDifficulty) return;

    setUiVariant(v);
    setMessage("");

    suppressOpenRef.current = true;
    setSuggestOpen(false);
    setSuggestions([]);
    isFocusedRef.current = false;

    abortRef.current?.abort();
    abortRef.current = null;

    toInputRef.current?.blur();

    window.setTimeout(() => {
      suppressOpenRef.current = false;
    }, 200);
  }

  const baseBtn =
    "relative w-full rounded-xl py-3 px-10 transition active:scale-[0.99] border focus:outline-none focus-visible:ring-[1px] flex items-center justify-center";

  const disabledClass =
    "bg-slate-200/85 text-slate-500 border-slate-300/80 cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";

  const easyReady =
    "bg-emerald-200/80 text-slate-600 border-emerald-300/80 shadow-[0_10px_26px_rgba(16,185,129,0.14)] hover:bg-emerald-200/95 hover:shadow-[0_14px_34px_rgba(16,185,129,0.18)] cursor-pointer font-semibold focus-visible:ring-emerald-300/70";

  const hardReady =
    "bg-rose-200/80 text-slate-600 border-rose-300/80 shadow-[0_10px_26px_rgba(244,63,94,0.12)] hover:bg-rose-200/95 hover:shadow-[0_14px_34px_rgba(244,63,94,0.16)] cursor-pointer font-semibold focus-visible:ring-rose-300/70";

  const easySelectedClass =
    "bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500/55 shadow-[0_18px_46px_rgba(16,185,129,0.45),0_0_0_6px_rgba(16,185,129,0.10)] cursor-pointer font-extrabold focus-visible:ring-emerald-500/80";

  const hardSelectedClass =
    "bg-rose-600 text-white border-rose-700 ring-2 ring-rose-500/55 shadow-[0_18px_46px_rgba(244,63,94,0.42),0_0_0_6px_rgba(244,63,94,0.10)] cursor-pointer font-extrabold focus-visible:ring-rose-500/80";

  const dotBase = "absolute left-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full";

  const checkBase =
    "absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-extrabold transition-all duration-150";

  const dragControls = useDragControls();
  const DISMISS_Y = 110;

  function onSheetDragEnd(_: PointerEvent, info: PanInfo) {
    if (info.offset.y > DISMISS_Y || info.velocity.y > 900) {
      (onMinimize ?? onClose)();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[50] pointer-events-none">
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] pointer-events-auto"
        onClick={() => {
          if (controlsLocked) return;
          onClose();
        }}
      />

      <AnimatePresence>
        {(loading || waitingForVariants) && (
          <motion.div
            key="hf-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-[16] flex items-center justify-center px-6 pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="absolute inset-0 bg-black/28 backdrop-blur-[1px]" aria-hidden="true" />

            <motion.div
              initial={{ scale: 0.98, y: 6, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.9 }}
              className="relative z-[1] inline-flex min-w-[16rem] max-w-[20rem] items-center gap-3 rounded-2xl border border-emerald-500/20 bg-black px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
              role="status"
              aria-live="polite"
              aria-label="Loading"
            >
              <motion.span
                className="h-4 w-4 rounded-full border-2 border-emerald-400/40 border-t-emerald-400"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-white/90">
                {message || "Finding downhill routes…"}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={[
          "absolute left-0 right-0 bottom-0 pointer-events-none transition-opacity duration-150",
          hideSheet ? "opacity-0" : "opacity-100",
        ].join(" ")}
        aria-hidden={hideSheet}
      >
        <div
          className={["pointer-events-auto", hideSheet ? "pointer-events-none" : ""].join(" ")}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            paddingLeft: 12,
            paddingRight: 12,
            paddingBottom: "calc(env(safe-area-inset-bottom) + 50px)",
          }}
        >
          <div className="max-w-[42rem] mx-auto pb-3">
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.9 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={0.18}
              onDragEnd={onSheetDragEnd}
              className={[
                "pointer-events-auto w-full",
                "bg-white/70 backdrop-blur-xl",
                "rounded-2xl border border-white/30 shadow-xl p-5",
                "relative isolate",
              ].join(" ")}
              style={{ touchAction: "manipulation" }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-1">
                <button
                  type="button"
                  aria-label="Minimize planner"
                  className="group w-full flex justify-center py-3 -my-2 cursor-grab active:cursor-grabbing"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onHandlePointerDown?.(e);
                    dragControls.start(e as any);
                  }}
                  onClick={() => {
                    (onMinimize ?? onClose)();
                  }}
                >
                  <div className="h-1.5 w-12 rounded-full bg-gray-400/60 transition-colors duration-200 group-hover:bg-gray-600/70 group-active:bg-gray-600/70" />
                </button>
              </div>

              <div className="flex items-center justify-center">
                <h2 className="text-lg font-semibold text-gray-900">Plan Your Route</h2>
              </div>

              <ShimmerBar visible={loading || waitingForVariants} />

              <div className="relative mb-4">
                <div
                  aria-hidden="true"
                  className="absolute left-[10px] top-[28px] bottom-[28px] w-px bg-slate-300/80"
                />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 rounded-full border-2 border-emerald-600 bg-white shadow-sm"
                    />
                    <label className="w-8 shrink-0 text-sm font-medium text-gray-700">From</label>
                    <input
                      type="text"
                      placeholder="Current location"
                      value={fromLabel}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-default"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 rounded-full border-2 border-sky-600 bg-white shadow-sm"
                    />
                    <label className="w-8 shrink-0 text-sm font-medium text-gray-700">To</label>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search for a destination"
                        value={to}
                        ref={toInputRef}
                        disabled={controlsLocked}
                        aria-disabled={controlsLocked}
                        onChange={(e) => {
                          if (controlsLocked) return;
                          const next = e.target.value;

                          userEditingRef.current = true;
                          window.setTimeout(() => (userEditingRef.current = false), 350);

                          setTo(next);
                          onToChange?.(next);

                          setGeneratedKey("");
                          setWaitingForVariants(false);
                          clearWaitTimer();

                          setUiVariant(null);
                          onVariantSelected?.(null);

                          suppressOpenRef.current = false;
                          setSuggestOpen(isFocusedRef.current && next.trim().length >= 2);
                          setMessage("");
                        }}
                        onFocus={() => {
                          if (controlsLocked) return;
                          isFocusedRef.current = true;
                          if (suggestions.length && !suppressOpenRef.current) setSuggestOpen(true);
                        }}
                        onBlur={() => {
                          isFocusedRef.current = false;
                          window.setTimeout(() => {
                            if (!isFocusedRef.current) setSuggestOpen(false);
                          }, 120);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setSuggestOpen(false);
                            setMessage("");
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className={[
                          "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[1px] focus:ring-emerald-500 focus:border-emerald-500",
                          controlsLocked
                            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                            : "bg-white",
                        ].join(" ")}
                      />

                      <AnimatePresence>
                        {showSuggest && (
                          <motion.div
                            initial={{ opacity: 0, y: -3, scale: 0.985 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -3, scale: 0.985 }}
                            transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
                            className={[
                              "absolute left-0 right-0 top-[calc(100%+4px)] z-[999]",
                              "rounded-xl overflow-hidden border border-white/70 ring-1 ring-black/5",
                              "shadow-[0_18px_50px_rgba(0,0,0,0.22)]",
                              "pointer-events-auto",
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
                                  disabled={controlsLocked}
                                  aria-disabled={controlsLocked}
                                  className={[
                                    "w-full text-left px-3 py-3 text-sm font-medium transition",
                                    controlsLocked
                                      ? "text-slate-400 cursor-not-allowed"
                                      : "text-slate-900 hover:bg-slate-900/5 active:bg-slate-900/10",
                                  ].join(" ")}
                                  onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={() => {
                                    if (controlsLocked) return;
                                    suppressOpenRef.current = true;
                                    abortRef.current?.abort();
                                    abortRef.current = null;

                                    setTo(s.placeName);
                                    setMessage("");
                                    onToChange?.(s.placeName);

                                    setSuggestOpen(false);
                                    setGeneratedKey("");
                                    setWaitingForVariants(false);
                                    clearWaitTimer();

                                    setUiVariant(null);
                                    onVariantSelected?.(null);

                                    onDestinationSelected?.({
                                      name: s.placeName,
                                      lat: s.lat,
                                      lng: s.lng,
                                    });

                                    isFocusedRef.current = false;
                                    toInputRef.current?.blur();

                                    window.setTimeout(() => {
                                      suppressOpenRef.current = false;
                                    }, 200);
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
                  </div>
                </div>
              </div>

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
                        <button
                          type="button"
                          disabled={!canPickDifficulty}
                          onClick={() => pickDifficulty("easy")}
                          aria-pressed={uiVariant === "easy"}
                          className={[baseBtn, easyClass].join(" ")}
                          style={{ touchAction: "manipulation" }}
                          onPointerDownCapture={(e) => e.stopPropagation()}
                        >
                          <span
                            className={dotBase}
                            style={{
                              background:
                                easyState === "disabled"
                                  ? "rgba(156,163,175,0.85)"
                                  : easyState === "selected"
                                    ? "rgba(255,255,255,0.95)"
                                    : "rgba(100,116,139,0.85)",
                            }}
                            aria-hidden="true"
                          />
                          <span className="text-center">Easy</span>

                          <span
                            aria-hidden="true"
                            className={[
                              checkBase,
                              uiVariant === "easy" ? "opacity-100 scale-100" : "opacity-0 scale-95",
                              "bg-white/18 ring-1 ring-white/35 text-white",
                              "shadow-[0_10px_22px_rgba(0,0,0,0.18)]",
                            ].join(" ")}
                          >
                            ✓
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={!canPickDifficulty}
                          onClick={() => pickDifficulty("hard")}
                          aria-pressed={uiVariant === "hard"}
                          className={[baseBtn, hardClass].join(" ")}
                          style={{ touchAction: "manipulation" }}
                          onPointerDownCapture={(e) => e.stopPropagation()}
                        >
                          <span
                            className={dotBase}
                            style={{
                              background:
                                hardState === "disabled"
                                  ? "rgba(156,163,175,0.85)"
                                  : hardState === "selected"
                                    ? "rgba(255,255,255,0.95)"
                                    : "rgba(100,116,139,0.85)",
                            }}
                            aria-hidden="true"
                          />
                          <span className="text-center">Hard</span>

                          <span
                            aria-hidden="true"
                            className={[
                              checkBase,
                              uiVariant === "hard" ? "opacity-100 scale-100" : "opacity-0 scale-95",
                              "bg-white/18 ring-1 ring-white/35 text-white",
                              "shadow-[0_10px_22px_rgba(0,0,0,0.18)]",
                            ].join(" ")}
                          >
                            ✓
                          </span>
                        </button>
                      </div>

                      {showWaitingHint && (
                        <motion.p
                          initial={{ opacity: 0, y: -2 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -2 }}
                          transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.8 }}
                          className="mt-2 text-center text-xs text-slate-600"
                        >
                          Finding downhill routes
                          <InlineDots />
                        </motion.p>
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

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (controlsLocked || !canGenerate) return;
                    void handleGenerate();
                  }}
                  disabled={!canGenerate}
                  style={{ touchAction: "manipulation" }}
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  className={[
                    "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99]",
                    canGenerate || isGenerated
                      ? [
                          "bg-emerald-500",
                          "text-white",
                          "border border-emerald-500/60",
                          "shadow-[0_12px_30px_rgba(16,185,129,0.35)]",
                          isGenerated ? "cursor-default" : "hover:bg-emerald-600",
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
                  {loading || waitingForVariants ? (
                    <span className="inline-flex items-center justify-center">
                      Finding
                      <InlineDots className="ml-1" />
                    </span>
                  ) : isGenerated ? (
                    "Route Generated"
                  ) : (
                    "Generate Route"
                  )}
                </button>

                {blocked && (
                  <p className="mt-2 text-center text-xs text-rose-600">
                    This route is currently blocked. Try a closer destination.
                  </p>
                )}
              </div>

              {!controlsLocked && message && message !== "Finding downhill routes…" && (
                <p className="text-center text-sm text-gray-700 mt-4 whitespace-pre-line">
                  {message}
                </p>
              )}

              {!MAPBOX_TOKEN && (
                <p className="mt-3 text-center text-xs text-slate-600">
                  Missing <span className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</span> — autocomplete
                  will be disabled.
                </p>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
