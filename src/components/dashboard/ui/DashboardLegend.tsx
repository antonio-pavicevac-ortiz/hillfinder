"use client";

type Props = {
  /** optional, if you still want to reuse it elsewhere */
  className?: string;
};

export function DashboardLegendPanel({ className }: Props) {
  const Row = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span
        className="inline-block h-[14px] w-[14px] shrink-0 rounded-full border border-white/35 shadow-sm"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-sm font-medium leading-none text-slate-900/90">{label}</span>
    </div>
  );

  return (
    <div className={className ?? ""}>
      <div className="mb-2 text-base font-semibold text-slate-900">Legend</div>
      <div className="flex flex-col gap-2.5">
        <Row color="#22c55e" label="Easy downhill" />
        <Row color="#eab308" label="Medium downhill" />
        <Row color="#ef4444" label="Hard downhill" />
        <Row color="#7f1d1d" label="Uphill" />
      </div>
    </div>
  );
}
