"use client";

import ClearRouteButton from "@/components/dashboard/ClearRouteButton";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { DashboardLegend } from "@/components/dashboard/DashboardLegend";
import DashboardMap from "@/components/dashboard/DashboardMap";
import DownhillGenerator from "@/components/dashboard/DownhillGenerator";
import QuickActionsSheet from "@/components/dashboard/QuickActionSheet";
import QuickActionsTrigger from "@/components/dashboard/QuickActionsTrigger";
import SearchDestination from "@/components/dashboard/SearchDestination";
import AnimatedPanel from "@/components/ui/AnimatedPanel";
import type { DashboardUser } from "@/types/user";
import { useEffect, useState } from "react";

const HEADER_H = 64;
const FOOTER_H = 56;

type Destination = {
  lat: number;
  lng: number;
  name?: string;
};

export default function Dashboard({ user }: { user: DashboardUser }) {
  const [qaOpen, setQaOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(true);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [hasRoute, setHasRoute] = useState(false);

  // tells the map to clear itself without refs
  const [clearRouteNonce, setClearRouteNonce] = useState(0);

  const glassBar =
    "relative bg-white/12 saturate-150 " +
    "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
    "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
    "before:pointer-events-none before:absolute before:inset-0 " +
    "before:bg-gradient-to-b before:from-white/20 before:to-transparent";

  function handleGenerate(params: {
    from: string;
    to: string;
    skill: "beginner" | "intermediate" | "advanced";
  }) {
    console.log("🏁 Generate downhill route:", params);
  }

  function handleRouteDrawn() {
    setHasRoute(true);
  }

  function handleClearRoute() {
    setHasRoute(false);
    // 🔥 keep destination so the blue marker stays
    // setDestination(null);
    setClearRouteNonce((n) => n + 1);
  }

  // Lock page scrolling (map owns gestures)
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
    };
  }, []);

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
          onRouteDrawn={handleRouteDrawn}
          onDestinationPicked={(loc) => {
            // Destination changed via map tap; route may or may not draw
            setDestination({ name: loc.name, lat: loc.lat, lng: loc.lng });
            setHasRoute(false);
          }}
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

      {/* CONTENT REGION */}
      <div
        className="fixed left-0 right-0 z-[50] overflow-hidden pointer-events-none"
        style={{
          top: HEADER_H,
          bottom: `calc(${FOOTER_H}px + env(safe-area-inset-bottom))`,
        }}
      >
        <div className="relative h-full w-full pointer-events-none">
          {/* Clear route button */}
          <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+5.25rem)] z-[55] flex flex-col gap-2 pointer-events-auto">
            <ClearRouteButton onClick={handleClearRoute} disabled={!hasRoute} />
          </div>

          {/* Legend (fixed to bottom-left above footer) */}
          <div
            className="fixed left-3 z-[79] pointer-events-auto"
            style={{
              bottom: `calc(${FOOTER_H}px + env(safe-area-inset-bottom) + 5.125rem)`,
            }}
          >
            <DashboardLegend visible={!!destination} />
          </div>

          {/* SEARCH BAR */}
          <div className="absolute top-0 left-0 right-0 z-[60] flex justify-center px-2.5 pt-3 pointer-events-none">
            <AnimatedPanel
              visible={true}
              className="pointer-events-auto w-full max-w-[min(100%,48rem)] px-1"
            >
              <SearchDestination
                onFocus={() => setSearchActive(true)}
                onBlur={() => setSearchActive(false)}
                onSelectLocation={(loc) => {
                  setDestination({ name: loc.name, lat: loc.lat, lng: loc.lng });
                  setHasRoute(false);
                  setSearchActive(false);
                  setGeneratorOpen(true);
                }}
                onQueryChange={(q) => setSearchActive(q.trim().length > 0)}
              />
            </AnimatedPanel>
          </div>

          {/* GENERATOR */}
          <div className="absolute inset-0 z-[70] pointer-events-none">
            <div className="relative h-full w-full">
              <DownhillGenerator
                open={generatorOpen}
                onOpen={() => setGeneratorOpen(true)}
                onClose={() => setGeneratorOpen(false)}
                onGenerate={handleGenerate}
                showHint={true}
              />
            </div>
          </div>
        </div>
      </div>

      <QuickActionsSheet
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        onUseLocation={() => {}}
        onStartRoute={() => setQaOpen(false)}
        onViewSaved={() => {}}
      />
    </main>
  );
}
