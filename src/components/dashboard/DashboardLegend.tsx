"use client";

<<<<<<< HEAD
type Props = {
  visible?: boolean;
};

export function DashboardLegend({ visible = true }: Props) {
  if (!visible) return null;

  const Row = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-full border border-white/40 shadow"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-white/90">{label}</span>
    </div>
  );

  return (
    <div
      className={[
        "pointer-events-auto",
        "rounded-2xl px-3 py-2",
        "border border-white/25",
        "bg-white/12 saturate-150",
        "shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
        "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)]",
      ].join(" ")}
      aria-label="Route difficulty legend"
    >
      <div className="mb-1 text-[11px] font-medium text-white/90">Legend</div>
      <div className="flex flex-col gap-1">
        <Row color="#22c55e" label="Easy downhill" />
        <Row color="#eab308" label="Medium downhill" />
        <Row color="#ef4444" label="Hard downhill" />
        <Row color="#7f1d1d" label="Uphill" />
=======
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
>>>>>>> main
      </div>
    </div>
  );
}
