"use client";

export function DashboardLegend({ visible }: { visible: boolean }) {
  return (
    <div
      className={[
        // keep your existing styling for the card
        "pointer-events-auto w-full bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl p-5",

        // ✅ consistent enter/exit animation
        "transition-all duration-200 ease-out will-change-transform",
        "origin-bottom-left",

        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-2 scale-[0.98] pointer-events-none",
      ].join(" ")}
    >
      <div className="font-semibold mb-2">Hillfinder Guide</div>

      <div className="flex items-center gap-2 mb-1 whitespace-nowrap">
        <span className="inline-block w-3 h-3 rounded-full bg-[#22c55e]" />
        <span>Smooth downhill</span>
      </div>

      <div className="flex items-center gap-2 mb-1 whitespace-nowrap">
        <span className="inline-block w-3 h-3 rounded-full bg-[#eab308]" />
        <span>Fun descent</span>
      </div>

      <div className="flex items-center gap-2 mb-1 whitespace-nowrap">
        <span className="inline-block w-3 h-3 rounded-full bg-[#ef4444]" />
        <span>Steep downhill</span>
      </div>

      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="inline-block w-3 h-3 rounded-full bg-[#7f1d1d]" />
        <span>Uphill (effort)</span>
      </div>
    </div>
  );
}
