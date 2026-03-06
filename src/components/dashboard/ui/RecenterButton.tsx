"use client";

type Props = {
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
  disabled = false,
  strokeColor,
  className,
  ariaLabel = "Recenter map",
}: Props) {
  const effectiveStroke =
    strokeColor ?? (disabled ? "rgba(100,116,139,0.95)" : "rgba(15,23,42,0.95)");

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
        background: disabled ? "rgba(160,170,185,0.18)" : "rgba(255,255,255,0.22)",
        border: disabled ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.40)",
        backdropFilter: "blur(26px)",
        WebkitBackdropFilter: "blur(26px)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)",
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
