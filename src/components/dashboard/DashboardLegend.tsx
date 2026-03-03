"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";

type Props = {
  visible?: boolean;
  disabled?: boolean;
};

export function DashboardLegendPanel() {
  const Row = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-3 flex-nowrap min-w-0 whitespace-nowrap">
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full border border-white/35 shadow-sm"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {/* ✅ one line, no wrapping (truncate instead of wrapping) */}
      <span
        className={[
          "min-w-0",
          "truncate",
          "whitespace-nowrap",
          "text-nowrap",
          "text-xs",
          "leading-none",
          "text-slate-900/90",
        ].join(" ")}
        style={{ whiteSpace: "nowrap" }}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-2 text-sm font-semibold text-slate-900">Legend</div>
      <div className="flex flex-col gap-2">
        <Row color="#22c55e" label="Easy downhill" />
        <Row color="#eab308" label="Medium downhill" />
        <Row color="#ef4444" label="Hard downhill" />
        <Row color="#7f1d1d" label="Uphill" />
      </div>
    </div>
  );
}

export function DashboardLegend({ visible = true, disabled = false }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const draggedRef = useRef(false);

  if (!visible) return null;

  const Row = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2 flex-nowrap min-w-0 whitespace-nowrap">
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full border border-white/35 shadow-sm"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span
        className={[
          "min-w-0",
          "truncate",
          "whitespace-nowrap",
          "text-nowrap",
          "text-[11px]",
          "leading-none",
          "text-slate-900/90",
        ].join(" ")}
        style={{ whiteSpace: "nowrap" }}
      >
        {label}
      </span>
    </div>
  );

  // geometry
  const OPEN_W = 188;
  const STUCK_W = 26; // the “piece stuck to the wall”
  const FIXED_H = 155;

  // handle
  const HANDLE_W = 8;
  const HANDLE_H = 40;

  const translateX = collapsed ? -(OPEN_W - STUCK_W) : 0;

  return (
    <motion.button
      type="button"
      // ✅ mobile-reliable tap handler (onClick can get swallowed by drag on iOS)
      onTap={() => {
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
        disabled
          ? "relative pointer-events-none select-none overflow-hidden opacity-60 cursor-not-allowed"
          : "relative pointer-events-auto select-none overflow-hidden cursor-pointer",
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
      drag="x"
      dragDirectionLock
      dragElastic={0.12}
      dragMomentum={false}
      dragConstraints={{ left: -(OPEN_W - STUCK_W), right: 0 }}
      onDragEnd={(_, info) => {
        // ✅ require a bit more movement before we treat it as a drag
        if (Math.abs(info.offset.x) > 10) draggedRef.current = true;

        if (!collapsed && info.offset.x < -38) {
          setCollapsed(true);
          return;
        }
        if (collapsed && info.offset.x > 38) {
          setCollapsed(false);
          return;
        }
      }}
      animate={{ x: translateX }}
      transition={{
        x: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      {/* CONTENT LAYER */}
      <div
        className={[
          "absolute inset-0",
          "pt-3 pb-3 pl-3 pr-6",
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

      {/* Handle pill stays visible even when collapsed */}
      <div
        className={[
          "absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full border border-white/35 shadow-sm transition-colors",
          disabled ? "bg-slate-400/70" : "bg-slate-900/85",
        ].join(" ")}
        style={{ width: HANDLE_W, height: HANDLE_H }}
        aria-hidden="true"
      />
    </motion.button>
  );
}
