"use client";

import DashboardHeader from "./DashboardHeader";
import DashboardLeftCard from "./DashboardLeftCard";
import DashboardMap from "./DashboardMap";
import DashboardRightCard from "./DashboardRightCard";

export default function DashboardLayoutShell() {
  return (
    <div className="min-h-screen flex flex-col overflow-auto lg:h-screen lg:overflow-hidden">
      {/* HEADER */}
      <DashboardHeader />

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden pt-2 px-2 gap-2">
        {/* LEFT CARD (scrollable column) */}
        <aside className="hidden lg:block w-72 overflow-y-auto border-r border-gray-200 bg-white">
          <DashboardLeftCard />
        </aside>

        {/* MAP AREA: flexible, grows/shrinks */}
        <main className="flex-1 h-[60vh] lg:h-full">
          <DashboardMap />
        </main>

        {/* RIGHT CARD (scrollable column) */}
        <aside className="hidden lg:block w-80 overflow-y-auto border-l border-gray-200 bg-white">
          <DashboardRightCard />
        </aside>

        {/* MOBILE STACKED VIEW */}
        <div className="lg:hidden px-2 py-4 space-y-4">
          <DashboardLeftCard />
          <DashboardRightCard />
        </div>
      </div>
    </div>
  );
}
