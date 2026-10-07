"use client";

import { mapControlStyle, MAP_CONTROL_ICON } from "./mapControlStyle";

type Props = {
  interacted?: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Optional override for the icon stroke */
  strokeColor?: string;
  className?: string;
  /** Accessibility label */
  ariaLabel?: string;
};

export default function RecenterButton({
  onClick,
  interacted = false,
  disabled = false,
  strokeColor,
  className,
  ariaLabel = "Recenter map",
}: Props) {
  const effectiveStroke =
    strokeColor ?? (interacted ? "#FFFFFF" : MAP_CONTROL_ICON);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      // Prevent this press from bubbling into the map layer when it sits above it
      onPointerDownCapture={(e) => e.stopPropagation()}
      className={[
        "relative flex items-center justify-center overflow-hidden",
        "transition active:scale-95",
        disabled ? "cursor-default" : "cursor-pointer",
        "rounded-2xl",
        className ?? "",
      ].join(" ")}
      style={{
        width: 48,
        height: 48,
        ...mapControlStyle("#0085FF", interacted),
        // Important: button should receive taps
        pointerEvents: "auto",
      }}
    >
      {/* Top gloss */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
        }}
      />
      {/* Crosshair icon */}
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke={effectiveStroke}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative z-10"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
      </svg>
    </button>
  );
}
