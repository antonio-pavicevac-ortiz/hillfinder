"use client";

import { useState } from "react";

import DashboardMap from "@/components/dashboard/map/DashboardMap";
import MapControls from "@/components/dashboard/map/MapControls";

import DashboardHeader from "@/components/dashboard/ui/DashboardHeader";
import QuickActionsTrigger from "@/components/dashboard/ui/QuickActionsTrigger";

import DownhillGenerator from "@/components/dashboard/modals/DownhillGenerator";
import QuickActionsSheet from "@/components/dashboard/modals/QuickActionSheet";
import { toast } from "sonner";
type Destination = { lat: number; lng: number; name?: string };
type FromLocation = { lat: number; lng: number; name?: string };

type Variant = "easy" | "hard";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371; // km
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
  const quickRouteEnabled = !!destination; // or: !!destination && !!fromLocation

  const [blocked, setBlocked] = useState(false);

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
    return true;
  }

  function clearRoute() {
    setHasRoute(false);
    setVariantsReady(false);
    setSelectedVariant(null);
    setClearRouteNonce((n) => n + 1);
  }

  function undoDestination() {
    // Remove destination marker + route visuals and reset planner destination text.
    setDestination(null);
    setPlannerTo("");
    setBlocked(false);
    setHasRoute(false);
    setVariantsReady(false);
    setSelectedVariant(null);
    setClearRouteNonce((n) => n + 1);
    setClearDestinationNonce((n) => n + 1);
  }

  return (
    <main className="fixed inset-0 bg-white">
      {/* MAP CONTROLS */}
      <MapControls
        hasRoute={hasRoute}
        onClearRoute={clearRoute}
        onRecenter={() => setRecenterNonce((n) => n + 1)}
        hasDestination={!!destination}
        onUndoDestination={() => {
          // 1) remove destination marker on map
          setClearDestinationNonce((n) => n + 1);

          // 2) clear destination state + planner input
          setDestination(null);
          setPlannerTo("");
          setBlocked(false);

          // 3) clear route visuals/state too (optional but usually desired)
          clearRoute();
        }}
      />

      {/* MAP */}
      <DashboardMap
        destination={destination}
        fromLocation={fromLocation}
        recenterNonce={recenterNonce}
        clearRouteNonce={clearRouteNonce}
        clearDestinationNonce={clearDestinationNonce}
        routeActive={hasRoute}
        routeAlternativesNonce={routeAlternativesNonce}
        selectedVariant={selectedVariant}
        onVariantsReady={() => {
          console.log("[Dashboard] variantsReady true");
          setVariantsReady(true);
          setHasRoute(true);
        }}
        onVariantSelected={(v) => setSelectedVariant(v)}
        onFromPicked={(loc) => {
          setFromLocation({ lat: loc.lat, lng: loc.lng, name: loc.name });
        }}
        onDestinationPicked={(loc) => {
          const next = { name: loc.name, lat: loc.lat, lng: loc.lng };
          commitDestination(next);
        }}
      />

      {/* HEADER (visual overlay; map gestures pass through except header controls) */}
      <header
        className="fixed top-0 left-0 right-0 z-20 pointer-events-none"
        style={{ height: HEADER_H }}
      >
        <div className={`h-full ${glassBar} pointer-events-auto`}>
          <DashboardHeader />
        </div>
      </header>

      {/* FOOTER (visual overlay; map gestures pass through except button) */}
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

      {/* QUICK ACTIONS */}
      <QuickActionsSheet
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        onUseLocation={() => {
          setQaOpen(false);
          setRecenterNonce((n) => n + 1);
        }}
        onQuickRoute={() => {
          // Quick Route is a one-tap action: do NOT open the planner card.
          // Only runs when a destination exists (QuickActionsSheet should already disable otherwise).
          if (!destination) return;

          setQaOpen(false);

          // Kick off alternatives generation (easy/hard), defaulting selection to easy.
          setVariantsReady(false);
          setSelectedVariant("easy");
          setRouteAlternativesNonce((n) => n + 1);
        }}
        onStartRoute={() => {
          setQaOpen(false);
          // Ensure the planner doesn't immediately auto-close due to stale variantsReady
          setVariantsReady(false);
          setSelectedVariant(null);
          setGeneratorOpen(true);
        }}
        onViewSaved={() => setQaOpen(false)}
        quickRouteEnabled={quickRouteEnabled}
      />

      {/* DOWNHILL GENERATOR */}
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
          // IMPORTANT: flip variantsReady off immediately so the planner loader can show.
          // If variantsReady is still true from a previous route, the planner will auto-close.
          setVariantsReady(false);
          setSelectedVariant(variant);
          // If user typed a destination but didn't pick a suggestion (no lat/lng yet),
          // geocode the text so the map has a destination marker to route to.
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
                if (!accepted) return;
              }
            } catch {
              // If geocoding fails, let the map-side (click-to-set) flow handle it.
            }
          }

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
