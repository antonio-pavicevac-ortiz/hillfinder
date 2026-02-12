"use client";
import { ChevronRight } from "lucide-react";

type PlannerCTAProps = {
  onClick: () => void;
  className?: string;
};

export default function PlannerCTA({ onClick, className = "" }: PlannerCTAProps) {
  const glassBar =
    "relative bg-white/12 saturate-150 " +
    "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
    "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
    "before:pointer-events-none before:absolute before:inset-0 " +
    "before:bg-gradient-to-b before:from-white/20 before:to-transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Plan a downhill route"
      className={[
        glassBar,
        "mt-2 w-full rounded-2xl px-4 py-3 text-left",
        "transition-transform duration-150 ease-out active:scale-[0.99]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">Plan a downhill route</div>
          <div className="text-xs text-slate-700/65 truncate">Tap to open the planner</div>
        </div>
        <div className="shrink-0">
          <ChevronRight
            className="h-6 w-6 text-slate-900/80 transition-all duration-200 group-hover:translate-x-1 group-hover:text-slate-900"
            strokeWidth={2.5}
            aria-hidden="true"
          />
        </div>
      </div>
    </button>
  );
}
