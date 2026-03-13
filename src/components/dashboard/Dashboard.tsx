"use client";

import { useEffect, useRef, useState } from "react";

import DashboardMap from "@/components/dashboard/map/DashboardMap";
import MapControls from "@/components/dashboard/map/MapControls";

import DashboardHeader from "@/components/dashboard/ui/DashboardHeader";
import QuickActionsTrigger from "@/components/dashboard/ui/QuickActionsTrigger";

import DownhillGenerator from "@/components/dashboard/modals/DownhillGenerator";
import QuickActionsSheet from "@/components/dashboard/modals/QuickActionSheet";

import type { SaveRoutePayload, SavedRouteRecord } from "@/types/saved-route";

import RecentRoutesPanel from "@/components/dashboard/RecentRoutesPanel";
import { toast } from "sonner";

type Destination = { lat: number; lng: number; name?: string };
type FromLocation = { lat: number; lng: number; name?: string };

type Variant = "easy" | "hard";
type ActiveRouteSource = "generated" | "saved" | null;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(x));
}

const HEADER_H = 64;
const FOOTER_H = 56;

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const glassBar =
  "relative bg-white/12 saturate-150 " +
  "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
  "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
  "before:pointer-events-none before:absolute before:inset-0 " +
  "before:bg-gradient-to-b before:from-white/20 before:to-transparent";

export default function Dashboard() {
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
  const quickRouteEnabled = !!destination;

  const [blocked, setBlocked] = useState(false);
  const hasShownUndoHintRef = useRef(false);
  const [routeBusy, setRouteBusy] = useState(false);

  const [activeRouteToSave, setActiveRouteToSave] = useState<SaveRoutePayload | null>(null);
  const [selectedSavedRoute, setSelectedSavedRoute] = useState<SavedRouteRecord | null>(null);
  const [refreshRoutesKey, setRefreshRoutesKey] = useState(0);
  const [activeRouteSource, setActiveRouteSource] = useState<ActiveRouteSource>(null);

  const TOO_FAR_KM = 30;

  function commitDestination(next: Destination) {
    if (fromLocation) {
      const km = haversineKm(fromLocation, next);

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

    if (!hasShownUndoHintRef.current) {
      toast("Tap the middle button to change destination", {
        id: "undo-destination-hint",
        duration: 4000,
        icon: "🌿",
      });

      hasShownUndoHintRef.current = true;
    }

    return true;
  }

  function clearRoute() {
    setHasRoute(false);
    setVariantsReady(false);
    setSelectedVariant(null);
    setRouteBusy(false);
    setActiveRouteToSave(null);
    setSelectedSavedRoute(null);
    setActiveRouteSource(null);
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
    setRouteBusy(false);
    setVariantsReady(true);
    setHasRoute(true);
    setGeneratorOpen(false);
  }

  function handleRouteFailed(message?: string) {
    setRouteBusy(false);
    setVariantsReady(false);
    if (message) {
      toast.error(message);
    }
  }

  useEffect(() => {
    if (!generatorOpen) return;
    if (!variantsReady) return;
    setGeneratorOpen(false);
  }, [generatorOpen, variantsReady]);

  useEffect(() => {
    console.log("[Dashboard] activeRouteSource =", activeRouteSource);
  }, [activeRouteSource]);

  return (
    <main className="fixed inset-0 bg-white">
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
        destination={destination}
        fromLocation={fromLocation}
        recenterNonce={recenterNonce}
        clearRouteNonce={clearRouteNonce}
        clearDestinationNonce={clearDestinationNonce}
        onRouteDrawn={handleRouteReady}
        onRouteFailed={handleRouteFailed}
        routeActive={hasRoute}
        routeAlternativesNonce={routeAlternativesNonce}
        selectedVariant={selectedVariant}
        onRouteBusyChange={setRouteBusy}
        onVariantsReady={() => {
          console.log("[Dashboard] variantsReady true");
          handleRouteReady();
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
          setActiveRouteToSave(route);

          setActiveRouteSource((currentSource) => {
            if (currentSource === "saved") {
              return "saved";
            }

            setSelectedSavedRoute(null);
            return "generated";
          });
        }}
        savedRouteToLoad={selectedSavedRoute}
      />

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
                setSelectedSavedRoute(route);
                setFromLocation(route.from);
                setDestination(route.to);
                setPlannerTo(route.to.name ?? "");
                setSelectedVariant(route.difficulty);
                setHasRoute(true);
                setVariantsReady(true);
                setRoutesOpen(false);
                setActiveRouteSource("saved");

                setActiveRouteToSave({
                  name: route.name,
                  from: route.from,
                  to: route.to,
                  difficulty: route.difficulty,
                  coords: route.coords,
                  distanceMeters: route.distanceMeters,
                  durationSeconds: route.durationSeconds,
                });

                toast.success(`Loaded ${route.name || "saved route"}`);
              }}
              activeRouteId={selectedSavedRoute?._id ?? null}
              onDeletedRoute={handleDeletedRoute}
            />
          </div>
        </div>
      )}

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
        onQuickRoute={() => {
          if (!destination || routeBusy) return;

          setQaOpen(false);
          setRoutesOpen(false);
          clearRoute();
          setVariantsReady(false);
          setSelectedVariant("easy");
          setRouteAlternativesNonce((n) => n + 1);
        }}
        onStartRoute={() => {
          setQaOpen(false);
          setRoutesOpen(false);
          setVariantsReady(false);
          setSelectedVariant(null);
          setGeneratorOpen(true);
        }}
        onViewSaved={() => {
          setQaOpen(false);
          setGeneratorOpen(false);
          setRoutesOpen(true);
        }}
        quickRouteEnabled={quickRouteEnabled}
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
          commitDestination(next);
        }}
        variantsReady={variantsReady}
        selectedVariant={selectedVariant}
        onVariantSelected={(v) => setSelectedVariant(v)}
        onGenerate={async ({ variant }) => {
          if (routeBusy) return;

          setQaOpen(false);
          setRoutesOpen(false);
          clearRoute();
          setVariantsReady(false);
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

                const accepted = commitDestination(next);
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
