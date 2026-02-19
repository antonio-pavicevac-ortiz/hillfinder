"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";

type Props = {
  visible?: boolean;
};

export function DashboardLegend({ visible = true }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const draggedRef = useRef(false);

  if (!visible) return null;

  const Row = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-3">
      <span
        className="inline-block h-3 w-3 rounded-full border border-white/35 shadow-sm"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-sm text-slate-900/90">{label}</span>
    </div>
  );

  // geometry
  const OPEN_W = 188;
  const STUCK_W = 26; // 👈 the “piece stuck to the wall”
  const FIXED_H = 155;
  const OFFSET_Y = 60; // move legend down ~10px

  // handle (visible + matches planner language)
  const HANDLE_W = 8;
  const HANDLE_H = 40;

  // When collapsed, we slide most of it left off-screen,
  // leaving STUCK_W visible.
  const translateX = collapsed ? -(OPEN_W - STUCK_W) : 0;

  return (
    <motion.button
      type="button"
      onClick={() => {
        // If the user just dragged, don’t also toggle on click.
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        setCollapsed((v) => !v);
      }}
      onPointerDown={() => {
        draggedRef.current = false;
      }}
      aria-label={collapsed ? "Show legend" : "Hide legend"}
      aria-expanded={!collapsed}
      className={[
        "relative pointer-events-auto select-none overflow-hidden",
        "rounded-2xl border border-white/30",
        "bg-white/20 saturate-150",
        "shadow-[0_10px_34px_rgba(0,0,0,0.18)]",
        "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)]",
        "active:scale-[0.99]",
      ].join(" ")}
      style={{
        width: OPEN_W,
        height: FIXED_H,
      }}
      // ✅ Subtle “alive” gesture: users can brush it, but it snaps.
      drag="x"
      dragDirectionLock
      dragElastic={0.12}
      dragMomentum={false}
      dragConstraints={{ left: -(OPEN_W - STUCK_W), right: 0 }}
      onDragEnd={(_, info) => {
        // Mark as drag if they moved it meaningfully.
        if (Math.abs(info.offset.x) > 6) draggedRef.current = true;

        // If they intentionally swiped toward the edge, toggle state.
        if (!collapsed && info.offset.x < -38) {
          setCollapsed(true);
          return;
        }
        if (collapsed && info.offset.x > 38) {
          setCollapsed(false);
          return;
        }
        // Otherwise snap back to the current state (handled by animate below).
      }}
      animate={{ x: translateX, y: OFFSET_Y }}
      transition={{
        x: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      {/* CONTENT LAYER */}
      <div
        className={[
          "absolute inset-0",
          "pt-4 pb-3 pl-4 pr-8", // 👈 tuned
          collapsed ? "opacity-0" : "opacity-100",
          "transition-opacity duration-150",
        ].join(" ")}
      >
        <div className="mb-2 text-sm font-semibold text-slate-900">Legend</div>

        <div className="flex flex-col gap-1.5">
          <Row color="#22c55e" label="Easy downhill" />
          <Row color="#eab308" label="Medium downhill" />
          <Row color="#ef4444" label="Hard downhill" />
          <Row color="#7f1d1d" label="Uphill" />
        </div>
      </div>

      {/* ✅ Handle pill stays visible even when collapsed */}
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full
                   bg-slate-500/70 border border-white/35 shadow-sm"
        style={{ width: HANDLE_W, height: HANDLE_H }}
        aria-hidden="true"
      />
    </motion.button>
  );
}
