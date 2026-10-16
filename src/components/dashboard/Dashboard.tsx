"use client";

import { AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import DashboardMap from "@/components/dashboard/map/DashboardMap";
import MapControls from "@/components/dashboard/map/MapControls";
import NavigationCard from "@/components/dashboard/map/NavigationCard";

import DashboardHeader from "@/components/dashboard/ui/DashboardHeader";
import QuickActionsTrigger from "@/components/dashboard/ui/QuickActionsTrigger";

import DownhillGenerator from "@/components/dashboard/modals/DownhillGenerator";
import QuickActionsSheet from "@/components/dashboard/modals/QuickActionSheet";
import RecentRoutesPanel from "@/components/dashboard/RecentRoutesPanel";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import PortraitOrientationOverlay from "@/components/dashboard/ui/PortraitOrientationOverlay";

import type { SaveRoutePayload, SavedRouteRecord } from "@/types/saved-route";
import type { DashboardUser } from "@/types/user";

import { useTheme } from "next-themes";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  clearDashboardSession,
  loadDashboardSession,
  saveDashboardSession,
  sessionPayloadToRecord,
  savedRouteExists,
} from "@/lib/session/dashboardSession";
import { haversineMeters } from "@/lib/geo/distance";
import { formatDuration, formatStepDistance } from "@/lib/navigation/format";
import {
  initialNavigationState,
  navigationReducer,
  type LiveNavLocation,
} from "@/lib/navigation/navigationState";
import { shouldAdvanceStep } from "@/lib/navigation/progress";
import {
  buildTerrainNarrations,
  findUpcomingTerrainNarration,
  type TerrainNarration,
} from "@/lib/navigation/terrainNarration";
import {
  DEFAULT_TERRAIN_VOICE_STYLE,
  STYLE_TTS,
  TERRAIN_STYLE_STORAGE_KEY,
  type TerrainVoiceStyle,
} from "@/lib/navigation/terrainPhrases";

type Destination = { lat: number; lng: number; name?: string };
type FromLocation = { lat: number; lng: number; name?: string };

type Variant = "easy" | "hard";
type ActiveRouteSource = "generated" | "saved" | null;

const HEADER_H = 64;
const FOOTER_H = 56;

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const QUICK_ACTIONS_HINT_STORAGE_KEY = "hf_quick_actions_hint_shown";
// GPS wanders a few metres while standing still; only count movement past this
const RIDE_MIN_MOVE_METERS = 8;

// "350 ft" reads aloud as letters on some voices
function spokenDistance(meters: number) {
  return formatStepDistance(meters).replace(/ ft$/, " feet").replace(/ mi$/, " miles");
}

const glassBar =
  "relative bg-white/12 saturate-150 " +
  "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
  "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
  "before:pointer-events-none before:absolute before:inset-0 " +
  "before:bg-gradient-to-b before:from-white/20 before:to-transparent";

type DashboardProps = {
  user?: DashboardUser;
  voiceEnabled: boolean;
  setVoiceEnabled: (next: boolean) => void;
};

export default function Dashboard({ user, voiceEnabled, setVoiceEnabled }: DashboardProps) {
  const [qaOpen, setQaOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [routesOpen, setRoutesOpen] = useState(false);

  const [hasRoute, setHasRoute] = useState(false);

  const [fromLocation, setFromLocation] = useState<FromLocation | null>(null);
  // True once the rider picks a start in Plan Your Route; until then the start follows GPS
  const [startPinned, setStartPinned] = useState(false);
  const [destination, setDestination] = useState<Destination | null>(null);

  const [plannerTo, setPlannerTo] = useState("");
  const [variantsReady, setVariantsReady] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  const [routeAlternativesNonce, setRouteAlternativesNonce] = useState(0);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [recenterActive, setRecenterActive] = useState(false);
  const [clearRouteNonce, setClearRouteNonce] = useState(0);
  const [clearDestinationNonce, setClearDestinationNonce] = useState(0);
  const [findDownhillNonce, setFindDownhillNonce] = useState(0);

  const quickRouteEnabled = !!destination;

  const [blocked, setBlocked] = useState(false);
  const hasShownUndoHintRef = useRef(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routePreparing, setRoutePreparing] = useState(false);
  const [loadingSavedRoute, setLoadingSavedRoute] = useState<SavedRouteRecord | null>(null);
  const loadingSavedRouteRef = useRef<SavedRouteRecord | null>(null);

  function endSavedRouteLoading() {
    loadingSavedRouteRef.current = null;
    setLoadingSavedRoute(null);
  }


  const [activeRouteToSave, setActiveRouteToSave] = useState<SaveRoutePayload | null>(null);
  const [selectedSavedRoute, setSelectedSavedRoute] = useState<SavedRouteRecord | null>(null);
  const [refreshRoutesKey, setRefreshRoutesKey] = useState(0);
  const [activeRouteSource, setActiveRouteSource] = useState<ActiveRouteSource>(null);
  const [savedRouteEntry, setSavedRouteEntry] = useState<{
    id: string;
    route: SaveRoutePayload;
  } | null>(null);
  const [checkingSavedRoute, setCheckingSavedRoute] = useState<SaveRoutePayload | null>(null);
  const savedRouteVerificationRef = useRef<{ id: string; controller: AbortController } | null>(null);
  const activeSavedRouteId =
    activeRouteSource === "saved"
      ? selectedSavedRoute?._id ?? null
      : activeRouteToSave && savedRouteEntry?.route === activeRouteToSave
        ? savedRouteEntry.id
        : null;

  const router = useRouter();
  const searchParams = useSearchParams();
  const sharedRouteId = searchParams.get("sharedRoute");
  const handledSharedRouteRef = useRef<string | null>(null);
  const hasShownVoiceHintRef = useRef(false);
  const navCardTimerRef = useRef<number | null>(null);
  const routeReadySpeechTimerRef = useRef<number | null>(null);
  const navStartLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasMovedSinceRouteLoadRef = useRef(false);

  const terrainNarrationsRef = useRef<TerrainNarration[]>([]);
  const lastTerrainSpokenAtRef = useRef<number>(0);
  const spokenTerrainIndicesRef = useRef<Set<number>>(new Set());

  const [navigation, dispatchNavigation] = useReducer(navigationReducer, initialNavigationState);
  const [isNavMuted, setIsNavMuted] = useState(true);
  const [showNavigationCard, setShowNavigationCard] = useState(false);
  const activeNavSteps = navigation.steps;
  const currentStepIndex = navigation.currentStepIndex;
  const isNavigating = navigation.status === "navigating";
  const liveNavLocation = navigation.liveLocation;
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [rejoinRouteNonce, setRejoinRouteNonce] = useState(0);
  const [rejoinRequested, setRejoinRequested] = useState(false);
  // Set for a new route from where the rider is: they're mid-ride and asked for it, so it
  // starts navigating as soon as it's ready instead of opening as a preview
  const startNavigationWhenPreparedRef = useRef(false);
  const [routeOverviewNonce, setRouteOverviewNonce] = useState(0);
  const rideRef = useRef<{ startedAt: number; meters: number; lastPoint: LiveNavLocation | null }>({
    startedAt: 0,
    meters: 0,
    lastPoint: null,
  });
  const [rideSummary, setRideSummary] = useState<{ seconds: number; meters: number } | null>(null);
  // Meters left while the rider rides to the start of the route; null once on it
  const [metersToStart, setMetersToStart] = useState<number | null>(null);
  const isHeadingToStart = isNavigating && metersToStart != null;

  const currentNavStep = activeNavSteps[currentStepIndex];
  const nextNavStep = activeNavSteps[currentStepIndex + 1];
  const maneuverTargetStep = nextNavStep?.location ? nextNavStep : currentNavStep;
  const distanceTargetStep = maneuverTargetStep;

  const [lockPortrait, setLockPortrait] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme === "dark" ? "dark" : "light") as "light" | "dark";
  const isOnline = useOnlineStatus();

  // ── Session restore ────────────────────────────────────────────────────────
  // Runs once on mount. Reads persisted session from localStorage and
  // rehydrates Dashboard state without triggering new API/route requests.
  useEffect(() => {
    const session = loadDashboardSession();
    if (!session?.routePayload) return;

    const payload = session.routePayload;

    if (session.fromLocation) setFromLocation(session.fromLocation);
    if (session.destination) {
      setDestination(session.destination);
      setPlannerTo(session.destination.name ?? "");
    }
    if (session.selectedVariant) setSelectedVariant(session.selectedVariant);
    // The synthetic map record is not proof that this route exists in storage.
    setActiveRouteSource("generated");
    setActiveRouteToSave(payload);
    setHasRoute(true);
    setVariantsReady(true);

    if (payload.navSteps?.length) {
      dispatchNavigation({ type: "LOAD_STEPS", steps: payload.navSteps });
    }

    // Synthetic SavedRouteRecord triggers DashboardMap.loadSavedRoute after
    // the Mapbox map is ready — no route API calls are made.
    setSelectedSavedRoute(sessionPayloadToRecord(payload));
    const id = session.savedRouteId;
    if (!id) return;
    const controller = new AbortController();
    savedRouteVerificationRef.current = { id, controller };
    setCheckingSavedRoute(payload);
    void savedRouteExists(id, controller.signal)
      .then((exists) => {
        if (!controller.signal.aborted && exists) setSavedRouteEntry({ id, route: payload });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        // A failed connection does not prove deletion. Preserve the saved ID.
        setSavedRouteEntry({ id, route: payload });
        toast.warning("Couldn't verify saved route. Refresh when you're online.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCheckingSavedRoute(null);
        if (savedRouteVerificationRef.current?.controller === controller) savedRouteVerificationRef.current = null;
      });
    return () => controller.abort();
  }, []);

  let distanceToNextStepMeters: number | null = null;

  if (liveNavLocation && distanceTargetStep?.location) {
    distanceToNextStepMeters = haversineMeters(
      [liveNavLocation.lng, liveNavLocation.lat],
      distanceTargetStep.location
    );
  }

  const TOO_FAR_KM = 30;
  const MIN_MOVE_BEFORE_AUTO_ADVANCE_METERS = 12;
  const STEP_ADVANCE_THRESHOLD_METERS = 18;

  // Routes open as a preview; tracking, following and step guidance begin only when the rider
  // taps Start. Voice is separate: it decides whether the steps are spoken
  function startNavigation() {
    rideRef.current = { startedAt: Date.now(), meters: 0, lastPoint: null };
    setRideSummary(null);
    dispatchNavigation({ type: "GO_TO_STEP", index: 0 });
    dispatchNavigation({ type: "START" });
  }

  // End (mid-ride) and Done (after arriving) both go back to the preview of the same route,
  // so the rider can look it over or tap Start again
  function endNavigation() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setRideSummary(null);
    setRejoinRequested(false);
    dispatchNavigation({ type: "STOP" });
    setRouteOverviewNonce((n) => n + 1);
  }

  function speakSystemPrompt(message: string) {
    if (!message) return;

    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;

    synth.cancel();

    synth.resume();

    const utterance = new SpeechSynthesisUtterance(message);

    utterance.rate = 1;

    utterance.pitch = 1;

    console.log("[Dashboard][TTS system] speak()", message);

    synth.speak(utterance);
  }

  function commitDestination(next: Destination, opts?: { showQuickActionsHint?: boolean }) {
    if (fromLocation) {
      const km = haversineMeters([fromLocation.lng, fromLocation.lat], [next.lng, next.lat]) / 1000;
      if (km > TOO_FAR_KM) {
        setBlocked(true);
        setDestination(null);
        setPlannerTo(next.name ?? "");
        clearRoute();
        setClearDestinationNonce((n) => n + 1);
        toast.error("That destination is too far. Try something closer.", {
          id: "destination-too-far",
        });
        return false;
      }
    }

    setBlocked(false);
    setDestination(next);
    setPlannerTo(next.name ?? "");
    clearRoute();

    const shouldShowQuickActionsHint = opts?.showQuickActionsHint !== false;
    const hasPersistedQuickActionsHint =
      typeof window !== "undefined" &&
      window.localStorage.getItem(QUICK_ACTIONS_HINT_STORAGE_KEY) === "true";

    if (
      shouldShowQuickActionsHint &&
      !hasShownUndoHintRef.current &&
      !hasPersistedQuickActionsHint
    ) {
      toast(
        <div className="flex items-center justify-center text-center leading-snug">
          <span className="text-lg leading-none pr-1">🌿</span>

          <span className="mt-1">Tap Quick Actions to explore routes</span>
        </div>,
        {
          id: "undo-destination-hint",
          duration: 4000,
          className: "hf-toast",
        }
      );

      hasShownUndoHintRef.current = true;
      window.localStorage.setItem(QUICK_ACTIONS_HINT_STORAGE_KEY, "true");
    }

    return true;
  }

  function handleStartSelected(next: FromLocation) {
    if (destination) {
      const km = haversineMeters([next.lng, next.lat], [destination.lng, destination.lat]) / 1000;
      if (km > TOO_FAR_KM) {
        toast.error("That start is too far from your destination. Try something closer.", {
          id: "start-too-far",
        });
        return false;
      }
    }

    setStartPinned(true);
    setFromLocation(next);
    // The route on the map began somewhere else
    if (hasRoute) clearRoute();
    return true;
  }

  function clearRoute() {
    startNavigationWhenPreparedRef.current = false;
    endSavedRouteLoading();
    setHasRoute(false);
    setVariantsReady(false);
    setSelectedVariant(null);
    setRouteBusy(false);
    setRoutePreparing(false);
    setActiveRouteToSave(null);
    setSelectedSavedRoute(null);

    setActiveRouteSource(null);

    setIsNavMuted(!voiceEnabled);
    if (navCardTimerRef.current) {
      window.clearTimeout(navCardTimerRef.current);

      navCardTimerRef.current = null;
    }

    if (routeReadySpeechTimerRef.current) {
      window.clearTimeout(routeReadySpeechTimerRef.current);

      routeReadySpeechTimerRef.current = null;
    }

    setShowNavigationCard(false);

    navStartLocationRef.current = null;
    hasMovedSinceRouteLoadRef.current = false;
    dispatchNavigation({ type: "LOAD_STEPS", steps: [] });

    dispatchNavigation({ type: "STOP" });
    setClearRouteNonce((n) => n + 1);
  }

  function handleDeletedRoute(routeId: string) {
    if (savedRouteVerificationRef.current?.id === routeId) {
      savedRouteVerificationRef.current.controller.abort();
      savedRouteVerificationRef.current = null;
      setCheckingSavedRoute(null);
    }
    setRefreshRoutesKey((n) => n + 1);
    setSavedRouteEntry((entry) => (entry?.id === routeId ? null : entry));

    const wasActive = selectedSavedRoute?._id === routeId;

    if (wasActive) {
      // Deleting storage does not discard the route currently on the map.
      setSelectedSavedRoute(null);
      setActiveRouteSource("generated");
    }

    toast.success("Saved route deleted");
  }

  async function waitForMapStateToSettle() {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  function handleRouteReady() {
    setHasRoute(true);
    setGeneratorOpen(false);
  }

  function handleRoutePrepared() {
    if (startNavigationWhenPreparedRef.current) {
      startNavigationWhenPreparedRef.current = false;
      startNavigation();
    }
    setRouteBusy(false);
    setRoutePreparing(false);
    setVariantsReady(true);
    setHasRoute(true);
    setGeneratorOpen(false);
  }

  function handleRouteFailed(message?: string) {
    startNavigationWhenPreparedRef.current = false;
    endSavedRouteLoading();
    setRouteBusy(false);
    setRoutePreparing(false);

    setVariantsReady(false);
    setHasRoute(false);

    setActiveRouteToSave(null);
    setSelectedSavedRoute(null);
    setActiveRouteSource(null);

    setIsNavMuted(true);
    if (navCardTimerRef.current) {
      window.clearTimeout(navCardTimerRef.current);
      navCardTimerRef.current = null;
    }

    if (routeReadySpeechTimerRef.current) {
      window.clearTimeout(routeReadySpeechTimerRef.current);

      routeReadySpeechTimerRef.current = null;
    }

    setShowNavigationCard(false);

    navStartLocationRef.current = null;
    hasMovedSinceRouteLoadRef.current = false;

    dispatchNavigation({ type: "LOAD_STEPS", steps: [] });
    dispatchNavigation({ type: "STOP" });

    if (message) {
      toast.error(message);
    }
  }

  async function handleQuickRoute(opts?: { fromHereMidRide?: boolean }) {
    const fromHereMidRide = opts?.fromHereMidRide ?? false;

    if (!isOnline) {
      toast.error("You're offline. Route generation needs a connection.", { id: "offline-action" });
      return;
    }

    if (routeBusy) return;

    if (!fromLocation) {
      toast.error("Need your location first");

      return;
    }

    if (!destination) {
      toast.error("Pick a destination first");

      return;
    }

    setQaOpen(false);

    setRoutesOpen(false);

    if (voiceEnabled) {
      speakSystemPrompt(
        fromHereMidRide ? "Finding a new route from here." : "Voice guidance on. Finding your route."
      );
    }

    // Quick Route starts where the rider is. Clearing moves the start marker there, once
    // unpinned (the map reads the pin during render, before the clear runs)
    setStartPinned(false);
    clearRoute();
    startNavigationWhenPreparedRef.current = fromHereMidRide;
    setVariantsReady(false);
    // Mid-ride, keep the difficulty the rider chose
    if (!fromHereMidRide) setSelectedVariant("easy");
    setActiveRouteSource("generated");

    setRouteBusy(true);
    setRoutePreparing(true);
    await waitForMapStateToSettle();
    // setRouteAlternativesNonce((n) => n + 1);
    setRouteAlternativesNonce((n) => {
      const next = n + 1;
      return next;
    });
  }

  function handlePlanRoute() {
    endSavedRouteLoading();
    setQaOpen(false);
    setRoutesOpen(false);
    setVariantsReady(false);
    setSelectedVariant(null);
    setGeneratorOpen(true);
  }

  useEffect(() => {
    const VOICE_HINT_STORAGE_KEY = "hf_voice_hint_shown";

    const NAV_CARD_DELAY_AFTER_VOICE_HINT_MS = 3800;

    const NAV_CARD_FAST_DELAY_MS = 700;
    if (!hasRoute || !activeNavSteps.length) return;

    if (!isNavMuted) {
      if (navCardTimerRef.current) {
        window.clearTimeout(navCardTimerRef.current);

        navCardTimerRef.current = null;
      }

      setShowNavigationCard(true);

      return;
    }

    const hasPersistedVoiceHint =
      typeof window !== "undefined" &&
      window.localStorage.getItem(VOICE_HINT_STORAGE_KEY) === "true";

    const shouldShowVoiceHint = !hasShownVoiceHintRef.current && !hasPersistedVoiceHint;

    if (shouldShowVoiceHint) {
      toast("Tap the speaker button to enable voice guidance", {
        id: "voice-guidance-hint",
        duration: 3500,
        icon: "🔊",
        className: "hf-toast hf-toast-centered",
      });

      hasShownVoiceHintRef.current = true;

      window.localStorage.setItem(VOICE_HINT_STORAGE_KEY, "true");
    }

    if (showNavigationCard) return;
    if (navCardTimerRef.current) return;

    navCardTimerRef.current = window.setTimeout(
      () => {
        setShowNavigationCard(true);

        navCardTimerRef.current = null;
      },

      shouldShowVoiceHint ? NAV_CARD_DELAY_AFTER_VOICE_HINT_MS : NAV_CARD_FAST_DELAY_MS
    );
  }, [hasRoute, activeNavSteps.length, isNavMuted, showNavigationCard]);

  useEffect(() => {
    if (!sharedRouteId) return;
    if (handledSharedRouteRef.current === sharedRouteId) return;

    handledSharedRouteRef.current = sharedRouteId;

    let cancelled = false;

    async function loadSharedRouteIntoDashboard() {
      if (!navigator.onLine) {
        toast.error("Can't load shared route while offline.");
        return;
      }

      try {
        setRouteBusy(true);
        setActiveRouteSource("saved");

        const res = await fetch(`/api/routes/${sharedRouteId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch shared route");
        }

        const data = await res.json();
        const route: SavedRouteRecord = data.route;

        if (cancelled) return;

        setSelectedSavedRoute(route);
        setStartPinned(false);
        setFromLocation(route.from);
        setDestination(route.to);
        setPlannerTo(route.to.name ?? "");
        setSelectedVariant(route.difficulty);
        setHasRoute(true);

        dispatchNavigation({ type: "LOAD_STEPS", steps: route.navSteps ?? [] });

        navStartLocationRef.current = {
          lat: route.from.lat,
          lng: route.from.lng,
        };
        hasMovedSinceRouteLoadRef.current = false;

        setActiveRouteToSave({
          name: route.name,
          from: route.from,
          to: route.to,
          difficulty: route.difficulty,
          coords: route.coords,
          elevations: route.elevations,
          segments: route.segments,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          navSteps: route.navSteps ?? [],
        });

        toast.success("Shared route opened");
        router.replace("/dashboard");
      } catch (err) {
        console.error("[Dashboard][SharedRoute]", err);
        handledSharedRouteRef.current = null;
        toast.error("Could not open shared route");
      } finally {
        if (!cancelled) {
          setRouteBusy(false);
        }
      }
    }

    loadSharedRouteIntoDashboard();

    return () => {
      cancelled = true;
    };
  }, [sharedRouteId, router]);

  useEffect(() => {
    if (navigation.status !== "navigating") return;
    if (isNavMuted) return;
    // The first step is spoken on reaching the start
    if (isHeadingToStart) return;

    const step = navigation.steps[navigation.currentStepIndex];
    if (!step?.instruction) return;
    if (navigation.hasSpokenCurrentStep) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    synth.cancel();
    synth.resume();
    const spokenInstruction = step.instruction;

    const utterance = new SpeechSynthesisUtterance(spokenInstruction);
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      dispatchNavigation({ type: "MARK_STEP_SPOKEN" });
    };

    const speakTimer = window.setTimeout(() => {
      synth.speak(utterance);
    }, 120);

    return () => {
      window.clearTimeout(speakTimer);
    };
  }, [
    navigation.status,
    navigation.currentStepIndex,
    navigation.hasSpokenCurrentStep,
    navigation.steps,
    isNavMuted,
    isHeadingToStart,
  ]);

  useEffect(() => {
    if (isNavMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [isNavMuted]);

  useEffect(() => {
    if (!isNavigating) return;
    if (isHeadingToStart) return;
    if (!liveNavLocation) return;
    if (!activeNavSteps.length) return;

    const currentStep = activeNavSteps[currentStepIndex];
    const nextStep = activeNavSteps[currentStepIndex + 1];
    const advanceTargetStep = nextStep?.location ? nextStep : currentStep;

    if (!currentStep || !advanceTargetStep) return;

    if (
      currentStepIndex === 0 &&
      navStartLocationRef.current &&
      !hasMovedSinceRouteLoadRef.current
    ) {
      const movedSinceLoad = haversineMeters(
        [navStartLocationRef.current.lng, navStartLocationRef.current.lat],
        [liveNavLocation.lng, liveNavLocation.lat]
      );

      if (movedSinceLoad < MIN_MOVE_BEFORE_AUTO_ADVANCE_METERS) {
        return;
      }

      hasMovedSinceRouteLoadRef.current = true;
    }

    const isLastStep = currentStepIndex >= activeNavSteps.length - 1;

    if (
      shouldAdvanceStep(liveNavLocation, advanceTargetStep, STEP_ADVANCE_THRESHOLD_METERS) &&
      !isLastStep
    ) {
      dispatchNavigation({ type: "ADVANCE_STEP" });
    }
  }, [
    isNavigating,
    isHeadingToStart,
    liveNavLocation,
    activeNavSteps,
    currentStepIndex,
    MIN_MOVE_BEFORE_AUTO_ADVANCE_METERS,
    STEP_ADVANCE_THRESHOLD_METERS,
  ]);

  useEffect(() => {
    if (!isNavigating) return;
    if (isHeadingToStart) return;
    if (!liveNavLocation) return;
    if (!destination) return;
    if (navigation.status === "completed") return;

    const distanceToDestination = haversineMeters(
      [liveNavLocation.lng, liveNavLocation.lat],
      [destination.lng, destination.lat]
    );

    const ARRIVAL_THRESHOLD_METERS = 18;

    if (distanceToDestination <= ARRIVAL_THRESHOLD_METERS) {
      dispatchNavigation({ type: "COMPLETE" });
    }
  }, [isNavigating, isHeadingToStart, liveNavLocation, destination, navigation.status]);

  // Distance ridden, for the arrival summary. The ride begins at the route's start
  useEffect(() => {
    if (!isNavigating || isHeadingToStart || !liveNavLocation) return;

    const ride = rideRef.current;
    if (!ride.lastPoint) {
      ride.lastPoint = liveNavLocation;
      return;
    }

    const moved = haversineMeters(
      [ride.lastPoint.lng, ride.lastPoint.lat],
      [liveNavLocation.lng, liveNavLocation.lat]
    );
    if (moved < RIDE_MIN_MOVE_METERS) return;

    ride.meters += moved;
    ride.lastPoint = liveNavLocation;
  }, [isNavigating, isHeadingToStart, liveNavLocation]);

  // Arrival can come from reaching the destination or from stepping onto the last step,
  // so react to the status rather than to either cause
  const prevNavigationStatusRef = useRef(navigation.status);
  useEffect(() => {
    const prevStatus = prevNavigationStatusRef.current;
    prevNavigationStatusRef.current = navigation.status;
    if (navigation.status !== "completed" || prevStatus !== "navigating") return;

    const ride = rideRef.current;
    setRideSummary({
      seconds: ride.startedAt ? (Date.now() - ride.startedAt) / 1000 : 0,
      meters: ride.meters,
    });

    if (!isNavMuted) speakSystemPrompt("You have arrived at your destination.");
  }, [navigation.status, isNavMuted]);

  // Leaving navigation ends any ride to the start
  useEffect(() => {
    if (!isNavigating) setMetersToStart(null);
  }, [isNavigating]);

  // Starting away from the route: point the rider to its start. Reaching it: the ride (and its
  // time and distance) begins there, and the first step is spoken
  const wasHeadingToStartRef = useRef(false);
  useEffect(() => {
    const wasHeadingToStart = wasHeadingToStartRef.current;
    wasHeadingToStartRef.current = isHeadingToStart;
    if (wasHeadingToStart === isHeadingToStart) return;

    if (isHeadingToStart) {
      if (!isNavMuted && metersToStart != null) {
        speakSystemPrompt(`Head to the start of your route, about ${spokenDistance(metersToStart)} away.`);
      }
      return;
    }
    if (!isNavigating) return;

    rideRef.current = { startedAt: Date.now(), meters: 0, lastPoint: null };
    if (liveNavLocation) {
      navStartLocationRef.current = { lat: liveNavLocation.lat, lng: liveNavLocation.lng };
      hasMovedSinceRouteLoadRef.current = false;
    }
    dispatchNavigation({ type: "RESET_STEP_SPOKEN" });
    // metersToStart and liveNavLocation are read at the transition, not tracked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHeadingToStart, isNavigating, isNavMuted]);

  // Off route: say so once. Back on route: repeat the current instruction, which the rider
  // may have missed and which is the useful thing to hear
  const wasOffRouteRef = useRef(false);
  useEffect(() => {
    const wasOffRoute = wasOffRouteRef.current;
    wasOffRouteRef.current = isOffRoute;
    if (wasOffRoute === isOffRoute) return;
    if (!isOffRoute) setRejoinRequested(false);
    if (!isNavigating || isNavMuted) return;

    if (isOffRoute) {
      speakSystemPrompt("You're off route.");
    } else {
      dispatchNavigation({ type: "RESET_STEP_SPOKEN" });
    }
  }, [isOffRoute, isNavigating, isNavMuted]);

  // Terrain narration — fires when GPS updates during active navigation
  useEffect(() => {
    if (!isNavigating) return;
    if (!liveNavLocation) return;
    if (isNavMuted) return;
    // Upcoming terrain is about the route, which the rider has left or not yet reached
    if (isOffRoute || isHeadingToStart) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const userCoord: [number, number] = [liveNavLocation.lng, liveNavLocation.lat];
    const result = findUpcomingTerrainNarration(
      userCoord,
      terrainNarrationsRef.current,
      lastTerrainSpokenAtRef.current,
      spokenTerrainIndicesRef.current
    );

    if (!result) return;

    const synth = window.speechSynthesis;
    if (synth.speaking) return; // don't interrupt an active turn instruction

    spokenTerrainIndicesRef.current.add(result.index);
    lastTerrainSpokenAtRef.current = Date.now();

    const utterance = new SpeechSynthesisUtterance(result.narration.phrase);
    const terrainStyle = (localStorage.getItem(TERRAIN_STYLE_STORAGE_KEY) as TerrainVoiceStyle) ?? DEFAULT_TERRAIN_VOICE_STYLE;
    const ttsSetting = STYLE_TTS[terrainStyle];
    utterance.rate = ttsSetting.rate;
    utterance.pitch = ttsSetting.pitch;
    synth.cancel();
    synth.resume();
    synth.speak(utterance);
  }, [isNavigating, liveNavLocation, isNavMuted, isOffRoute, isHeadingToStart]);

  // Reset terrain narrations when the route is cleared
  useEffect(() => {
    if (!hasRoute) {
      terrainNarrationsRef.current = [];
      spokenTerrainIndicesRef.current = new Set();
      lastTerrainSpokenAtRef.current = 0;
    }
  }, [hasRoute]);

  // ── Session persistence ────────────────────────────────────────────────────
  // Saves route session whenever a completed route payload is available.
  // Short-lived loading states are never in activeRouteToSave, so we never
  // persist partial in-flight state.
  useEffect(() => {
    if (!activeRouteToSave || checkingSavedRoute === activeRouteToSave) return;
    saveDashboardSession({
      fromLocation,
      destination,
      selectedVariant,
      activeRouteSource,
      routePayload: activeRouteToSave,
      savedRouteId: activeSavedRouteId,
    });
  }, [activeRouteToSave, fromLocation, destination, selectedVariant, activeRouteSource, activeSavedRouteId, checkingSavedRoute]);

  useEffect(() => {
    if (!isOnline) {
      toast("You're offline. Map and route generation features need a connection.", {
        id: "offline-status",
        duration: Infinity,
      });
    } else {
      toast.dismiss("offline-status");
    }
  }, [isOnline]);

  useEffect(() => {
    function syncSettings() {
      const savedPortrait = localStorage.getItem("hf_lock_portrait");
      if (savedPortrait) setLockPortrait(savedPortrait === "true");
    }

    syncSettings();
    setHydrated(true);

    window.addEventListener("hf-settings-updated", syncSettings);
    window.addEventListener("storage", syncSettings);

    return () => {
      window.removeEventListener("hf-settings-updated", syncSettings);
      window.removeEventListener("storage", syncSettings);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    setIsNavMuted(!voiceEnabled);
  }, [hydrated, voiceEnabled]);

  useEffect(() => {
    function handleFocus() {
      const savedPortrait = localStorage.getItem("hf_lock_portrait");
      if (savedPortrait) setLockPortrait(savedPortrait === "true");
    }

    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  if (!hydrated) return null;

  return (
    <main className="fixed inset-0 bg-background">
      {" "}
      <PortraitOrientationOverlay enabled={lockPortrait} />
      <MapControls
        hasRoute={hasRoute}
        onClearRoute={() => {
          clearRoute();
          clearDashboardSession();
        }}
        onRecenter={() => {
          setRecenterActive(true);
          setRecenterNonce((n) => n + 1);
        }}
        recenterActive={recenterActive}
        hasDestination={!!destination}
        onUndoDestination={() => {
          setClearDestinationNonce((n) => n + 1);
          setDestination(null);
          setPlannerTo("");
          setBlocked(false);
          setRouteBusy(false);
          clearRoute();
          clearDashboardSession();
        }}
        saveRoute={activeRouteToSave}
        onCreateRoute={handlePlanRoute}
        onRouteSaved={(routeId, route) => {
          setSavedRouteEntry({ id: routeId, route });
          setRefreshRoutesKey((n) => n + 1);
          toast.success("Route saved", {
            duration: 6000,
            actionButtonStyle: {
              marginLeft: 0,
              background: "transparent",
              color: "inherit",
              padding: "6px 0",
              height: "auto",
              borderRadius: 0,
              fontWeight: 700,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              whiteSpace: "nowrap",
            },
            action: {
              label: "View saved routes",
              onClick: () => {
                setQaOpen(false);
                setGeneratorOpen(false);
                setRoutesOpen(true);
              },
            },
          });
        }}
        savedRouteId={activeSavedRouteId}
        isCheckingSavedRoute={!!activeRouteToSave && checkingSavedRoute === activeRouteToSave}
        isActiveSavedRoute={activeRouteSource === "saved"}
      />
      <DashboardMap
        onSavedRouteLoaded={(routeId) => {
          const route = loadingSavedRouteRef.current;
          if (route?._id !== routeId) return;
          endSavedRouteLoading();
        }}
        onSavedRouteNeedsRegeneration={(reason) => {
          endSavedRouteLoading();
          savedRouteVerificationRef.current?.controller.abort();
          savedRouteVerificationRef.current = null;
          setCheckingSavedRoute(null);
          setSavedRouteEntry(null);
          setSelectedSavedRoute(null);
          setActiveRouteToSave(null);
          setActiveRouteSource("generated");
          setHasRoute(false);
          setVariantsReady(false);
          setRoutePreparing(true);
          setRouteBusy(true);
          clearDashboardSession();
          toast.info(reason === "missing-navigation"
            ? "This older route needs directions. Rebuilding it…"
            : "Finding a route without redundant detours…");
        }}
        theme={theme}
        destination={destination}
        fromLocation={fromLocation}
        startPinned={startPinned}
        recenterNonce={recenterNonce}
        onManualMapMove={() => setRecenterActive(false)}
        clearRouteNonce={clearRouteNonce}
        clearDestinationNonce={clearDestinationNonce}
        findDownhillNonce={findDownhillNonce}
        onRouteDrawn={handleRouteReady}
        onRouteFailed={handleRouteFailed}
        routeActive={hasRoute}
        routeAlternativesNonce={routeAlternativesNonce}
        selectedVariant={selectedVariant}
        onRouteBusyChange={setRouteBusy}
        onNavigationLocationChange={(loc) => {
          dispatchNavigation({ type: "SET_LOCATION", location: loc });
        }}
        onOffRouteChange={setIsOffRoute}
        onHeadToStartChange={setMetersToStart}
        rejoinRouteNonce={rejoinRouteNonce}
        routeOverviewNonce={routeOverviewNonce}
        onVariantsReady={() => {
          handleRoutePrepared();
        }}
        onVariantSelected={(v) => setSelectedVariant(v)}
        onFromPicked={(loc) => {
          setFromLocation({ lat: loc.lat, lng: loc.lng, name: loc.name });
        }}
        onDestinationPicked={(loc) => {
          const next = { name: loc.name, lat: loc.lat, lng: loc.lng };
          commitDestination(next);
        }}
        onRouteReady={(route) => {
          if (!route) return;

          setFromLocation(route.from);
          setDestination(route.to);
          setPlannerTo(route.to.name ?? "");

          dispatchNavigation({ type: "LOAD_STEPS", steps: route.navSteps ?? [] });

          setIsNavMuted(!voiceEnabled);

          setShowNavigationCard(true);

          dispatchNavigation({ type: "STOP" });
          navStartLocationRef.current = {
            lat: route.from.lat,
            lng: route.from.lng,
          };
          hasMovedSinceRouteLoadRef.current = false;

          const terrainStyle = (localStorage.getItem(TERRAIN_STYLE_STORAGE_KEY) as TerrainVoiceStyle) ?? DEFAULT_TERRAIN_VOICE_STYLE;
          terrainNarrationsRef.current = buildTerrainNarrations(route.segments ?? [], terrainStyle);
          spokenTerrainIndicesRef.current = new Set();
          lastTerrainSpokenAtRef.current = 0;

          // Drawing a restored route emits a new payload for the same coordinates.
          // Keep its existing object so the saved association/check remains valid.
          setActiveRouteToSave((current) => current?.coords === route.coords ? current : route);

          setActiveRouteSource((currentSource) => {
            if (currentSource === "saved") {
              return "saved";
            }

            setSelectedSavedRoute(null);
            return "generated";
          });
        }}
        onRoutePrepared={handleRoutePrepared}
        onVariantsCollapsed={({ message }) => {
          // This warning is useful when the user explicitly opens Plan Your Route
          // and expects distinct Easy/Hard options. Quick Route should quietly render
          // the best available route instead of showing a variant-comparison warning.
          if (!generatorOpen) return;

          toast(message, {
            id: "variants-collapsed",
            duration: 5000,
            icon: "⚠️",
          });
        }}
        savedRouteToLoad={selectedSavedRoute}
        isNavigating={isNavigating}
      />
      {!isOnline && (
        <div className="fixed inset-0 z-[10] flex items-center justify-center pointer-events-none">
          <div className="rounded-xl bg-slate-900/90 px-5 py-4 text-center shadow-xl border border-white/10">
            <p className="text-sm font-medium text-white">Map unavailable offline.</p>
          </div>
        </div>
      )}

      {(loadingSavedRoute || ((routeBusy || routePreparing) && !hasRoute && !generatorOpen)) && (
        <LoadingOverlay
          text={
            loadingSavedRoute
              ? "Loading saved route…"
              : activeRouteSource === "saved"
              ? "Rendering route..."
              : routePreparing
                ? "Preparing your route..."
                : "Generating route..."
          }
          tone="dark"
          showBackdrop
        />
      )}
      <header
        className="fixed top-0 left-0 right-0 z-[80] pointer-events-none"
        style={{ height: HEADER_H }}
      >
        <div className={`h-full ${glassBar} pointer-events-auto`}>
          <DashboardHeader user={user} />
        </div>
      </header>
      {routesOpen && (
        <div
          className="fixed left-4 right-4 z-20 pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
        >
          <div className="mx-auto max-w-[42rem] pb-3 pointer-events-auto">
            <RecentRoutesPanel
              open={routesOpen}
              onClose={() => setRoutesOpen(false)}
              refreshKey={refreshRoutesKey}
              onLoadRoute={(route) => {
                loadingSavedRouteRef.current = route;
                setLoadingSavedRoute(route);
                setRouteBusy(false);
                setSelectedSavedRoute(route);
                setStartPinned(false);
                setFromLocation(route.from);
                setDestination(route.to);
                setPlannerTo(route.to.name ?? "");
                setSelectedVariant(route.difficulty);
                setHasRoute(true);
                dispatchNavigation({ type: "LOAD_STEPS", steps: route.navSteps ?? [] });

                navStartLocationRef.current = {
                  lat: route.from.lat,
                  lng: route.from.lng,
                };
                hasMovedSinceRouteLoadRef.current = false;

                setVariantsReady(false);
                setRoutePreparing(true);
                setRoutesOpen(false);
                setActiveRouteSource("saved");

                setActiveRouteToSave({
                  name: route.name,
                  from: route.from,
                  to: route.to,
                  difficulty: route.difficulty,
                  coords: route.coords,
                  elevations: route.elevations,
                  segments: route.segments,
                  distanceMeters: route.distanceMeters,
                  durationSeconds: route.durationSeconds,
                  navSteps: route.navSteps ?? [],
                });

              }}
              activeRouteId={activeSavedRouteId}
              onDeletedRoute={handleDeletedRoute}
            />
          </div>
        </div>
      )}
      <AnimatePresence>
        {showNavigationCard &&
          !loadingSavedRoute &&
          hasRoute &&
          activeNavSteps.length > 0 &&
          currentNavStep?.instruction && (
            <NavigationCard
              currentInstruction={currentNavStep.instruction}
              distanceText={formatStepDistance(distanceToNextStepMeters)}
              nextInstruction={nextNavStep?.instruction}
              stepIndex={currentStepIndex}
              totalSteps={activeNavSteps.length}
              isPreview={navigation.status === "ready"}
              onStart={startNavigation}
              headToStartText={isHeadingToStart ? formatStepDistance(metersToStart) : undefined}
              isOffRoute={isOffRoute && isNavigating}
              isRejoinShown={rejoinRequested}
              canStartNewRoute={isOnline && !routeBusy}
              onBackToRoute={() => {
                setRejoinRequested(true);
                setRejoinRouteNonce((n) => n + 1);
              }}
              onNewRouteFromHere={() => {
                void handleQuickRoute({ fromHereMidRide: true });
              }}
              onEnd={endNavigation}
              isArrived={navigation.status === "completed"}
              destinationName={destination?.name}
              rideTimeText={
                rideSummary
                  ? rideSummary.seconds < 60
                    ? "Under 1 min"
                    : formatDuration(rideSummary.seconds)
                  : undefined
              }
              rideDistanceText={rideSummary ? formatStepDistance(rideSummary.meters) : undefined}
              onDone={endNavigation}
              isMuted={isNavMuted}
              onToggleMute={() => {
                const nextMuted = !isNavMuted;

                const nextVoiceEnabled = !nextMuted;

                setIsNavMuted(nextMuted);

                setVoiceEnabled(nextVoiceEnabled);

                // Voice only controls speech; Start is what begins navigation
                if (nextMuted) {
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                } else if (isNavigating) {
                  dispatchNavigation({ type: "RESET_STEP_SPOKEN" });
                }
              }}
              onPreviousStep={() => {
                dispatchNavigation({ type: "GO_TO_STEP", index: currentStepIndex - 1 });
              }}
              onNextStep={() => {
                dispatchNavigation({ type: "GO_TO_STEP", index: currentStepIndex + 1 });
              }}
            />
          )}
      </AnimatePresence>
      <footer className="fixed left-0 right-0 bottom-0 z-20 pointer-events-none">
        <div className={`${glassBar} border-t border-white/25 pointer-events-none`}>
          <div
            className="flex items-center justify-center pointer-events-none"
            style={{ height: FOOTER_H }}
          >
            <div className="pointer-events-auto">
              <QuickActionsTrigger onOpen={() => setQaOpen(true)} />
            </div>
          </div>
          <div className="h-[env(safe-area-inset-bottom)] pointer-events-none" />
        </div>
      </footer>
      <QuickActionsSheet
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        onQuickRoute={handleQuickRoute}
        onStartRoute={handlePlanRoute}
        onViewSaved={() => {
          setQaOpen(false);
          setGeneratorOpen(false);
          setRoutesOpen(true);
        }}
        onFindDownhill={async () => {
          if (!isOnline) {
            toast.error("You're offline. Route generation needs a connection.", { id: "offline-action" });
            return;
          }

          if (!fromLocation) {
            toast.error("Need your location first");

            return;
          }
          if (voiceEnabled) {
            speakSystemPrompt("Voice guidance on. Finding a downhill nearby.");
          }
          setQaOpen(false);
          setRoutesOpen(false);
          // A downhill near you starts from you
          setStartPinned(false);
          clearRoute();
          setDestination(null);
          setPlannerTo("");
          setBlocked(false);
          setClearDestinationNonce((n) => n + 1);
          setVariantsReady(false);
          setSelectedVariant("easy");
          setActiveRouteToSave(null);
          setSelectedSavedRoute(null);
          setActiveRouteSource("generated");

          setIsNavMuted(!voiceEnabled);
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }

          setShowNavigationCard(false);
          dispatchNavigation({ type: "LOAD_STEPS", steps: [] });
          dispatchNavigation({ type: "STOP" });
          setRouteBusy(true);
          setRoutePreparing(true);
          await waitForMapStateToSettle();
          setFindDownhillNonce((n) => n + 1);
        }}
        quickRouteEnabled={quickRouteEnabled}
        isOffline={!isOnline}
      />
      <DownhillGenerator
        open={generatorOpen}
        fromLabel={
          fromLocation?.name ?? (fromLocation ? "Current location" : "Tap map to set start")
        }
        startIsCurrentLocation={!startPinned}
        onStartSelected={handleStartSelected}
        onUseCurrentLocation={() => {
          setStartPinned(false);
          if (hasRoute) clearRoute();
        }}
        initialTo={plannerTo}
        onToChange={(next) => {
          setPlannerTo(next);
          setBlocked(false);
        }}
        onClose={() => setGeneratorOpen(false)}
        onMinimize={() => setGeneratorOpen(false)}
        onDestinationSelected={(loc) => {
          const next = {
            name: String(loc.name),

            lat: Number(loc.lat),

            lng: Number(loc.lng),
          };

          commitDestination(next, { showQuickActionsHint: false });
        }}
        variantsReady={variantsReady}
        selectedVariant={selectedVariant}
        onVariantSelected={(v) => setSelectedVariant(v)}
        onGenerate={async ({ variant }) => {
          if (!isOnline) {
            toast.error("You're offline. Route generation needs a connection.", { id: "offline-action" });
            return;
          }

          if (routeBusy) return;

          if (voiceEnabled) {
            speakSystemPrompt("Voice guidance on. Finding your route.");
          }

          setQaOpen(false);
          setRoutesOpen(false);

          clearRoute();
          setVariantsReady(false);
          setRouteBusy(true);
          setRoutePreparing(true);
          setSelectedVariant(variant);

          const q = plannerTo.trim();

          if (q && (!destination || (destination.name ?? "").trim() !== q)) {
            try {
              if (!MAPBOX_TOKEN) throw new Error("Missing token");

              const url =
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
                `?access_token=${MAPBOX_TOKEN}&autocomplete=false&limit=1&language=en`;

              const res = await fetch(url);
              const data = await res.json();
              const f = data?.features?.[0];
              const center = f?.center;

              if (Array.isArray(center) && center.length >= 2) {
                const next = {
                  name: f?.place_name ?? q,
                  lng: Number(center[0]),
                  lat: Number(center[1]),
                };

                const accepted = commitDestination(next, { showQuickActionsHint: false });
                if (!accepted) {
                  setRouteBusy(false);
                  throw Object.assign(new Error("blocked destination"), { hfSilent: true });
                }
              }
            } catch {
              setRouteBusy(false);
              throw Object.assign(new Error("geocoding failed"), { hfSilent: true });
            }
          }

          setSelectedVariant(variant);
          await waitForMapStateToSettle();
          setRouteAlternativesNonce((n) => n + 1);
        }}
        blocked={blocked}
        onToast={({ kind, message }) => {
          if (kind === "error") toast.error(message);
          else if (kind === "success") toast.success(message);
          else toast(message);
        }}
      />
    </main>
  );
}
