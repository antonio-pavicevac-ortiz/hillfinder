"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardMap from "@/components/dashboard/DashboardMap";
import DownhillGenerator from "@/components/dashboard/DownhillGenerator";
import QuickActionsSheet from "@/components/dashboard/QuickActionSheet";
import QuickActionsTrigger from "@/components/dashboard/QuickActionsTrigger";
import SearchDestination from "@/components/dashboard/SearchDestination";
import AnimatedPanel from "@/components/ui/AnimatedPanel";
import type { DashboardUser } from "@/types/user";
import { useEffect, useState } from "react";

const HEADER_H = 64; // DashboardHeader is h-[64px]
const FOOTER_H = 56; // trigger bar height (visual), adjust if needed

export default function Dashboard({ user }: { user: DashboardUser }) {
  const [qaOpen, setQaOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [showGenerator, setShowGenerator] = useState(true);

  const glassBar =
    "relative bg-white/12 saturate-150 " +
    "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
    // ✅ explicit blur for Safari + iOS Chrome
    "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
    "before:pointer-events-none before:absolute before:inset-0 " +
    "before:bg-gradient-to-b before:from-white/20 before:to-transparent";

  function handleGenerate(params: {
    from: string;
    to: string;
    skill: "beginner" | "intermediate" | "advanced";
  }) {
    console.log("🏁 Generate downhill route:", params);
    setShowGenerator(false);
  }

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
      {" "}
      {/* MAP: full viewport behind overlays so blur works */}
      <div
        className={`absolute inset-0 z-0 transition-opacity duration-200 ${
          searchActive ? "opacity-60" : "opacity-100"
        }`}
      >
        <DashboardMap destination={null} onRouteDrawn={() => {}} onDestinationPicked={() => {}} />
      </div>
      {/* HEADER: fixed to top of viewport */}
      <header
        className="fixed top-0 left-0 right-0 z-[90] pointer-events-none"
        style={{ height: HEADER_H }}
      >
        <div className={`pointer-events-auto h-full ${glassBar} border-b border-white/25`}>
          <DashboardHeader user={user} />
        </div>
      </header>
      {/* FOOTER: fixed to bottom of viewport */}
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
      {/* CONTENT REGION: the gap between header and footer (overlays live here) */}
      <div
        className="fixed left-0 right-0 z-[50] overflow-hidden pointer-events-none"
        style={{
          top: HEADER_H,
          bottom: `calc(${FOOTER_H}px + env(safe-area-inset-bottom))`,
        }}
      >
        <div className="relative h-full w-full pointer-events-none">
          {/* SEARCH BAR */}
          <div className="absolute top-0 left-0 right-0 z-[60] flex justify-center px-2.5 pt-3 pointer-events-none">
            <AnimatedPanel
              visible={true}
              className="pointer-events-auto w-full max-w-[min(100%,48rem)] px-1"
            >
              <SearchDestination
                onFocus={() => setSearchActive(true)}
                onBlur={() => setSearchActive(false)}
                onSelectLocation={() => {
                  setSearchActive(false);
                  setShowGenerator(true);
                }}
                onQueryChange={(q) => setSearchActive(q.trim().length > 0)}
              />
            </AnimatedPanel>
          </div>
          {/* ✅ GENERATOR (opens as a card/sheet) */}
          <div className="absolute inset-0 z-[70] pointer-events-none">
            <div className="relative h-full w-full">
              <DownhillGenerator
                open={showGenerator}
                initialTo=""
                onClose={() => setShowGenerator(false)}
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
