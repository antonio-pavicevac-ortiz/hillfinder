"use client";

import { ChevronRight } from "lucide-react";

// Shared radius so Quick Route can match exactly
export const CTA_ROUNDED = "rounded-2xl";

type PlannerCTAProps = {
  onClick: () => void;
  className?: string;

  /** Text */
  title?: string;
  subtitle?: string;
  ariaLabel?: string;

  /**
   * When true, renders a shorter CTA (intended for Quick Route)
   * while keeping the same glass styling + chevron sizing/weight.
   */
  compact?: boolean;
};

export default function PlannerCTA({
  onClick,
  className = "",
  title = "Plan a downhill route",
  subtitle = "Tap to open the planner",
  ariaLabel = "Plan a downhill route",
  compact = false,
}: PlannerCTAProps) {
  const glassBar =
    "group relative overflow-hidden " +
    "bg-white/12 saturate-150 " +
    "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
    "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)] " +
    "before:pointer-events-none before:absolute before:inset-0 " +
    "before:bg-gradient-to-b before:from-white/20 before:to-transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        glassBar,
        // Same rounding for both CTAs
        `w-full ${CTA_ROUNDED} px-4 text-left`,
        // Height control: Quick Route should be ~3/4 height of Planner CTA
        compact ? "py-2.5" : "py-3",
        // Keep spacing default for planner, but allow parent to override via className
        compact ? "mt-1" : "mt-2",
        "transition-transform duration-150 ease-out active:scale-[0.99]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="text-xs text-slate-700/65 truncate">{subtitle}</div> : null}
        </div>

        <ChevronRight
          className={[
            // ✅ Same chevron size/weight as the main CTA
            "h-6 w-6 shrink-0 text-slate-900/80 transition-transform duration-200",
            // ✅ desktop hover
            "group-hover:translate-x-1",
            // ✅ mobile/touch press
            "group-active:translate-x-1",
            // ✅ keyboard users
            "group-focus-visible:translate-x-1",
          ].join(" ")}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
