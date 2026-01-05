"use client";
import { DashboardLegend } from "@/components/dashboard/DashboardLegend";
import DashboardMap from "@/components/dashboard/DashboardMap";
import DownhillGenerator from "@/components/dashboard/DownhillGenerator";
import QuickActionsSheet from "@/components/dashboard/QuickActionSheet";
import QuickActionsTrigger from "@/components/dashboard/QuickActionsTrigger";
import SearchDestination from "@/components/dashboard/SearchDestination";
import AnimatedPanel from "@/components/ui/AnimatedPanel";
import { useState } from "react";

export default function Dashboard() {
  const [qaOpen, setQaOpen] = useState(false);
  const [showGenerator, setShowGenerator] = useState(true);
  const [searchActive, setSearchActive] = useState(false);
  const [destination, setDestination] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [routeActive, setRouteActive] = useState(false);
  const [hasLearnedPins, setHasLearnedPins] = useState(false);

  const legendVisible = routeActive;

  function handleGenerate(params: {
    from: string;
    to: string;
    skill: "beginner" | "intermediate" | "advanced";
  }) {
    console.log("🏁 Generate downhill route:", params);
    setShowGenerator(false);
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      {/* MAP */}
      <div
        className={`absolute inset-0 z-0 transition-opacity duration-200 ${
          searchActive ? "opacity-60" : "opacity-100"
        }`}
      >
        <DashboardMap
          destination={destination}
          onRouteDrawn={() => {
            setRouteActive(true);
            setHasLearnedPins(true);
          }}
          onDestinationPicked={(loc) => {
            setDestination(loc);
            setRouteActive(false);
            setShowGenerator(true);
          }}
        />
      </div>

      {/* Legend */}
      <AnimatedPanel
        visible={legendVisible}
        className="fixed bottom-28 left-4 z-[100] pointer-events-none"
      >
        <DashboardLegend visible={legendVisible} />
      </AnimatedPanel>

      {/* Search */}
      <div className="absolute top-[6rem] left-0 right-0 z-[60] flex justify-center px-2.5 pointer-events-none">
        <AnimatedPanel
          visible={true}
          className="pointer-events-auto w-full max-w-[min(100%,48rem)] px-1"
        >
          <SearchDestination
            onFocus={() => {
              setSearchActive(true);
            }}
            onBlur={() => setSearchActive(false)}
            onSelectLocation={(loc) => {
              setDestination(loc);
              setSearchActive(false);
              setShowGenerator(true); // Show the card only after a destination is selected
              setRouteActive(false);
            }}
            onQueryChange={(q) => {
              const hasQuery = q.trim().length > 0;
              if (hasQuery) {
                setSearchActive(true);
                setShowGenerator(false);
              } else {
                setShowGenerator(true); // optional: show it again when query is cleared
              }
            }}
          />
        </AnimatedPanel>
      </div>

      {/* Downhill Generator */}
      <div className="absolute top-[10.625rem] left-0 right-0 z-[70] px-4 flex justify-center pointer-events-none">
        <AnimatedPanel visible={showGenerator} className="pointer-events-auto">
          <DownhillGenerator
            open={showGenerator} // component returns null when showGenerator is false
            initialTo={destination?.name ?? ""}
            onClose={() => setShowGenerator(false)}
            onGenerate={handleGenerate}
            showHint={!hasLearnedPins}
          />
        </AnimatedPanel>
      </div>

      {/* Quick Actions */}
      <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none">
        <div className="pointer-events-auto bg-white/30 backdrop-blur-3xl py-3 flex justify-center">
          <QuickActionsTrigger onOpen={() => setQaOpen(true)} />
        </div>
      </div>

      <QuickActionsSheet
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        onUseLocation={() => {}}
        onStartRoute={() => {
          setQaOpen(false);
          setShowGenerator(true);
        }}
        onViewSaved={() => {}}
      />
    </div>
  );
}
