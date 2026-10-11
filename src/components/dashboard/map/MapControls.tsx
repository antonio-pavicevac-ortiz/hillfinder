"use client";

import SaveRouteControl from "@/components/dashboard/SaveRouteControl";
import ClearRouteButton from "@/components/dashboard/ui/ClearRouteButton";
import { DashboardLegendPanel } from "@/components/dashboard/ui/DashboardLegend";
import MapControlTooltip from "@/components/dashboard/ui/MapControlTooltip";
import RecenterButton from "@/components/dashboard/ui/RecenterButton";
import {
  mapControlStyle,
  MAP_CONTROL_ICON,
} from "@/components/dashboard/ui/mapControlStyle";
import type { SaveRoutePayload } from "@/types/saved-route";
import { useEffect, useRef, useState } from "react";

type Props = {
  hasRoute: boolean;
  onClearRoute: () => void;
  onRecenter: () => void;
  recenterDisabled?: boolean;
  recenterActive?: boolean;
  hasDestination?: boolean;
  onUndoDestination?: () => void;
  saveRoute?: SaveRoutePayload | null;
  onRouteSaved?: (routeId: string, route: SaveRoutePayload) => void;
  onCreateRoute?: () => void;
  savedRouteId?: string | null;
  isActiveSavedRoute?: boolean;
};

const HEADER_H = 64;

export default function MapControls({
  hasRoute,
  onClearRoute,
  onRecenter,
  recenterDisabled = false,
  recenterActive = false,
  hasDestination = false,
  onUndoDestination,
  saveRoute = null,
  onRouteSaved,
  onCreateRoute,
  savedRouteId = null,
  isActiveSavedRoute = false,
}: Props) {
  const [legendOpen, setLegendOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const stopMapPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
  };

  const stopMapTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    e.stopPropagation();
  };

  const stopMapMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
  };

  const legendEnabled = hasRoute || hasDestination;
  const legendDisabled = !legendEnabled;
  const showUndoDestination = hasDestination && !hasRoute;
  const middleDisabled = showUndoDestination ? !onUndoDestination : !hasRoute;
  const legendVisible = legendOpen && legendEnabled;
  const legendStrokeColor = legendVisible ? "#FFFFFF" : MAP_CONTROL_ICON;

  useEffect(() => {
    if (!legendEnabled) setLegendOpen(false);
  }, [legendEnabled]);

  useEffect(() => {
    if (!legendOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLegendOpen(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      if (buttonRef.current?.contains(t)) return;
      if (wrapRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;

      setLegendOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [legendOpen]);

  return (
    <div
      className="fixed right-3 z-[80] pointer-events-none"
      style={{
        top: `calc(${HEADER_H}px + env(safe-area-inset-top) + 12px)`,
      }}
    >
      <div className="flex flex-col items-end gap-3 pointer-events-auto touch-none">
        <MapControlTooltip label="Recenter on your location">
          {(descriptionId) => (
            <RecenterButton
              onClick={onRecenter}
              interacted={recenterActive}
              disabled={recenterDisabled}
              ariaDescribedBy={descriptionId}
            />
          )}
        </MapControlTooltip>

        <MapControlTooltip
          label={showUndoDestination ? "Undo destination" : "Clear route"}
        >
          {(descriptionId) => (
            <ClearRouteButton
              onClick={() => {
                if (showUndoDestination) onUndoDestination?.();
                else onClearRoute();
              }}
              interacted={!middleDisabled}
              disabled={middleDisabled}
              ariaLabel={
                showUndoDestination ? "Undo destination" : "Clear route"
              }
              ariaDescribedBy={descriptionId}
              pulse={showUndoDestination}
            />
          )}
        </MapControlTooltip>

        <SaveRouteControl
          route={saveRoute}
          onSaved={onRouteSaved}
          onCreateRoute={onCreateRoute}
          savedRouteId={savedRouteId}
          compact
          isActiveSavedRoute={isActiveSavedRoute}
        />

        <div className="relative pointer-events-auto touch-none" ref={wrapRef}>
          <MapControlTooltip
            label={legendVisible ? "Hide legend" : "Show legend"}
          >
            {(descriptionId) => (
              <button
                type="button"
                aria-describedby={descriptionId}
                aria-label={legendVisible ? "Hide legend" : "Show legend"}
                aria-pressed={legendVisible}
                ref={buttonRef}
                disabled={legendDisabled}
                onClick={() => {
                  if (legendDisabled) return;
                  setLegendOpen((v) => !v);
                }}
                className={[
                  "relative flex items-center justify-center transition active:scale-95 disabled:cursor-default overflow-hidden",
                  "rounded-2xl",
                ].join(" ")}
                style={{
                  width: 48,
                  height: 48,
                  ...mapControlStyle("#8845FF", legendVisible),
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
                  }}
                />

                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                  stroke={legendStrokeColor}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="relative z-10"
                  aria-hidden="true"
                >
                  <circle cx="6" cy="7" r="1.6" />
                  <circle cx="6" cy="12" r="1.6" />
                  <circle cx="6" cy="17" r="1.6" />
                  <path d="M10 7h8" />
                  <path d="M10 12h8" />
                  <path d="M10 17h8" />
                </svg>
              </button>
            )}
          </MapControlTooltip>

          {legendVisible && (
            <div
              ref={popoverRef}
              className={[
                "absolute top-[calc(100%+8px)] right-0",
                "w-max max-w-[min(92vw,22rem)]",
                "rounded-2xl border border-white/30 dark:border-slate-700/50",
                "bg-white/80 dark:bg-slate-900/85 saturate-150",
                "shadow-[0_10px_34px_rgba(0,0,0,0.18)]",
                "[-webkit-backdrop-filter:blur(24px)] [backdrop-filter:blur(24px)]",
                "overflow-hidden touch-none",
              ].join(" ")}
              style={{ pointerEvents: "auto" }}
              onPointerDownCapture={stopMapPointerDown}
              onTouchStartCapture={stopMapTouchStart}
              onMouseDownCapture={stopMapMouseDown}
            >
              <div className="relative px-4 py-3">
                <button
                  type="button"
                  aria-label="Close legend"
                  onClick={() => setLegendOpen(false)}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 dark:bg-slate-700/40 border border-white/30 dark:border-slate-600/50 text-slate-900/80 dark:text-slate-200/80 active:scale-95"
                >
                  <span className="text-base leading-none">×</span>
                </button>

                <DashboardLegendPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
