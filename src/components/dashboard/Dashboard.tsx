"use client";

import DashboardMap, { DashboardMapRef } from "@/components/dashboard/DashboardMap";
import QuickActionsSheet from "@/components/dashboard/QuickActionSheet";
import QuickActionsTrigger from "@/components/dashboard/QuickActionsTrigger";
import SearchDestination from "@/components/dashboard/SearchDestination";
import useRouteElevation from "@/hooks/useRouteElevation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Dashboard() {
  // ✅ USE ONLY ONE MAP REF
  const { loading: routeLoading, computeRoute } = useRouteElevation();
  const dashboardMapRef = useRef<DashboardMapRef | null>(null);
  const [qaOpen, setQaOpen] = useState(false);

  /** When map finishes loading… */
  const handleMapReady = useCallback(() => {
    console.log("Map ready — requesting geolocation…");

    if (!navigator.geolocation) {
      console.error("Geolocation not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        console.log("GEO SUCCESS:", lat, lng);

        dashboardMapRef.current?.addUserPin(lat, lng);
      },
      (err) => {
        if (!err) {
          console.error("GEO ERROR: Unknown geolocation error");
          return;
        }

        console.error("GEO ERROR:", {
          code: err.code,
          message: err.message,
        });
      }
    );
  }, []);

  const handleStartRoute = async () => {
    const map = dashboardMapRef.current;
    if (!map) return;

    // 1. Read user pin
    const user = map.getUserLocation?.();
    if (!user) {
      alert("Your location was not detected yet.");
      return;
    }

    // 2. Read destination
    const dest = map.getDestination?.();
    if (!dest) {
      alert("Please search for a destination first.");
      return;
    }

    console.log("Starting route from:", user, "→", dest);

    // 3. Compute route (convert objects → tuples)
    const result = await computeRoute([user.lat, user.lng], [dest.lat, dest.lng]);

    console.log("Route result:", result);

    // 4. Use the FIRST route in the scored list
    const best = result[0];

    // 5. Draw geometry on map
    map.drawRoute(best.route.geometry.coordinates, best.difficulty);
  };

  useEffect(() => {
    (window as any).dashboardMapRef = dashboardMapRef;
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      {/* SEARCH BAR — stable fixed layer */}
      <div className="fixed top-[4.5rem] left-0 right-0 z-[60] flex justify-center px-4">
        <SearchDestination
          onSelectLocation={(loc) => {
            console.log("Selected location:", loc);
            dashboardMapRef.current?.addPin(loc.lat, loc.lng);
          }}
        />
      </div>

      {/* MAP */}
      <DashboardMap ref={dashboardMapRef} onReady={handleMapReady} />

      {/* BOTTOM BAR */}
      <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none">
        <div className="pointer-events-auto bg-white/30 backdrop-blur-3xl border-t border-white/40 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] py-3 flex justify-center">
          <QuickActionsTrigger onOpen={() => setQaOpen(true)} />
        </div>
      </div>

      {/* QUICK ACTIONS SHEET */}
      <QuickActionsSheet
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        onUseLocation={() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              dashboardMapRef.current?.addUserPin(pos.coords.latitude, pos.coords.longitude); // ✅ FIXED
            },
            (err) => {
              console.error("Geolocation error:", err);
              alert("Unable to get your location.");
            },
            { enableHighAccuracy: true }
          );
        }}
        onStartRoute={handleStartRoute}
        onViewSaved={() => console.log("View Saved")}
      />
    </div>
  );
}
