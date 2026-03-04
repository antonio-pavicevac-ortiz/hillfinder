"use client";

import ClearRouteButton from "@/components/dashboard/ClearRouteButton";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { DashboardLegendPanel } from "@/components/dashboard/DashboardLegend";
import DashboardMap from "@/components/dashboard/DashboardMap";
import DownhillGenerator from "@/components/dashboard/DownhillGenerator";
import PlannerCTA from "@/components/dashboard/PlannerCTA";
import QuickActionsSheet from "@/components/dashboard/QuickActionSheet";
import QuickActionsTrigger from "@/components/dashboard/QuickActionsTrigger";
import { milesBetween } from "@/lib/map/milesBetween";
import type { DashboardUser } from "@/types/user";
import {
  AnimatePresence,
  motion,
  TargetAndTransition,
  useAnimationControls,
  useDragControls,
} from "framer-motion";
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
    ease: [0.22, 1, 0.36, 1],
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

const QUICK_ROUTE_ROUNDED = "rounded-2xl";

// ✅ Single sheet: full card slides down until only the pill is left peeking
const PLANNER_OPEN_H = 420;

// pill-only peek height (tweak 22–36 to taste)
const PLANNER_PEEK_H = 34; // enough to show the internal pill area
// how far the sheet can slide down
const PLANNER_MIN_Y = PLANNER_OPEN_H - PLANNER_PEEK_H;
const PLANNER_HIDE_Y = PLANNER_MIN_Y + 220;

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
  const [legendOpen, setLegendOpen] = useState(false);
  const legendWrapRef = useRef<HTMLDivElement | null>(null);
  const legendButtonRef = useRef<HTMLButtonElement | null>(null);
  const legendPopoverRef = useRef<HTMLDivElement | null>(null);
  const [legendSide, setLegendSide] = useState<"left" | "right">("left");

  // ✅ dims map while planner is open
  const [searchActive, setSearchActive] = useState(false);

  // ✅ Keep the planner mounted so the “peek card + pill” is always visible
  const [generatorOpen, setGeneratorOpen] = useState(true);

  // ✅ Start in “peek” mode (card is visible, only the pill affordance)
  const [generatorMinimized, setGeneratorMinimized] = useState(true);

  // ✅ drag controls (only the gray pill should initiate drag)
  const plannerDragControls = useDragControls();

  const [destination, setDestination] = useState<Destination | null>(null);

  // --- Refs to hold the latest values synchronously
  const fromLocationRef = useRef<FromLocation | null>(null);
  const destinationRef = useRef<Destination | null>(null);

  const [hasRoute, setHasRoute] = useState(false);

  // tells the map to clear itself without refs
  const [clearRouteNonce, setClearRouteNonce] = useState(0);

  // ✅ used to re-trigger bounce when returning from planner
  const [ctaBounceNonce, setCtaBounceNonce] = useState(0);

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

  const plannerFullyOpen = generatorOpen && !generatorMinimized;

  // ----------------------------
  // ✅ PIN-BASED CTA CALLOUT LOGIC
  // ----------------------------

  const pinsReady = !!fromLocation && !!destination;

  const [ctaPinsReadyNudgeNonce, setCtaPinsReadyNudgeNonce] = useState(0);
  const [ctaSoftNudgeNonce, setCtaSoftNudgeNonce] = useState(0);
  const [hasOpenedPlannerOnce, setHasOpenedPlannerOnce] = useState(false);

  const [lastPinEditAt, setLastPinEditAt] = useState(0);
  const lastSoftNudgeAtRef = useRef(0);
  const prevPinsReadyRef = useRef(false);
  const softNudgeTimerRef = useRef<number | null>(null);

  const quickRouteControls = useAnimationControls();
  const quickRouteAnimatingRef = useRef(false);
  const quickRoutePulseTimerRef = useRef<number | null>(null);

  const [plannerPulseOn, setPlannerPulseOn] = useState(true);
  const plannerPulseTimerRef = useRef<number | null>(null);

  const [recenterNonce, setRecenterNonce] = useState(0);
  const recenterDisabled = !fromLocation;
  const recenterStrokeColor = recenterDisabled ? "rgba(100,116,139,0.95)" : "rgba(15,23,42,0.95)";

  // ✅ Match Undo behavior: legend is only usable when a route exists
  const legendDisabled = !hasRoute;
  const legendStrokeColor = legendDisabled ? "rgba(100,116,139,0.95)" : "rgba(15,23,42,0.95)";

  const [routeAlternativesNonce, setRouteAlternativesNonce] = useState(0);
  const [variantsReady, setVariantsReady] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<"easy" | "hard" | null>(null);

  const allowInitialPulse = !ctaHasInteracted && !pinsReady;

  const [resolving, setResolving] = useState(false);
  const resolvingStartRef = useRef<number>(0);
  const resolvingHideTimerRef = useRef<number | null>(null);
  const resolvingFailTimerRef = useRef<number | null>(null);

  function stopResolving() {
    if (resolvingHideTimerRef.current) {
      window.clearTimeout(resolvingHideTimerRef.current);
      resolvingHideTimerRef.current = null;
    }
    if (resolvingFailTimerRef.current) {
      window.clearTimeout(resolvingFailTimerRef.current);
      resolvingFailTimerRef.current = null;
    }
    setResolving(false);
  }

  function handleGenerateAlternatives() {
    resolvingStartRef.current = Date.now();
    setResolving(true);

    if (resolvingFailTimerRef.current) window.clearTimeout(resolvingFailTimerRef.current);

    resolvingFailTimerRef.current = window.setTimeout(() => {
      stopResolving();
      showBanner("Still working… try again or pick a closer destination.", {
        tone: "neutral",
        duration: 4200,
      });
    }, 12000);

    setVariantsReady(false);
    setSelectedVariant(null);
    setRouteAlternativesNonce((n) => n + 1);
  }

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

    toast(message, { duration });
  }

  function showPinsReadyHint() {
    showBanner("Pins set — tap Quick Route", {
      tone: "neutral",
      duration: 4200,
    });
  }

  function normalizePlace(s: string) {
    return s.trim().toLowerCase().replace(/\s+/g, " ");
  }

  useEffect(() => {
    fromLocationRef.current = fromLocation;
  }, [fromLocation]);

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  function notePinEdited() {
    setLastPinEditAt(Date.now());
  }

  function minimizePlanner() {
    setGeneratorOpen(true);
    setGeneratorMinimized(true);
    setSearchActive(false);
    setCtaBounceNonce((n) => n + 1);
  }

  function openPlanner() {
    setPlannerPulseOn(false);
    setCtaHasInteracted(true);
    setHasOpenedPlannerOnce(true);

    setGeneratorOpen(true);
    setGeneratorMinimized(false);

    setSearchActive(true);
  }

  async function handleGenerate(params: { from: string; to: string; variant: "easy" | "hard" }) {
    const silent = (): never => {
      const err = new Error("HF_GUARDRAIL");
      (err as any).hfSilent = true;
      throw err;
    };

    const showGuard = (msg: string): never => {
      showBanner(msg, { tone: "error", duration: 4200 });
      return silent();
    };

    const from = fromLocationRef.current ?? fromLocation;
    if (!from) return showGuard("Pick a start location first.");

    const dest = destinationRef.current ?? destination;
    if (!dest) return showGuard("Pick a destination first.");

    const destName = dest.name ?? "";
    if (!destName || normalizePlace(destName) !== normalizePlace(params.to)) {
      return showGuard("Please choose a destination from the list (or tap the map) to confirm it.");
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

    // ✅ keep map + UI aligned to the variant they picked
    setSelectedVariant(params.variant);

    handleGenerateAlternatives();
  }

  function handleRouteDrawn() {
    setHasRoute(true);

    setSearchActive(false);
    minimizePlanner();
  }

  function handleClearRoute() {
    stopResolving();
    setHasRoute(false);
    setVariantsReady(false);
    setSelectedVariant(null);
    setClearRouteNonce((n) => n + 1);
    setLegendOpen(false);
  }
  useEffect(() => {
    if (!legendOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLegendOpen(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      // If click is on the button, let the normal handler run.
      if (legendButtonRef.current && legendButtonRef.current.contains(t)) return;

      // If click is inside the wrapper or inside the popover, keep open.
      const inWrap = !!legendWrapRef.current && legendWrapRef.current.contains(t);
      const inPopover = !!legendPopoverRef.current && legendPopoverRef.current.contains(t);
      if (inWrap || inPopover) return;

      setLegendOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [legendOpen]);

  useEffect(() => {
    if (!legendOpen) return;

    const btn = legendButtonRef.current;
    if (!btn) return;

    // Decide which side has room. Prefer opening to the right of the icon,
    // but if we’re near the screen edge, flip to the left.
    const rect = btn.getBoundingClientRect();
    const POPOVER_W = 270; // keep in sync with popover width + padding/shadows
    const GAP = 12;

    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;

    if (spaceRight >= POPOVER_W + GAP) setLegendSide("right");
    else if (spaceLeft >= POPOVER_W + GAP) setLegendSide("left");
    else setLegendSide("left");
  }, [legendOpen]);

  function canQuickRoute(): boolean {
    const from = fromLocationRef.current ?? fromLocation;
    const dest = destinationRef.current ?? destination;

    if (!from) {
      showBanner("Pick a start location first.", { tone: "error", duration: 4200 });
      return false;
    }
    if (!dest) {
      showBanner("Drop a destination pin first.", { tone: "error", duration: 4200 });
      return false;
    }

    const MAX_MILES = 20;
    const d = milesBetween(from, dest);

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
    setPlannerPulseOn(false);
    setCtaHasInteracted(true);
    setHasOpenedPlannerOnce(true);

    setHasRoute(false);
    setVariantsReady(false);
    setSelectedVariant(null);

    handleGenerateAlternatives();
  }

  async function handleQuickRoutePress() {
    if (!canQuickRoute()) return;
    if (quickRouteAnimatingRef.current) return;

    quickRouteAnimatingRef.current = true;

    runQuickRoute();

    try {
      quickRouteControls.stop();
      quickRouteControls.set({ opacity: 1, scale: 1 });

      await quickRouteControls.start({
        scale: 1.02,
        transition: { duration: 0.08, ease: "easeOut" },
      });

      await quickRouteControls.start({
        scale: 0.97,
        opacity: 0,
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
      });

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
    return () => {
      window.clearTimeout(t);
      if (resolvingHideTimerRef.current) window.clearTimeout(resolvingHideTimerRef.current);
    };
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
      if (quickRoutePulseTimerRef.current) window.clearTimeout(quickRoutePulseTimerRef.current);
      if (plannerPulseTimerRef.current) window.clearTimeout(plannerPulseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const prev = prevPinsReadyRef.current;
    prevPinsReadyRef.current = pinsReady;

    if (!prev && pinsReady && !plannerFullyOpen && !hasOpenedPlannerOnce) {
      setPlannerPulseOn(false);
      setCtaPinsReadyNudgeNonce((n) => n + 1);
      showPinsReadyHint();
    }
  }, [pinsReady, plannerFullyOpen, hasOpenedPlannerOnce]);

  useEffect(() => {
    const shouldShowQuick = pinsReady && !hasRoute && !plannerFullyOpen;

    const clearPulseTimer = () => {
      if (quickRoutePulseTimerRef.current) {
        window.clearTimeout(quickRoutePulseTimerRef.current);
        quickRoutePulseTimerRef.current = null;
      }
    };

    if (!shouldShowQuick) {
      quickRouteAnimatingRef.current = false;

      clearPulseTimer();
      quickRouteControls.stop();
      quickRouteControls.set({ opacity: 1, scale: 1 });
      return;
    }

    clearPulseTimer();
    quickRouteControls.stop();
    quickRouteControls.set({ opacity: 1, scale: 1 });

    if (!ctaHasInteracted) {
      quickRouteControls.start(HEARTBEAT);

      quickRoutePulseTimerRef.current = window.setTimeout(() => {
        quickRouteControls.stop();
        quickRouteControls.set({ opacity: 1, scale: 1 });
        quickRoutePulseTimerRef.current = null;
      }, 19200);
    }

    return () => clearPulseTimer();
  }, [pinsReady, hasRoute, plannerFullyOpen, ctaHasInteracted, quickRouteControls]);

  useEffect(() => {
    if (!pinsReady) return;
    if (plannerFullyOpen) return;
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
  }, [lastPinEditAt, pinsReady, plannerFullyOpen, hasOpenedPlannerOnce]);

  useEffect(() => {
    const clear = () => {
      if (plannerPulseTimerRef.current) {
        window.clearTimeout(plannerPulseTimerRef.current);
        plannerPulseTimerRef.current = null;
      }
    };

    if (!allowInitialPulse) {
      clear();
      setPlannerPulseOn(false);
      return;
    }

    setPlannerPulseOn(true);
    clear();
    plannerPulseTimerRef.current = window.setTimeout(() => {
      setPlannerPulseOn(false);
      plannerPulseTimerRef.current = null;
    }, 19200);

    return () => clear();
  }, [allowInitialPulse]);

  useEffect(() => {
    if (fromLocation) return;

    if (!("geolocation" in navigator)) {
      setFromLabelDisplay("Tap map to set start");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const next = { lat, lng, name: "Current location" } as FromLocation;
        fromLocationRef.current = next;
        setFromLocation(next);
      },
      () => {
        setFromLabelDisplay("Tap map to set start");
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30_000,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useReturnBounce = ctaBounceNonce > 0;
  const usePinsReadyCallout = !useReturnBounce && ctaPinsReadyNudgeNonce > 0;
  const useSoftNudge = !useReturnBounce && !usePinsReadyCallout && ctaSoftNudgeNonce > 0;

  const showQuickRouteCTA = pinsReady && !hasRoute;
  const showPlannerCTA = !showQuickRouteCTA;

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
          routeActive={hasRoute}
          onRouteDrawn={handleRouteDrawn}
          onDestinationPicked={(loc) => {
            const next = { name: loc.name, lat: loc.lat, lng: loc.lng } as Destination;
            destinationRef.current = next;
            setDestination(next);

            setPlannerPulseOn(false);
            setHasRoute(false);
            setClearRouteNonce((n) => n + 1);

            setVariantsReady(false);
            setSelectedVariant(null);

            setPlannerTo(loc.name);
            setIsTooFar(false);
            notePinEdited();
          }}
          onFromPicked={(loc) => {
            const next = { name: loc.name, lat: loc.lat, lng: loc.lng } as FromLocation;
            fromLocationRef.current = next;
            setFromLocation(next);

            setHasRoute(false);
            setClearRouteNonce((n) => n + 1);
            setVariantsReady(false);
            setSelectedVariant(null);

            notePinEdited();
          }}
          fromLocation={fromLocation}
          recenterNonce={recenterNonce}
          routeAlternativesNonce={routeAlternativesNonce}
          selectedVariant={selectedVariant}
          onVariantsReady={() => {
            setVariantsReady(true);
            setSelectedVariant((prev) => prev ?? "easy");
            setHasRoute(true);

            if (resolvingFailTimerRef.current) window.clearTimeout(resolvingFailTimerRef.current);

            const MIN_MS = 450;
            const elapsed = Date.now() - resolvingStartRef.current;
            const remaining = Math.max(0, MIN_MS - elapsed);

            if (resolvingHideTimerRef.current) window.clearTimeout(resolvingHideTimerRef.current);

            resolvingHideTimerRef.current = window.setTimeout(() => {
              stopResolving();
            }, remaining);
          }}
          onVariantSelected={(v) => setSelectedVariant(v)}
        />
      </div>

      {/* ✅ RESOLVING OVERLAY */}
      <AnimatePresence>
        {resolving && (
          <motion.div
            className="fixed inset-0 z-[999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            aria-label="Finding route"
            role="status"
          >
            <div className="absolute inset-0 bg-black/18 backdrop-blur-[6px]" />
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <motion.div
                initial={{ scale: 0.98, y: 6, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.985, y: 4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
                className="relative"
              >
                <div
                  aria-hidden="true"
                  className="absolute -inset-3 rounded-[28px] pointer-events-none"
                  style={{
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 0 26px rgba(16,185,129,0.22)",
                  }}
                />
                <div
                  className={[
                    "relative",
                    "rounded-2xl px-5 py-4",
                    "bg-slate-950/90",
                    "border border-white/20",
                    "shadow-[0_34px_90px_rgba(0,0,0,0.70)]",
                    "backdrop-blur-[32px]",
                  ].join(" ")}
                  style={{ pointerEvents: "auto", cursor: "wait" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-5 w-5 rounded-full border-[3px] border-white/30 border-t-emerald-400 border-r-emerald-300 animate-spin"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-white">Finding your route…</span>
                  </div>
                  <p className="mt-1 text-xs text-white/70">This should only take a moment.</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {/* ✅ TOP OVERLAY AREA */}
          <div className="absolute top-3 left-0 right-0 z-[210] flex justify-center px-2.5 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-[min(100%,48rem)] px-1">
              <div className="flex flex-col gap-3">
                {/* ✅ CTAs exist when planner is NOT fully open (closed or peek) */}
                {(!generatorOpen || generatorMinimized) && (
                  <>
                    {showPlannerCTA &&
                      (useReturnBounce ? (
                        <motion.div
                          key={`return-${ctaBounceNonce}`}
                          initial={{ y: 0, scale: 1 }}
                          animate={{ y: [0, -5, 0], scale: [1, 1.008, 1] }}
                          transition={{ duration: 0.36, ease: "easeOut" }}
                        >
                          <PlannerCTA onClick={openPlanner} />
                        </motion.div>
                      ) : usePinsReadyCallout ? (
                        <motion.div
                          key={`pins-ready-${ctaPinsReadyNudgeNonce}`}
                          className="relative"
                          initial={{ scale: 1, y: 0, opacity: 1 }}
                          animate={{ y: [0, -3, 0], scale: [1, 1.01, 1] }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        >
                          <motion.div
                            aria-hidden="true"
                            className={[
                              "pointer-events-none absolute -inset-2",
                              QUICK_ROUTE_ROUNDED,
                            ].join(" ")}
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: [0, 0.25, 0], scale: [0.99, 1.01, 1.015] }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            style={{
                              border: "1px solid rgba(255,255,255,0.45)",
                              boxShadow: "0 0 0 4px rgba(59,130,246,0.10)",
                            }}
                          />
                          <PlannerCTA onClick={openPlanner} />
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
                            className={[
                              "pointer-events-none absolute -inset-2",
                              QUICK_ROUTE_ROUNDED,
                            ].join(" ")}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.18, 0] }}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                            style={{
                              border: "1px solid rgba(255,255,255,0.40)",
                              boxShadow: "0 0 0 4px rgba(59,130,246,0.08)",
                            }}
                          />
                          <PlannerCTA onClick={openPlanner} />
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 1 }}
                          animate={allowInitialPulse && plannerPulseOn ? HEARTBEAT : { scale: 1 }}
                        >
                          <PlannerCTA onClick={openPlanner} />
                        </motion.div>
                      ))}

                    {/* ✅ Quick Route */}
                    <AnimatePresence initial={false}>
                      {showQuickRouteCTA && (
                        <motion.div
                          key={`quick-route-${ctaBounceNonce}`}
                          initial={{ opacity: 0, y: 10, scale: 0.99 }}
                          animate={QUICK_ROUTE_BOUNCE_IN}
                          exit={{ opacity: 0, y: 6, scale: 0.99 }}
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
                              QUICK_ROUTE_ROUNDED +
                              " px-4 py-3 " +
                              "bg-white/12 saturate-150 " +
                              "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
                              "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
                              "before:pointer-events-none before:absolute before:inset-0 " +
                              "before:bg-gradient-to-b before:from-white/20 before:to-transparent"
                            }
                          >
                            <span className="relative z-10 block pr-10 text-left">
                              <span className="block text-sm font-semibold leading-none text-black">
                                Quick Route
                              </span>

                              <ChevronRight
                                className={[
                                  "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2",
                                  "h-5 w-5 shrink-0 text-black transition-transform duration-200",
                                  "group-hover:translate-x-1",
                                  "group-active:translate-x-1",
                                  "group-focus-visible:translate-x-1",
                                ].join(" ")}
                                strokeWidth={2.5}
                                aria-hidden="true"
                              />
                            </span>
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Plan Route Instead */}
                    <AnimatePresence initial={false}>
                      {showQuickRouteCTA && !plannerFullyOpen && (
                        <motion.div
                          key={`plan-instead-${ctaBounceNonce}`}
                          initial={{ opacity: 0, y: 10, scale: 0.99 }}
                          animate={QUICK_ROUTE_BOUNCE_IN}
                          exit={{ opacity: 0, y: 6, scale: 0.99 }}
                          style={{ willChange: "transform" }}
                        >
                          <motion.button
                            type="button"
                            onClick={openPlanner}
                            whileTap={{ scale: 0.98 }}
                            className={
                              "group relative w-full overflow-hidden " +
                              QUICK_ROUTE_ROUNDED +
                              " px-4 py-3 " +
                              "bg-white/12 saturate-150 " +
                              "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
                              "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
                              "before:pointer-events-none before:absolute before:inset-0 " +
                              "before:bg-gradient-to-b before:from-white/20 before:to-transparent"
                            }
                          >
                            <span className="relative z-10 block pr-10 text-left">
                              <span className="block text-sm font-semibold leading-none text-black">
                                Plan Route Instead
                              </span>

                              <ChevronRight
                                className={[
                                  "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2",
                                  "h-5 w-5 shrink-0 text-black transition-transform duration-200",
                                  "group-hover:translate-x-1",
                                  "group-active:translate-x-1",
                                  "group-focus-visible:translate-x-1",
                                ].join(" ")}
                                strokeWidth={2.5}
                                aria-hidden="true"
                              />
                            </span>
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

                {/* ✅ Legend + Right controls share the same Y */}
                <div className="mt-2 flex items-start justify-between gap-3 pointer-events-auto">
                  {/* ✅ Right buttons */}
                  <div className="flex justify-end mt-2 pointer-events-auto">
                    <div className="flex flex-col items-end gap-3">
                      {/* Recenter */}
                      <button
                        type="button"
                        aria-label="Recenter map"
                        disabled={recenterDisabled}
                        onClick={() => setRecenterNonce((n) => n + 1)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
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
                        <div
                          aria-hidden
                          className="absolute inset-0 pointer-events-none rounded-2xl"
                          style={{
                            background:
                              "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
                          }}
                        />
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

                      {/* Clear */}
                      <div onPointerDownCapture={(e) => e.stopPropagation()}>
                        <ClearRouteButton onClick={handleClearRoute} disabled={!hasRoute} />
                      </div>

                      {/* Legend: icon + popover */}
                      <div className="relative pointer-events-auto" ref={legendWrapRef}>
                        <button
                          type="button"
                          aria-label={legendOpen ? "Hide legend" : "Show legend"}
                          aria-pressed={legendOpen}
                          ref={legendButtonRef}
                          disabled={legendDisabled}
                          onClick={() => {
                            if (legendDisabled) return;
                            setLegendOpen((v) => !v);
                          }}
                          onPointerDownCapture={(e) => e.stopPropagation()}
                          className={[
                            "relative flex items-center justify-center transition active:scale-95 disabled:cursor-default overflow-hidden",
                            "rounded-2xl",
                          ].join(" ")}
                          style={{
                            width: 48,
                            height: 48,
                            background: legendDisabled
                              ? "rgba(160,170,185,0.18)"
                              : "rgba(255,255,255,0.22)",
                            border: legendDisabled
                              ? "1px solid rgba(255,255,255,0.22)"
                              : "1px solid rgba(255,255,255,0.40)",
                            backdropFilter: "blur(26px)",
                            WebkitBackdropFilter: "blur(26px)",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)",
                          }}
                        >
                          <div
                            aria-hidden
                            className="absolute inset-0 pointer-events-none rounded-2xl"
                            style={{
                              background:
                                "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
                            }}
                          />

                          {/* “list/legend” icon */}
                          <svg
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                            fill="none"
                            stroke={legendStrokeColor}
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="relative z-10"
                            aria-hidden="true"
                          >
                            <circle cx="6" cy="7" r="1.6" />
                            <circle cx="6" cy="12" r="1.6" />
                            <circle cx="6" cy="17" r="1.6" />
                            <path d="M10 7h8" />
                            <path d="M10 12h8" />
                            <path d="M10 17h8" />
                          </svg>
                        </button>

                        <AnimatePresence>
                          {legendOpen && (
                            <motion.div
                              ref={legendPopoverRef}
                              initial={{
                                opacity: 0,
                                x: legendSide === "right" ? -8 : 8,
                                scale: 0.985,
                              }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{
                                opacity: 0,
                                x: legendSide === "right" ? -8 : 8,
                                scale: 0.985,
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 520,
                                damping: 34,
                                mass: 0.9,
                              }}
                              className={[
                                "absolute top-[calc(100%+10px)]",
                                legendSide === "right"
                                  ? "left-[calc(48px+12px)]"
                                  : "right-[calc(48px+12px)]",
                                "w-[260px]",
                                "rounded-2xl border border-white/30",
                                "bg-white/20 saturate-150",
                                "shadow-[0_10px_34px_rgba(0,0,0,0.18)]",
                                "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)]",
                                "overflow-hidden",
                              ].join(" ")}
                              style={{
                                pointerEvents: "auto",
                                transformOrigin: legendSide === "right" ? "left top" : "right top",
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <div className="relative px-4 py-3">
                                {/* ✅ explicit close button so you can ALWAYS close it */}
                                <button
                                  type="button"
                                  aria-label="Close legend"
                                  onClick={() => setLegendOpen(false)}
                                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 border border-white/30 text-slate-900/80 active:scale-95"
                                >
                                  <span className="text-base leading-none">×</span>
                                </button>

                                <DashboardLegendPanel />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ PLANNER SHEET (single card; minimized = card slides down; pill is the only handle) */}
          {generatorOpen && (
            <div
              className="fixed left-0 right-0 z-[220] flex justify-center px-2.5 pointer-events-none"
              style={{
                bottom: `calc(${FOOTER_H}px + env(safe-area-inset-bottom) + 10px)`,
              }}
            >
              {/* wrapper stays non-interactive so map can pan */}
              <div className="w-full max-w-[min(100%,48rem)] px-1 pointer-events-none relative">
                {/* ✅ THE ONE REAL SHEET */}
                <motion.div
                  className="w-full"
                  initial={false}
                  animate={{ y: generatorMinimized ? PLANNER_MIN_Y : 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.9 }}
                  drag="y"
                  dragControls={plannerDragControls}
                  onPointerDown={(e) => e.stopPropagation()}
                  dragListener={false} // ✅ only pill / handle can start drag
                  dragConstraints={{ top: 0, bottom: PLANNER_HIDE_Y }}
                  dragElastic={0.14}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    const shouldDismiss =
                      generatorMinimized && (info.offset.y > 185 || info.velocity.y > 1250);
                    const shouldMinimize = info.offset.y > 90 || info.velocity.y > 900;
                    const shouldOpen = info.offset.y < -40 || info.velocity.y < -600;

                    if (shouldDismiss) {
                      // ✅ fully hide the planner card
                      setGeneratorOpen(false);
                      setGeneratorMinimized(false);
                      return;
                    }

                    if (shouldMinimize) minimizePlanner();
                    else if (shouldOpen) openPlanner();
                  }}
                  style={{
                    // ✅ IMPORTANT: don’t disable pointer events when minimized,
                    // otherwise the *real* gray pill can’t start the drag.
                    pointerEvents: "auto",
                    touchAction: "auto",
                  }}
                >
                  <DownhillGenerator
                    fromLabel={fromLabelDisplay}
                    blocked={isTooFar || !fromLocation}
                    initialTo={plannerTo}
                    onToChange={(value) => {
                      setPlannerTo(value);
                      setIsTooFar(false);

                      if (
                        destination?.name &&
                        normalizePlace(destination.name) !== normalizePlace(value)
                      ) {
                        destinationRef.current = null;
                        setDestination(null);

                        setHasRoute(false);
                        setVariantsReady(false);
                        setSelectedVariant(null);
                      }
                    }}
                    open={true}
                    onClose={minimizePlanner}
                    onMinimize={minimizePlanner}
                    onHandlePointerDown={(e) => {
                      e.stopPropagation();
                      plannerDragControls.start(e);
                    }}
                    onGenerate={handleGenerate}
                    onDestinationSelected={(loc) => {
                      const next = { name: loc.name, lat: loc.lat, lng: loc.lng } as Destination;
                      destinationRef.current = next;
                      setDestination(next);

                      setPlannerPulseOn(false);

                      setHasRoute(false);
                      setVariantsReady(false);
                      setSelectedVariant(null);

                      setPlannerTo(loc.name);
                      setIsTooFar(false);
                      notePinEdited();
                    }}
                    variantsReady={variantsReady}
                    selectedVariant={selectedVariant}
                    onVariantSelected={(v) => setSelectedVariant(v)}
                  />
                </motion.div>

                {/* ✅ INVISIBLE HANDLE OVERLAY (no second pill UI) */}
                {generatorMinimized && (
                  <div
                    className="absolute left-0 right-0 pointer-events-auto"
                    style={{
                      bottom: 0,
                      // Covers the visible “peek” strip (where the *internal* pill is),
                      // plus a bit of extra finger room.
                      height: PLANNER_PEEK_H + 18,
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Open route planner"
                      onClick={openPlanner}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        plannerDragControls.start(e);
                      }}
                      style={{ touchAction: "none" }}
                      className="h-full w-full bg-transparent"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
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
