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

import type { SaveRoutePayload, SavedRouteRecord } from "@/types/saved-route";

import { useTheme } from "next-themes";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { haversineMeters } from "@/lib/geo/distance";
import { formatStepDistance } from "@/lib/navigation/format";
import { initialNavigationState, navigationReducer } from "@/lib/navigation/navigationState";
import { shouldAdvanceStep } from "@/lib/navigation/progress";
import {
  buildTerrainNarrations,
  findUpcomingTerrainNarration,
  TERRAIN_COOLDOWN_MS,
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

const glassBar =
  "relative bg-white/12 saturate-150 " +
  "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
  "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
  "before:pointer-events-none before:absolute before:inset-0 " +
  "before:bg-gradient-to-b before:from-white/20 before:to-transparent";

type DashboardProps = {
  voiceEnabled: boolean;
  setVoiceEnabled: (next: boolean) => void;
};

export default function Dashboard({ voiceEnabled, setVoiceEnabled }: DashboardProps) {
  const [qaOpen, setQaOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [routesOpen, setRoutesOpen] = useState(false);

  const [hasRoute, setHasRoute] = useState(false);

  const [fromLocation, setFromLocation] = useState<FromLocation | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);

  const [plannerTo, setPlannerTo] = useState("");
  const [variantsReady, setVariantsReady] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  const [routeAlternativesNonce, setRouteAlternativesNonce] = useState(0);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [clearRouteNonce, setClearRouteNonce] = useState(0);
  const [clearDestinationNonce, setClearDestinationNonce] = useState(0);
  const [findDownhillNonce, setFindDownhillNonce] = useState(0);

  const quickRouteEnabled = !!destination;

  const [blocked, setBlocked] = useState(false);
  const hasShownUndoHintRef = useRef(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routePreparing, setRoutePreparing] = useState(false);

  const [activeRouteToSave, setActiveRouteToSave] = useState<SaveRoutePayload | null>(null);
  const [selectedSavedRoute, setSelectedSavedRoute] = useState<SavedRouteRecord | null>(null);
  const [refreshRoutesKey, setRefreshRoutesKey] = useState(0);
  const [activeRouteSource, setActiveRouteSource] = useState<ActiveRouteSource>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const sharedRouteId = searchParams.get("sharedRoute");
  const handledSharedRouteRef = useRef<string | null>(null);
  const hasShownVoiceHintRef = useRef(false);
  const navCardTimerRef = useRef<number | null>(null);
  const routeReadySpeechTimerRef = useRef<number | null>(null);
  const navStartLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasAutoStartedVoiceRef = useRef(false);
  const lastSystemPromptSpokenAtRef = useRef<number | null>(null);
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

  const currentNavStep = activeNavSteps[currentStepIndex];
  const nextNavStep = activeNavSteps[currentStepIndex + 1];
  const maneuverTargetStep = nextNavStep?.location ? nextNavStep : currentNavStep;
  const distanceTargetStep = maneuverTargetStep;
  const [isLandscape, setIsLandscape] = useState(false);

  const [lockPortrait, setLockPortrait] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme === "dark" ? "dark" : "light") as "light" | "dark";
  const isOnline = useOnlineStatus();

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
  const VOICE_SYSTEM_PROMPT_GAP_MS = 3500;

  const VOICE_FIRST_INSTRUCTION_FALLBACK_DELAY_MS = 150;

  function speakSystemPrompt(message: string) {
    if (!message) return;

    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;

    synth.cancel();

    synth.resume();

    const utterance = new SpeechSynthesisUtterance(message);

    utterance.rate = 1;

    utterance.pitch = 1;

    lastSystemPromptSpokenAtRef.current = Date.now();

    console.log("[Dashboard][TTS system] speak()", message);

    synth.speak(utterance);
  }

  function speakNavigationInstruction(instruction?: string) {
    if (!instruction) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    synth.cancel();
    synth.resume();

    const utterance = new SpeechSynthesisUtterance(instruction);
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      console.log("[Dashboard][TTS direct] speaking started", instruction);
      dispatchNavigation({ type: "MARK_STEP_SPOKEN" });
    };

    utterance.onerror = (event) => {
      console.warn("[Dashboard][TTS direct] speech error", event);
    };

    console.log("[Dashboard][TTS direct] speak()", instruction);
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

  function clearRoute() {
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

    hasAutoStartedVoiceRef.current = false;

    setShowNavigationCard(false);

    navStartLocationRef.current = null;
    hasMovedSinceRouteLoadRef.current = false;
    dispatchNavigation({ type: "LOAD_STEPS", steps: [] });

    dispatchNavigation({ type: "STOP" });
    setClearRouteNonce((n) => n + 1);
  }

  function handleDeletedRoute(routeId: string) {
    setRefreshRoutesKey((n) => n + 1);

    const wasActive = selectedSavedRoute?._id === routeId;

    if (wasActive) {
      clearRoute();
      setDestination(null);
      setPlannerTo("");
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
    setRouteBusy(false);
    setRoutePreparing(false);
    setVariantsReady(true);
    setHasRoute(true);
    setGeneratorOpen(false);
  }

  function handleRouteFailed(message?: string) {
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

  function shortAreaName(name?: string) {
    if (!name) return "";
    const parts = name.split(",").map((p) => p.trim());
    return parts[1] || parts[0] || "";
  }

  async function handleQuickRoute() {
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
      speakSystemPrompt("Voice guidance on. Finding your route.");
    }

    clearRoute();
    setVariantsReady(false);
    setSelectedVariant("easy");
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
        setFromLocation(route.from);
        setDestination(route.to);
        setPlannerTo(route.to.name ?? "");
        setSelectedVariant(route.difficulty);
        setHasRoute(true);

        dispatchNavigation({ type: "LOAD_STEPS", steps: route.navSteps ?? [] });
        dispatchNavigation({ type: "START" });

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
  ]);

  useEffect(() => {
    if (isNavMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [isNavMuted]);

  useEffect(() => {
    if (!voiceEnabled) return;

    if (isNavMuted) return;

    if (!showNavigationCard) return;

    if (!hasRoute) return;

    if (!currentNavStep?.instruction) return;

    if (hasAutoStartedVoiceRef.current) return;

    hasAutoStartedVoiceRef.current = true;

    console.log("[Dashboard][voice auto-start effect]", {
      instruction: currentNavStep.instruction,

      currentStepIndex,

      stepsLength: activeNavSteps.length,
    });

    const elapsedSinceSystemPrompt = lastSystemPromptSpokenAtRef.current
      ? Date.now() - lastSystemPromptSpokenAtRef.current
      : Infinity;

    const firstInstructionDelay = Number.isFinite(elapsedSinceSystemPrompt)
      ? Math.max(
          VOICE_FIRST_INSTRUCTION_FALLBACK_DELAY_MS,

          VOICE_SYSTEM_PROMPT_GAP_MS - elapsedSinceSystemPrompt
        )
      : VOICE_FIRST_INSTRUCTION_FALLBACK_DELAY_MS;

    window.setTimeout(() => {
      dispatchNavigation({ type: "GO_TO_STEP", index: 0 });

      dispatchNavigation({ type: "RESET_STEP_SPOKEN" });

      dispatchNavigation({ type: "START" });
    }, firstInstructionDelay);
  }, [
    voiceEnabled,

    isNavMuted,

    showNavigationCard,

    hasRoute,

    currentNavStep?.instruction,

    currentStepIndex,

    activeNavSteps.length,
  ]);

  useEffect(() => {
    if (!isNavigating) return;
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
    liveNavLocation,
    activeNavSteps,
    currentStepIndex,
    MIN_MOVE_BEFORE_AUTO_ADVANCE_METERS,
    STEP_ADVANCE_THRESHOLD_METERS,
  ]);

  useEffect(() => {
    if (!isNavigating) return;
    if (!liveNavLocation) return;
    if (!destination) return;
    if (navigation.status === "completed") return;

    const distanceToDestination = haversineMeters(
      [liveNavLocation.lng, liveNavLocation.lat],
      [destination.lng, destination.lat]
    );

    const ARRIVAL_THRESHOLD_METERS = 18;

    if (distanceToDestination <= ARRIVAL_THRESHOLD_METERS) {
      if (!isNavMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
        const synth = window.speechSynthesis;
        synth.cancel();
        synth.resume();

        const utterance = new SpeechSynthesisUtterance("You have arrived at your destination");
        utterance.rate = 1;
        utterance.pitch = 1;

        synth.speak(utterance);
      }

      dispatchNavigation({ type: "COMPLETE" });
    }
  }, [isNavigating, liveNavLocation, destination, navigation.status, isNavMuted]);

  // Terrain narration — fires when GPS updates during active navigation
  useEffect(() => {
    if (!isNavigating) return;
    if (!liveNavLocation) return;
    if (isNavMuted) return;
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
  }, [isNavigating, liveNavLocation, isNavMuted]);

  // Reset terrain narrations when the route is cleared
  useEffect(() => {
    if (!hasRoute) {
      terrainNarrationsRef.current = [];
      spokenTerrainIndicesRef.current = new Set();
      lastTerrainSpokenAtRef.current = 0;
    }
  }, [hasRoute]);

  useEffect(() => {
    const update = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

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
      {lockPortrait && isLandscape && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center text-center p-6">
          <p className="text-white text-lg font-semibold">
            Rotate your device for the best experience 📱
          </p>
        </div>
      )}
      <MapControls
        hasRoute={hasRoute}
        onClearRoute={clearRoute}
        onRecenter={() => setRecenterNonce((n) => n + 1)}
        hasDestination={!!destination}
        onUndoDestination={() => {
          setClearDestinationNonce((n) => n + 1);
          setDestination(null);
          setPlannerTo("");
          setBlocked(false);
          setRouteBusy(false);
          clearRoute();
        }}
        saveRoute={activeRouteToSave}
        onRouteSaved={() => setRefreshRoutesKey((n) => n + 1)}
        isActiveSavedRoute={activeRouteSource === "saved"}
      />
      <DashboardMap
        theme={theme}
        destination={destination}
        fromLocation={fromLocation}
        recenterNonce={recenterNonce}
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

          hasAutoStartedVoiceRef.current = false;

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

          setActiveRouteToSave(route);

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

      {(routeBusy || routePreparing) && !hasRoute && !generatorOpen && (
        <LoadingOverlay
          text={
            activeRouteSource === "saved"
              ? "Rendering route..."
              : routePreparing
                ? "Preparing your route..."
                : "Generating route..."
          }
          tone="dark"
          showBackdrop={false}
        />
      )}
      <header
        className="fixed top-0 left-0 right-0 z-20 pointer-events-none"
        style={{ height: HEADER_H }}
      >
        <div className={`h-full ${glassBar} pointer-events-auto`}>
          <DashboardHeader />
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
                setRouteBusy(false);
                setSelectedSavedRoute(route);
                setFromLocation(route.from);
                setDestination(route.to);
                setPlannerTo(route.to.name ?? "");
                setSelectedVariant(route.difficulty);
                setHasRoute(true);
                dispatchNavigation({ type: "LOAD_STEPS", steps: route.navSteps ?? [] });
                dispatchNavigation({ type: "START" });

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

                toast.success(
                  `Route loaded\n${shortAreaName(route.from.name)} → ${shortAreaName(route.to.name)}`
                );
              }}
              activeRouteId={selectedSavedRoute?._id ?? null}
              onDeletedRoute={handleDeletedRoute}
            />
          </div>
        </div>
      )}
      <AnimatePresence>
        {showNavigationCard &&
          hasRoute &&
          activeNavSteps.length > 0 &&
          currentNavStep?.instruction && (
            <NavigationCard
              currentInstruction={currentNavStep.instruction}
              distanceText={formatStepDistance(distanceToNextStepMeters)}
              nextInstruction={nextNavStep?.instruction}
              stepIndex={currentStepIndex}
              totalSteps={activeNavSteps.length}
              isMuted={isNavMuted}
              onToggleMute={() => {
                const nextMuted = !isNavMuted;

                const nextVoiceEnabled = !nextMuted;

                setIsNavMuted(nextMuted);

                setVoiceEnabled(nextVoiceEnabled);

                if (!nextMuted) {
                  dispatchNavigation({ type: "GO_TO_STEP", index: currentStepIndex });

                  dispatchNavigation({ type: "RESET_STEP_SPOKEN" });

                  dispatchNavigation({ type: "START" });
                } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
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
