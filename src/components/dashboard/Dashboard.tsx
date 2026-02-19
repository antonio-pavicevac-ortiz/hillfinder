"use client";

import ClearRouteButton from "@/components/dashboard/ClearRouteButton";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { DashboardLegend } from "@/components/dashboard/DashboardLegend";
import DashboardMap from "@/components/dashboard/DashboardMap";
import DownhillGenerator from "@/components/dashboard/DownhillGenerator";
import PlannerCTA, { CTA_ROUNDED } from "@/components/dashboard/PlannerCTA";
import QuickActionsSheet from "@/components/dashboard/QuickActionSheet";
import QuickActionsTrigger from "@/components/dashboard/QuickActionsTrigger";
import { milesBetween } from "@/lib/map/milesBetween";
import type { DashboardUser } from "@/types/user";
import { AnimatePresence, motion, TargetAndTransition, useAnimationControls } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const HEADER_H = 64;
const FOOTER_H = 56;
const HEARTBEAT: TargetAndTransition = {
  scale: [1, 1.012, 1, 1.018, 1],
  transition: {
    duration: 2.4,
    times: [0, 0.12, 0.24, 0.38, 1],
    ease: [0.22, 1, 0.36, 1], // TS-safe across versions
    repeat: Infinity,
  },
};

const QUICK_ROUTE_BOUNCE_IN: TargetAndTransition = {
  opacity: [0, 1, 1],
  y: [10, -6, 0],
  scale: [0.99, 1.01, 1],
  transition: {
    duration: 0.36,
    ease: [0.22, 1.25, 0.36, 1],
    times: [0, 0.7, 1],
  },
};

type Destination = {
  lat: number;
  lng: number;
  name?: string;
};

type FromLocation = {
  lat: number;
  lng: number;
  name?: string;
};

export default function Dashboard({ user }: { user: DashboardUser }) {
  const [fromLocation, setFromLocation] = useState<FromLocation | null>(null);
  const [fromLabelDisplay, setFromLabelDisplay] = useState<string>("Locating…");
  const [qaOpen, setQaOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  // ✅ start closed so CTA is the entry point
  const [generatorOpen, setGeneratorOpen] = useState(false);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [hasRoute, setHasRoute] = useState(false);

  // tells the map to clear itself without refs
  const [clearRouteNonce, setClearRouteNonce] = useState(0);

  // ✅ used to re-trigger bounce when returning from planner
  const [ctaBounceNonce, setCtaBounceNonce] = useState(0);

  const [routeRequestNonce, setRouteRequestNonce] = useState(0);

  const [plannerTo, setPlannerTo] = useState("");

  // ✅ stop pulsing once user interacts
  const [ctaHasInteracted, setCtaHasInteracted] = useState(false);

  // ✅ when true, DownhillGenerator's Generate button is disabled via `blocked`
  const [isTooFar, setIsTooFar] = useState(false);

  const glassBar =
    "relative bg-white/12 saturate-150 " +
    "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
    "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
    "before:pointer-events-none before:absolute before:inset-0 " +
    "before:bg-gradient-to-b before:from-white/20 before:to-transparent";

  const [plannerExiting, setPlannerExiting] = useState(false);

  // ----------------------------
  // ✅ PIN-BASED CTA CALLOUT LOGIC
  // ----------------------------

  // "Pins are ready" means BOTH markers exist (not just destination)
  const pinsReady = !!fromLocation && !!destination;

  // Strong callout when pins become ready (first time per session)
  const [ctaPinsReadyNudgeNonce, setCtaPinsReadyNudgeNonce] = useState(0);

  // Soft nudge when user edits pins again (rate-limited)
  const [ctaSoftNudgeNonce, setCtaSoftNudgeNonce] = useState(0);

  // Stop teaching nudges once user has opened planner at least once
  const [hasOpenedPlannerOnce, setHasOpenedPlannerOnce] = useState(false);

  // Track pin editing activity
  const [lastPinEditAt, setLastPinEditAt] = useState(0);
  const lastSoftNudgeAtRef = useRef(0);
  const prevPinsReadyRef = useRef(false);
  const softNudgeTimerRef = useRef<number | null>(null);

  // ✅ Quick Route press animation controls
  // ✅ Quick Route press animation controls
  const quickRouteControls = useAnimationControls();
  const quickRouteAnimatingRef = useRef(false);

  // ✅ Recenter
  const [recenterNonce, setRecenterNonce] = useState(0);
  const recenterDisabled = !fromLocation;
  const recenterStrokeColor = recenterDisabled
    ? "rgba(100,116,139,0.95)" // same disabled stroke as ClearRouteButton
    : "rgba(15,23,42,0.95)"; // same active stroke as ClearRouteButton
  // ----------------------------
  // ✅ UNIVERSAL TOAST (STYLE COMES FROM globals.css)
  // ----------------------------
  function showBanner(
    message: string,
    opts?: {
      tone?: "neutral" | "error";
      duration?: number;
    }
  ) {
    const tone = opts?.tone ?? "neutral";
    const duration = opts?.duration ?? 3600;

    if (tone === "error") {
      toast.error(message, { duration });
      return;
    }

    // ✅ do NOT use toast.success for neutral
    toast(message, { duration });
  }

  function showPinsReadyHint() {
    showBanner("Pins set — tap Quick Route or Plan a downhill route", {
      tone: "neutral",
      duration: 4200, // readable
    });
  }

  function notePinEdited() {
    setLastPinEditAt(Date.now());
  }

  function closePlannerWithExitThenBounceCTA() {
    if (!generatorOpen) return;
    setPlannerExiting(true);
    setGeneratorOpen(false);
  }

  async function handleGenerate(params: { from: string; to: string }) {
    const silent = (): never => {
      const err = new Error("HF_GUARDRAIL");
      (err as any).hfSilent = true;
      throw err;
    };

    const showGuard = (msg: string): never => {
      showBanner(msg, { tone: "error", duration: 4200 });
      return silent();
    };

    const from = fromLocation;
    if (!from) return showGuard("Pick a start location first.");

    const dest = destination;
    if (!dest) return showGuard("Pick a destination first.");

    if (!dest.name || dest.name !== params.to) {
      return showGuard("Please choose a destination from the list.");
    }

    const MAX_MILES = 20;
    const d = milesBetween(from, dest);

    if (!Number.isFinite(d))
      return showGuard("Couldn’t measure distance for that route. Try again.");

    if (d > MAX_MILES) {
      const rounded = Math.round(d * 10) / 10;
      setIsTooFar(true);
      return showGuard(
        `That route is ${rounded} miles. Hillfinder currently supports routes up to ${MAX_MILES} miles.`
      );
    }

    setIsTooFar(false);
    setRouteRequestNonce((n) => n + 1);
  }

  function handleRouteDrawn() {
    setHasRoute(true);
    closePlannerWithExitThenBounceCTA();
  }

  function handleClearRoute() {
    setHasRoute(false);
    setClearRouteNonce((n) => n + 1);
  }

  function canQuickRoute(): boolean {
    if (!fromLocation) {
      showBanner("Pick a start location first.", { tone: "error", duration: 4200 });
      return false;
    }
    if (!destination) {
      showBanner("Drop a destination pin first.", { tone: "error", duration: 4200 });
      return false;
    }

    const MAX_MILES = 20;
    const d = milesBetween(fromLocation, destination);

    if (!Number.isFinite(d)) {
      showBanner("Couldn’t measure distance. Try again.", { tone: "error", duration: 4200 });
      return false;
    }

    if (d > MAX_MILES) {
      const rounded = Math.round(d * 10) / 10;
      setIsTooFar(true);
      showBanner(
        `That route is ${rounded} miles. Hillfinder currently supports routes up to ${MAX_MILES} miles.`,
        { tone: "error", duration: 4200 }
      );
      return false;
    }

    setIsTooFar(false);
    return true;
  }

  function runQuickRoute() {
    setCtaHasInteracted(true);
    setHasOpenedPlannerOnce(true);

    // clear previous route state and request a new one
    setHasRoute(false);
    setRouteRequestNonce((n) => n + 1);
  }

  async function handleQuickRoutePress() {
    if (!canQuickRoute()) return;
    if (quickRouteAnimatingRef.current) return;

    quickRouteAnimatingRef.current = true;

    // ✅ trigger the route immediately (no waiting on animation)
    runQuickRoute();

    try {
      // baseline
      quickRouteControls.stop();
      quickRouteControls.set({ opacity: 1, scale: 1 });

      // subtle press feedback (tasteful)
      await quickRouteControls.start({
        scale: 1.02,
        transition: { duration: 0.08, ease: "easeOut" },
      });

      await quickRouteControls.start({
        scale: 0.97,
        opacity: 0,
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
      });

      // reset for next time it appears
      quickRouteControls.set({ opacity: 1, scale: 1 });
    } finally {
      quickRouteAnimatingRef.current = false;
    }
  }

  useEffect(() => {
    if (!fromLocation?.name) {
      setFromLabelDisplay("Locating…");
      return;
    }

    const MIN_LOCATING_MS = 650;
    const t = window.setTimeout(() => setFromLabelDisplay(fromLocation.name!), MIN_LOCATING_MS);
    return () => window.clearTimeout(t);
  }, [fromLocation?.name]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;

      if (softNudgeTimerRef.current) window.clearTimeout(softNudgeTimerRef.current);
    };
  }, []);

  // ✅ STRONG CALLOUT: when pins become ready (false -> true)
  useEffect(() => {
    const prev = prevPinsReadyRef.current;
    prevPinsReadyRef.current = pinsReady;

    if (!prev && pinsReady && !generatorOpen && !plannerExiting && !hasOpenedPlannerOnce) {
      setCtaPinsReadyNudgeNonce((n) => n + 1);
      showPinsReadyHint();
    }
  }, [pinsReady, generatorOpen, plannerExiting, hasOpenedPlannerOnce]);

  useEffect(() => {
    const shouldShowQuick = pinsReady && !hasRoute && !generatorOpen && !plannerExiting;

    // If it's not visible, stop any running animation so it doesn't "resume" weirdly later
    if (!shouldShowQuick) {
      // If the button disappears while an animation is awaiting (e.g. route draws quickly),
      // ensure we don't get stuck "animating" forever.
      quickRouteAnimatingRef.current = false;

      quickRouteControls.stop();
      quickRouteControls.set({ opacity: 1, scale: 1 });
      return;
    }

    // When it becomes visible again, reset it
    quickRouteControls.stop();
    quickRouteControls.set({ opacity: 1, scale: 1 });

    // Same gentle pulse as Planner CTA, only before interaction
    if (!ctaHasInteracted) {
      quickRouteControls.start({
        scale: [1, 1.015, 1],
        transition: { duration: 2.2, ease: "easeInOut", repeat: Infinity },
      });
    }
  }, [pinsReady, hasRoute, generatorOpen, plannerExiting, ctaHasInteracted, quickRouteControls]);

  // ✅ SOFT NUDGE: when pins are already ready and user edits pins again
  useEffect(() => {
    if (!pinsReady) return;
    if (generatorOpen || plannerExiting) return;
    if (hasOpenedPlannerOnce) return;

    if (softNudgeTimerRef.current) window.clearTimeout(softNudgeTimerRef.current);

    softNudgeTimerRef.current = window.setTimeout(() => {
      const now = Date.now();
      const COOLDOWN_MS = 8000;

      if (now - lastSoftNudgeAtRef.current < COOLDOWN_MS) return;

      lastSoftNudgeAtRef.current = now;
      setCtaSoftNudgeNonce((n) => n + 1);
    }, 700);

    return () => {
      if (softNudgeTimerRef.current) window.clearTimeout(softNudgeTimerRef.current);
    };
  }, [lastPinEditAt, pinsReady, generatorOpen, plannerExiting, hasOpenedPlannerOnce]);

  const useReturnBounce = ctaBounceNonce > 0;
  const usePinsReadyCallout = !useReturnBounce && ctaPinsReadyNudgeNonce > 0;
  const useSoftNudge = !useReturnBounce && !usePinsReadyCallout && ctaSoftNudgeNonce > 0;

  const allowInitialPulse = !ctaHasInteracted && !pinsReady;

  return (
    <main className="fixed inset-0 bg-white overscroll-none" aria-label="Dashboard">
      {/* MAP */}
      <div
        className={`absolute inset-0 z-0 transition-opacity duration-200 ${
          searchActive ? "opacity-60" : "opacity-100"
        }`}
      >
        <DashboardMap
          destination={destination}
          clearRouteNonce={clearRouteNonce}
          routeRequestNonce={routeRequestNonce}
          routeActive={hasRoute}
          onRouteDrawn={handleRouteDrawn}
          onDestinationPicked={(loc) => {
            setDestination({ name: loc.name, lat: loc.lat, lng: loc.lng });
            setHasRoute(false);
            setPlannerTo(loc.name);
            setIsTooFar(false);
            notePinEdited();
          }}
          onFromPicked={(loc) => {
            setFromLocation({ name: loc.name, lat: loc.lat, lng: loc.lng });
            notePinEdited();
          }}
          fromLocation={fromLocation}
          recenterNonce={recenterNonce}
        />
      </div>

      {/* HEADER */}
      <header
        className="fixed top-0 left-0 right-0 z-[90] pointer-events-none"
        style={{ height: HEADER_H }}
      >
        <div className={`pointer-events-auto h-full ${glassBar} border-b border-white/25`}>
          <DashboardHeader user={user} />
        </div>
      </header>

      {/* CONTENT REGION (over map) */}
      <div
        className="fixed left-0 right-0 z-[50] overflow-visible pointer-events-none"
        style={{
          top: HEADER_H,
          bottom: `calc(${FOOTER_H}px + env(safe-area-inset-bottom))`,
        }}
      >
        <div className="relative h-full w-full pointer-events-none">
          {!generatorOpen && !plannerExiting && (
            <div className="absolute top-3 left-0 right-0 z-[60] flex justify-center px-2.5 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-[min(100%,48rem)] px-1">
                <div className="flex flex-col gap-3">
                  {useReturnBounce ? (
                    <motion.div
                      key={`return-${ctaBounceNonce}`}
                      initial={{ y: 0, scale: 1 }}
                      animate={{ y: [0, -5, 0], scale: [1, 1.008, 1] }}
                      transition={{ duration: 0.36, ease: "easeOut" }}
                    >
                      <PlannerCTA
                        onClick={() => {
                          setCtaHasInteracted(true);
                          setHasOpenedPlannerOnce(true);
                          setPlannerExiting(false);
                          setGeneratorOpen(true);
                        }}
                      />
                    </motion.div>
                  ) : usePinsReadyCallout ? (
                    <motion.div
                      key={`pins-ready-${ctaPinsReadyNudgeNonce}`}
                      className="relative"
                      initial={{ scale: 1, y: 0, opacity: 1 }}
                      animate={{ y: [0, -3, 0], scale: [1, 1.01, 1] }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    >
                      {/* softer ring */}
                      <motion.div
                        aria-hidden="true"
                        className={["pointer-events-none absolute -inset-2", CTA_ROUNDED].join(" ")}
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: [0, 0.25, 0], scale: [0.99, 1.01, 1.015] }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        style={{
                          border: "1px solid rgba(255,255,255,0.45)",
                          boxShadow: "0 0 0 4px rgba(59,130,246,0.10)",
                        }}
                      />

                      <PlannerCTA
                        onClick={() => {
                          setCtaHasInteracted(true);
                          setHasOpenedPlannerOnce(true);
                          setPlannerExiting(false);
                          setGeneratorOpen(true);
                        }}
                      />
                    </motion.div>
                  ) : useSoftNudge ? (
                    <motion.div
                      key={`soft-${ctaSoftNudgeNonce}`}
                      className="relative"
                      initial={{ scale: 1, y: 0 }}
                      animate={{ scale: [1, 1.01, 1], y: [0, -3, 0] }}
                      transition={{ duration: 0.32, ease: "easeOut" }}
                    >
                      <motion.div
                        aria-hidden="true"
                        className={["pointer-events-none absolute -inset-2", CTA_ROUNDED].join(" ")}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.18, 0] }}
                        transition={{ duration: 0.55, ease: "easeOut" }}
                        style={{
                          border: "1px solid rgba(255,255,255,0.40)",
                          boxShadow: "0 0 0 4px rgba(59,130,246,0.08)",
                        }}
                      />

                      <PlannerCTA
                        onClick={() => {
                          setCtaHasInteracted(true);
                          setHasOpenedPlannerOnce(true);
                          setPlannerExiting(false);
                          setGeneratorOpen(true);
                        }}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 1 }}
                      animate={allowInitialPulse ? HEARTBEAT : { scale: 1 }}
                      transition={{
                        duration: 2.2,
                        ease: "easeInOut",
                        repeat: allowInitialPulse ? Infinity : 0,
                      }}
                    >
                      <PlannerCTA
                        onClick={() => {
                          setCtaHasInteracted(true);
                          setHasOpenedPlannerOnce(true);
                          setPlannerExiting(false);
                          setGeneratorOpen(true);
                        }}
                      />
                    </motion.div>
                  )}

                  {/* ✅ Quick Route */}
                  <AnimatePresence initial={false}>
                    {pinsReady && !hasRoute && !generatorOpen && !plannerExiting && (
                      <motion.div
                        key={`quick-route-${ctaBounceNonce}`}
                        initial={{ opacity: 0, y: 10, scale: 0.99 }}
                        animate={QUICK_ROUTE_BOUNCE_IN}
                        exit={{ opacity: 0, y: 6, scale: 0.99 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        style={{ willChange: "transform" }}
                      >
                        <motion.button
                          type="button"
                          onClick={handleQuickRoutePress}
                          disabled={quickRouteAnimatingRef.current}
                          animate={quickRouteControls}
                          style={{ transformOrigin: "center", willChange: "transform" }}
                          className={
                            "group relative w-full overflow-hidden " +
                            CTA_ROUNDED +
                            " px-4 py-2.5 " +
                            "text-sm font-semibold text-slate-900/90 " +
                            "bg-white/12 saturate-150 " +
                            "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
                            "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
                            "before:pointer-events-none before:absolute before:inset-0 " +
                            "before:bg-gradient-to-b before:from-white/20 before:to-transparent"
                          }
                        >
                          <span className="block text-left">Quick Route</span>

                          <ChevronRight
                            className={[
                              "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2",
                              "h-6 w-6 shrink-0 text-slate-900/80 transition-transform duration-200",
                              "group-hover:translate-x-1",
                              "group-active:translate-x-1",
                              "group-focus-visible:translate-x-1",
                            ].join(" ")}
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ✅  RECENTER button */}
                  {/* ✅ RECENTER (right side, above Clear Route) */}
                  <div
                    className="fixed right-3 z-[80] pointer-events-auto"
                    style={{
                      // ClearRoute sits at +0.75rem; this places Recenter one button+gap above it (48px + 12px = 60px = 3.75rem)
                      bottom: `calc(${FOOTER_H}px + env(safe-area-inset-bottom) + 0.75rem + 3.75rem)`,
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Recenter map"
                      disabled={recenterDisabled}
                      onClick={() => setRecenterNonce((n) => n + 1)}
                      className={[
                        "relative flex items-center justify-center transition active:scale-95 disabled:cursor-default overflow-hidden",
                        "rounded-2xl",
                      ].join(" ")}
                      style={{
                        width: 48,
                        height: 48,
                        background: recenterDisabled
                          ? "rgba(160,170,185,0.18)"
                          : "rgba(255,255,255,0.22)",
                        border: recenterDisabled
                          ? "1px solid rgba(255,255,255,0.22)"
                          : "1px solid rgba(255,255,255,0.40)",
                        backdropFilter: "blur(26px)",
                        WebkitBackdropFilter: "blur(26px)",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)",
                      }}
                    >
                      {/* Top highlight layer (matches ClearRouteButton) */}
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none rounded-2xl"
                        style={{
                          background:
                            "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
                        }}
                      />

                      {/* Crosshair icon (consistent stroke + weight) */}
                      <svg
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        fill="none"
                        stroke={recenterStrokeColor}
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="relative z-10"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="3.5" />
                        <path d="M12 2v4" />
                        <path d="M12 18v4" />
                        <path d="M2 12h4" />
                        <path d="M18 12h4" />
                      </svg>
                    </button>
                  </div>

                  {/* ✅ CLEAR ROUTE (kept where you placed it) */}
                  <div
                    className="fixed right-3 z-[80] pointer-events-auto"
                    style={{
                      bottom: `calc(${FOOTER_H}px + env(safe-area-inset-bottom) + 0.75rem)`,
                    }}
                  >
                    <ClearRouteButton onClick={handleClearRoute} disabled={!hasRoute} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div
            className="fixed left-3 z-[79] pointer-events-auto"
            style={{
              bottom: `calc(${FOOTER_H}px + env(safe-area-inset-bottom) + 5.125rem)`,
            }}
          >
            <DashboardLegend visible={!!destination} />
          </div>

          {/* ✅ PLANNER PANEL */}
          <AnimatePresence
            initial={false}
            onExitComplete={() => {
              setPlannerExiting(false);
              setCtaBounceNonce((n) => n + 1);
            }}
          >
            {generatorOpen && (
              <motion.div
                key="planner-panel"
                className="absolute top-3 left-0 right-0 z-[200] flex justify-center px-2.5 pointer-events-none"
                initial={{ y: 0, scale: 1, opacity: 1 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: [0, -10, 14], scale: [1, 1.015, 0.98], opacity: [1, 1, 0] }}
                transition={{ duration: 0.42, ease: [0.22, 1.25, 0.36, 1] }}
              >
                <div className="pointer-events-auto w-full max-w-[min(100%,48rem)] px-1">
                  <DownhillGenerator
                    fromLabel={fromLabelDisplay}
                    blocked={isTooFar}
                    initialTo={plannerTo}
                    onToChange={(value) => {
                      setPlannerTo(value);
                      setIsTooFar(false);
                    }}
                    open={generatorOpen}
                    onClose={closePlannerWithExitThenBounceCTA}
                    onGenerate={handleGenerate}
                    onDestinationSelected={(loc) => {
                      setDestination({ name: loc.name, lat: loc.lat, lng: loc.lng });
                      setHasRoute(false);
                      setPlannerTo(loc.name);
                      setIsTooFar(false);
                      notePinEdited();
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <QuickActionsSheet
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        onUseLocation={() => {}}
        onStartRoute={() => setQaOpen(false)}
        onViewSaved={() => {}}
      />

      {/* FOOTER */}
      <footer className="fixed left-0 right-0 bottom-0 z-[90] pointer-events-none">
        <div className={`pointer-events-auto ${glassBar} border-t border-white/25`}>
          <div className="flex justify-center" style={{ height: FOOTER_H }}>
            <div className="flex items-center justify-center w-full">
              <QuickActionsTrigger onOpen={() => setQaOpen(true)} />
            </div>
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </footer>
    </main>
  );
}
