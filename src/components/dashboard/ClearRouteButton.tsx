"use client";

type Props = {
  disabled?: boolean;
  onClick?: () => void;
};

export default function ClearRouteButton({ disabled, onClick }: Props) {
  const strokeColor = disabled
    ? "rgba(100,116,139,0.95)" // grey stroke when disabled
    : "rgba(15,23,42,0.95)"; // dark when active

  return (
    <button
      type="button"
      aria-label="Clear route"
      disabled={disabled}
      onClick={onClick}
      className="relative flex items-center justify-center h-12 w-12 rounded-2xl border transition active:scale-95 disabled:cursor-default"
      style={{
        // 🔻 slightly greyer / more "disabled" glass when disabled
        background: disabled ? "rgba(160,170,185,0.18)" : "rgba(255,255,255,0.18)",
        borderColor: disabled ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.30)",
        backdropFilter: "blur(26px)",
        WebkitBackdropFilter: "blur(26px)",

        // tight grounded shadow (kept)
        boxShadow: "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 14l-4-4 4-4" />
        <path d="M5 10h9a5 5 0 1 1 0 10h-1.5" />
      </svg>
    </button>
  );
}
