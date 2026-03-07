"use client";

import { useEffect } from "react";

type Props = {
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  size?: number;
  ariaLabel?: string;
  pulse?: boolean;
};

export const CLEAR_ROUTE_ROUNDED = "rounded-2xl";

export default function ClearRouteButton({
  disabled,
  onClick,
  className = "",
  size = 48,
  ariaLabel,
  pulse = false,
}: Props) {
  const strokeColor = disabled ? "rgba(100,116,139,0.95)" : "rgba(15,23,42,0.95)";

  useEffect(() => {
    const id = "hf-undo-pulse-style";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @keyframes hfUndoPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.07); }
        100% { transform: scale(1); }
      }

      .hf-undo-pulse {
        animation: hfUndoPulse 1.4s ease-in-out infinite;
      }
    `;

    document.head.appendChild(style);
  }, []);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel ?? "Clear current route"}
      className={[
        "relative flex items-center justify-center transition active:scale-95 disabled:cursor-default overflow-hidden",
        pulse ? "hf-undo-pulse" : "",
        CLEAR_ROUTE_ROUNDED,
        className,
      ].join(" ")}
      style={{
        width: size,
        height: size,
        background: disabled ? "rgba(160,170,185,0.18)" : "rgba(255,255,255,0.22)",
        border: disabled ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.40)",
        backdropFilter: "blur(26px)",
        WebkitBackdropFilter: "blur(26px)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)",
      }}
    >
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
