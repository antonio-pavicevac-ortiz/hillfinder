"use client";

import type { ButtonHTMLAttributes } from "react";

export default function ClearRouteButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const disabled = !!props.disabled;

  return (
    <button
      type="button"
      aria-label="Clear route"
      title="Clear route"
      {...props}
      className={[
        "relative inline-flex items-center justify-center",
        "h-11 w-11 rounded-2xl overflow-hidden",
        "bg-white/80",
        "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)]",
        "border border-white/35",
        "ring-1 ring-black/5",
        "shadow-md",
        "before:pointer-events-none before:absolute before:inset-0",
        "before:bg-gradient-to-b before:from-white/35 before:to-transparent",
        "after:pointer-events-none after:absolute after:inset-0",
        "after:shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
        "transition-transform transition-shadow duration-150 ease-out",
        "will-change-transform touch-manipulation",
        "[-webkit-tap-highlight-color:transparent]",
        !disabled
          ? "hover:scale-[1.03] active:scale-[0.96] active:shadow-sm"
          : "opacity-95 cursor-not-allowed",
        disabled ? "text-slate-300" : "text-slate-900",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
        className,
      ].join(" ")}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 7H3v4"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 11a8 8 0 0 1 13.66-5.66"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 13a8 8 0 0 1-13.66 5.66"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 17h4v-4"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
