"use client";

type Props = {
  disabled?: boolean;
  onClick?: () => void;
  /** Optional extra classes (useful when positioning it as a floating control) */
  className?: string;
  /** Size in pixels for width/height. Defaults to 48 (Tailwind h-12/w-12). */
  size?: number;
};

export const CLEAR_ROUTE_ROUNDED = "rounded-2xl";

export default function ClearRouteButton({ disabled, onClick, className = "", size = 48 }: Props) {
  const strokeColor = disabled
    ? "rgba(100,116,139,0.95)" // grey stroke when disabled
    : "rgba(15,23,42,0.95)"; // dark when active

  return (
    <button
      type="button"
      aria-label="Clear route"
      disabled={disabled}
      onClick={onClick}
      className={[
        "relative flex items-center justify-center transition active:scale-95 disabled:cursor-default overflow-hidden",
        CLEAR_ROUTE_ROUNDED,
        className,
      ].join(" ")}
      style={{
        width: size,
        height: size,
        // 🔹 Darker, richer glass (matches CTA better)
        background: disabled ? "rgba(160,170,185,0.18)" : "rgba(255,255,255,0.22)",

        border: disabled ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.40)",

        backdropFilter: "blur(26px)",
        WebkitBackdropFilter: "blur(26px)",

        // 🔒 YOUR shadow untouched
        boxShadow: "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)",
      }}
    >
      {/* Top highlight layer (like CTA) */}
      <div
        aria-hidden
        className={["absolute inset-0 pointer-events-none", CLEAR_ROUTE_ROUNDED].join(" ")}
        style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
        }}
      />

      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative z-10"
      >
        <path d="M9 14l-4-4 4-4" />
        <path d="M5 10h9a5 5 0 1 1 0 10h-1.5" />
      </svg>
    </button>
  );
}
