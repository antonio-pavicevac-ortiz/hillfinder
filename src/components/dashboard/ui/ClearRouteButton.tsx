"use client";

import { useEffect } from "react";
import { mapControlStyle, MAP_CONTROL_ICON } from "./mapControlStyle";

type Props = {
  interacted?: boolean;
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
  interacted = false,
  onClick,
  className = "",
  size = 48,
  ariaLabel,
  pulse = false,
}: Props) {
  const strokeColor = interacted ? "#FFFFFF" : MAP_CONTROL_ICON;

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
        ...mapControlStyle("#FF6415", interacted),
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
