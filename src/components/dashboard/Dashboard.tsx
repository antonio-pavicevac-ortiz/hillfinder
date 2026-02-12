"use client";

import ClearRouteButton from "@/components/dashboard/ClearRouteButton";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { DashboardLegend } from "@/components/dashboard/DashboardLegend";
import DashboardMap from "@/components/dashboard/DashboardMap";
import DownhillGenerator from "@/components/dashboard/DownhillGenerator";
import PlannerCTA from "@/components/dashboard/PlannerCTA";
import QuickActionsSheet from "@/components/dashboard/QuickActionSheet";
import QuickActionsTrigger from "@/components/dashboard/QuickActionsTrigger";
import type { DashboardUser } from "@/types/user";
import { motion } from "framer-motion";
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

  // ✅ start closed so CTA is the entry point
  const [generatorOpen, setGeneratorOpen] = useState(false);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [hasRoute, setHasRoute] = useState(false);

  // tells the map to clear itself without refs
  const [clearRouteNonce, setClearRouteNonce] = useState(0);

  // ✅ used to re-trigger bounce when returning from planner
  const [ctaBounceNonce, setCtaBounceNonce] = useState(0);

  const glassBar =
    "relative bg-white/12 saturate-150 " +
    "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
    "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
    "before:pointer-events-none before:absolute before:inset-0 " +
    "before:bg-gradient-to-b before:from-white/20 before:to-transparent";

  function handleGenerate(params: { from: string; to: string }) {
    console.log("🏁 Generate downhill route:", params);
  }

  function handleRouteDrawn() {
    setHasRoute(true);
  }

  function handleClearRoute() {
    setHasRoute(false);
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

      {/* CONTENT REGION (over map) */}
      <div
        className="fixed left-0 right-0 z-[50] overflow-visible pointer-events-none"
        style={{
          top: HEADER_H,
          bottom: `calc(${FOOTER_H}px + env(safe-area-inset-bottom))`,
        }}
      >
        <div className="relative h-full w-full pointer-events-none">
          {/* ✅ CTA BAR (shown when generator is closed) */}
          {!generatorOpen && (
            <div className="absolute top-3 left-0 right-0 z-[60] flex justify-center px-2.5 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-[min(100%,48rem)] px-1">
                <div className="flex flex-col gap-3">
                  {/* ✅ Bounce ONLY when returning from planner (avoid initial load jump) */}
                  {ctaBounceNonce === 0 ? (
                    <PlannerCTA onClick={() => setGeneratorOpen(true)} />
                  ) : (
                    <motion.div
                      key={ctaBounceNonce}
                      initial={{ y: 0, scale: 1 }}
                      animate={{
                        y: [0, -8, 0],
                        scale: [1, 1.01, 1],
                      }}
                      transition={{
                        duration: 0.42,
                        ease: [0.22, 1.25, 0.36, 1],
                      }}
                    >
                      <PlannerCTA onClick={() => setGeneratorOpen(true)} />
                    </motion.div>
                  )}

                  <div className="flex justify-end">
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

          {/* ✅ PLANNER PANEL (replaces CTA when open, same position) */}
          {generatorOpen && (
            <div className="absolute top-3 left-0 right-0 z-[200] flex justify-center px-2.5 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-[min(100%,48rem)] px-1">
                <DownhillGenerator
                  open={generatorOpen}
                  onClose={() => {
                    setGeneratorOpen(false);
                    // ✅ trigger the bounce when we return
                    setCtaBounceNonce((n) => n + 1);
                  }}
                  onGenerate={handleGenerate}
                  showHint={true}
                />
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
