"use client";

import SheetDragHandle from "@/components/dashboard/ui/SheetDragHandle";

import { Route, Star, TrendingDown, Zap } from "lucide-react";
import { motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onQuickRoute: () => void;
  onStartRoute: () => void;
  onViewSaved: () => void;
  onFindDownhill: () => void;
  quickRouteEnabled?: boolean;
  isOffline?: boolean;
}

export default function QuickActionsSheet({
  open,
  onClose,
  onQuickRoute,
  onStartRoute,
  onViewSaved,
  onFindDownhill,
  quickRouteEnabled,
  isOffline = false,
}: Props) {
  const canQuickRoute = !isOffline && (quickRouteEnabled ?? true);
  const dragControls = useDragControls();
  const reducedMotion = useReducedMotion();

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 900) onClose();
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}

      <motion.div
        initial={false}
        animate={{ y: open ? 0 : "100%" }}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40, mass: 0.9 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={0.18}
        onDragEnd={handleDragEnd}
        inert={!open}
        aria-hidden={!open}
        className={`
          fixed left-0 right-0 bottom-0 z-50
          rounded-t-2xl border-t border-black/10 dark:border-white/10
          bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lg
          ${open ? "pointer-events-auto" : "pointer-events-none"}
        `}
      >
        <div className="px-6 pt-12 pb-6">
          <SheetDragHandle
            label="Close Quick Actions"
            onClose={onClose}
            onPointerDown={(event) => {
              event.stopPropagation();
              dragControls.start(event);
            }}
          />
          <div className="space-y-4">
          <button
            onClick={() => {
              if (!canQuickRoute) return;
              onQuickRoute();
              onClose();
            }}
            disabled={!canQuickRoute}
            className={[
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition border font-medium",
              canQuickRoute
                ? "bg-rose-100 hover:bg-rose-200 border-rose-200 text-rose-900 dark:bg-rose-950/60 dark:hover:bg-rose-900/70 dark:border-rose-800/60 dark:text-rose-300"
                : "bg-rose-50 border-rose-200/60 text-rose-400 cursor-not-allowed opacity-60 dark:bg-rose-950/25 dark:border-rose-800/30 dark:text-rose-600",
            ].join(" ")}
          >
            <Zap className={canQuickRoute ? "text-rose-700 dark:text-rose-400" : "text-rose-400 dark:text-rose-600"} />
            Quick Route
          </button>

          {!canQuickRoute && !isOffline && (
            <p className="px-1 -mt-2 text-xs text-rose-400/80 dark:text-rose-600/80">
              Set a destination on the map first.
            </p>
          )}

          {isOffline && (
            <p className="px-1 -mt-2 text-xs text-slate-400/80 dark:text-slate-500/80">
              Route generation needs a connection.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              if (isOffline) return;
              onFindDownhill();
              onClose();
            }}
            disabled={isOffline}
            className={[
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition border font-medium",
              isOffline
                ? "bg-emerald-50 border-emerald-200/60 text-emerald-400 cursor-not-allowed opacity-60 dark:bg-emerald-950/25 dark:border-emerald-800/30 dark:text-emerald-600"
                : "bg-emerald-100 hover:bg-emerald-200 border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 dark:border-emerald-800/60 dark:text-emerald-300",
            ].join(" ")}
          >
            <TrendingDown className={isOffline ? "text-emerald-400 dark:text-emerald-600" : "text-emerald-800 dark:text-emerald-400"} />
            Find a Downhill
          </button>

          <button
            onClick={() => {
              if (isOffline) return;
              onStartRoute();
              onClose();
            }}
            disabled={isOffline}
            className={[
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition border font-medium",
              isOffline
                ? "bg-blue-50 border-blue-200/60 text-blue-400 cursor-not-allowed opacity-60 dark:bg-blue-950/25 dark:border-blue-800/30 dark:text-blue-600"
                : "bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-900 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 dark:border-blue-800/60 dark:text-blue-300",
            ].join(" ")}
          >
            <Route className={isOffline ? "text-blue-400 dark:text-blue-600" : "text-blue-700 dark:text-blue-400"} />
            Plan Your Route
          </button>

          <button
            onClick={() => {
              onViewSaved();
              onClose();
            }}
            className="w-full flex items-center gap-3 bg-amber-100 hover:bg-amber-200 border border-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 dark:border-amber-800/60 px-4 py-3 rounded-xl text-amber-900 dark:text-amber-300 font-medium transition"
          >
            <Star className="text-amber-700 dark:text-amber-400" />
            Saved Routes
          </button>
        </div>
        </div>
      </motion.div>
    </>
  );
}
