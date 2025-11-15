"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardMap, { DashboardMapRef } from "@/components/dashboard/DashboardMap";
import QuickActionsSheet from "@/components/dashboard/QuickActionSheet";
import QuickActionsTrigger from "@/components/dashboard/QuickActionsTrigger";
import SearchDestination from "@/components/dashboard/SearchDestination";
import { useRef, useState } from "react";

export default function Dashboard() {
  const mapRef = useRef<DashboardMapRef | null>(null);
  const [qaOpen, setQaOpen] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col relative">
      {/* HEADER */}
      {/* FLOATING HEADER */}
      <div className="absolute top-0 inset-x-0 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <DashboardHeader />
        </div>
      </div>
      <div className="absolute top-0 left-0 right-0 mt-20 z-30 pointer-events-auto">
        <SearchDestination
          onSelectLocation={(loc) => {
            mapRef.current?.flyTo(loc.lat, loc.lng);
          }}
        />
      </div>
      {/* Map fills remaining height */}
      <DashboardMap ref={mapRef} />

      {/* 🔹 FROSTED BOTTOM NAVBAR – NOW OVER THE MAP */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div className="mx-auto w-full max-w ">
          <div
            className="
                    bg-white/30
                    backdrop-blur-3xl
                    border-t border-white/40
                    shadow-[0_-10px_30px_rgba(0,0,0,0.15)]
                    flex justify-center items-center
                    py-3
                    pointer-events-auto
                  "
          >
            <div className="inline-block">
              <QuickActionsTrigger onOpen={() => setQaOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS SHEET */}
      <QuickActionsSheet
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        onUseLocation={() => mapRef.current?.flyTo(40.715, -73.761)}
        onStartRoute={() => console.log("Start Route")}
        onViewSaved={() => console.log("View Saved")}
      />
    </div>
  );
}
