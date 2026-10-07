import type { CSSProperties } from "react";

export const MAP_CONTROL_ICON = "#8A9099";

export function mapControlStyle(color: string, interacted: boolean): CSSProperties {
  return {
    background: interacted ? color : "#F7F4ED",
    border: "1px solid rgba(255,255,255,0.40)",
    color: interacted ? "#FFFFFF" : MAP_CONTROL_ICON,
    backdropFilter: "blur(26px)",
    WebkitBackdropFilter: "blur(26px)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)",
  };
}
