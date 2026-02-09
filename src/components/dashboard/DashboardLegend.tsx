"use client";

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
      </div>
    </div>
  );
}
