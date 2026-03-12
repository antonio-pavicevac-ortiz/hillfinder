"use client";

import type { SavedRouteRecord } from "@/types/saved-route";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

const DISMISS_Y = 110;

export default function RecentRoutesPanel({
  open,
  onClose,
  onLoadRoute,
  refreshKey = 0,
  activeRouteId,
}: {
  open: boolean;
  onClose: () => void;
  onLoadRoute: (route: SavedRouteRecord) => void;
  refreshKey?: number;
  activeRouteId?: string | null;
}) {
  const [routes, setRoutes] = useState<SavedRouteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();

  async function fetchRoutes() {
    try {
      setIsLoading(true);

      const res = await fetch("/api/routes");
      if (!res.ok) {
        throw new Error("Failed to fetch routes");
      }

      const data = await res.json();
      setRoutes(data.routes || []);
    } catch (err) {
      console.error("[RecentRoutesPanel]", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    fetchRoutes();
  }, [refreshKey, open]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  function onSheetDragEnd(_: PointerEvent, info: PanInfo) {
    if (info.offset.y > DISMISS_Y || info.velocity.y > 900) {
      onClose();
    }
  }

  function handlePillPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    dragControls.start(e);
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[140] pointer-events-none">
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] pointer-events-auto"
        onClick={onClose}
      />

      <AnimatePresence>
        <div className="absolute left-0 right-0 bottom-0 pointer-events-none">
          <div
            className="pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              paddingLeft: 12,
              paddingRight: 12,
              paddingBottom: "calc(env(safe-area-inset-bottom) + 50px)",
            }}
          >
            <div className="mx-auto max-w-[42rem] pb-3">
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.9 }}
                drag="y"
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0 }}
                dragElastic={0.18}
                onDragEnd={onSheetDragEnd}
                className={[
                  "pointer-events-auto w-full",
                  "bg-white/70 backdrop-blur-xl",
                  "rounded-2xl border border-white/30 shadow-xl p-5",
                  "relative isolate",
                ].join(" ")}
                style={{ touchAction: "manipulation" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-center mb-1">
                  <button
                    type="button"
                    aria-label="Minimize routes"
                    className="group w-full flex justify-center py-3 -my-2 cursor-grab active:cursor-grabbing"
                    style={{ touchAction: "none" }}
                    onPointerDown={handlePillPointerDown}
                    onClick={onClose}
                  >
                    <div className="h-1.5 w-12 rounded-full bg-gray-400/60 transition-colors duration-200 group-hover:bg-gray-600/70 group-active:bg-gray-600/70" />
                  </button>
                </div>

                <div className="flex items-center justify-center">
                  <h2 className="text-lg font-semibold text-gray-900">Saved Routes</h2>
                </div>

                <div className="mt-4">
                  {isLoading ? (
                    <div className="rounded-xl border border-white/40 bg-white/55 px-4 py-3">
                      <p className="text-sm text-slate-600">Loading Saved Routes...</p>
                    </div>
                  ) : !routes.length ? (
                    <div className="rounded-xl border border-white/40 bg-white/55 px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">No saved routes yet.</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Save your first downhill run and it’ll appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div
                        className={[
                          "rounded-2xl border border-slate-200/80 bg-slate-50/70",
                          "shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_0_0_1px_rgba(15,23,42,0.03)]",
                          "p-2",
                        ].join(" ")}
                      >
                        <div
                          ref={scrollRef}
                          className="max-h-40 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 pointer-events-auto [touch-action:pan-y]"
                          style={{ WebkitOverflowScrolling: "touch" }}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {routes.map((route, index) => {
                            const isActive = Boolean(activeRouteId && route._id === activeRouteId);

                            return (
                              <div
                                key={route._id}
                                className={index > 0 ? "border-t border-slate-200/80" : ""}
                              >
                                <button
                                  onClick={() => onLoadRoute(route)}
                                  className={[
                                    "w-full px-3 py-3 text-left transition active:scale-[0.99]",
                                    "rounded-lg",
                                    isActive
                                      ? "bg-emerald-50/90"
                                      : "bg-transparent hover:bg-white/70",
                                  ].join(" ")}
                                >
                                  <div className="flex min-w-0 items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <p className="block truncate text-sm font-semibold text-slate-900">
                                        {route.name ||
                                          `${route.from.name || "From"} → ${route.to.name || "Destination"}`}
                                      </p>

                                      {isActive && (
                                        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                          Active
                                        </div>
                                      )}
                                    </div>

                                    <span className="shrink-0 rounded-full bg-slate-900/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                                      {route.difficulty}
                                    </span>
                                  </div>

                                  <p className="mt-2 break-words [overflow-wrap:anywhere] text-xs leading-5 text-slate-600">
                                    <span className="font-semibold text-slate-700">From:</span>{" "}
                                    {route.from.name || "From"}
                                    <span className="mx-1.5 text-slate-400">→</span>
                                    <span className="font-semibold text-slate-700">To:</span>{" "}
                                    {route.to.name || "Destination"}
                                  </p>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute left-2 right-3 top-2 h-5 rounded-t-2xl bg-gradient-to-b from-slate-50/95 via-slate-50/70 to-transparent"
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-2 left-2 right-3 h-6 rounded-b-2xl bg-gradient-to-t from-slate-50/95 via-slate-50/70 to-transparent"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
