"use client";

import { ChevronRight } from "lucide-react";

// Shared radius so Quick Route can match exactly
export const CTA_ROUNDED = "rounded-[18px]";

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
        `w-full ${CTA_ROUNDED} px-4 text-left`,
        compact ? "py-2.5" : "py-3",
        compact ? "mt-1" : "mt-2",
        "transition-transform duration-150 ease-out active:scale-[0.99]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      ].join(" ")}
    >
      {/* ✅ Match Quick Route: reserve chevron space + absolute chevron */}
      <div className="relative z-10 block pr-10">
        <div className="block text-sm font-semibold leading-none text-black">{title}</div>

        {subtitle ? (
          <div className="mt-1 block text-xs text-slate-700/65 truncate">{subtitle}</div>
        ) : null}

        <ChevronRight
          className={[
            "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2",
            "h-5 w-5 shrink-0 text-black transition-transform duration-200",
            "group-hover:translate-x-1",
            "group-active:translate-x-1",
            "group-focus-visible:translate-x-1",
          ].join(" ")}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
