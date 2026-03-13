"use client";

import SaveRouteControl from "@/components/dashboard/SaveRouteControl";
import ClearRouteButton from "@/components/dashboard/ui/ClearRouteButton";
import { DashboardLegendPanel } from "@/components/dashboard/ui/DashboardLegend";
import RecenterButton from "@/components/dashboard/ui/RecenterButton";
import type { SaveRoutePayload } from "@/types/saved-route";
import { useEffect, useRef, useState } from "react";

type Props = {
  hasRoute: boolean;
  onClearRoute: () => void;
  onRecenter: () => void;
  recenterDisabled?: boolean;
  hasDestination?: boolean;
  onUndoDestination?: () => void;
  saveRoute?: SaveRoutePayload | null;
  onRouteSaved?: () => void;
  isActiveSavedRoute?: boolean;
};

const HEADER_H = 64;

export default function MapControls({
  hasRoute,
  onClearRoute,
  onRecenter,
  recenterDisabled = false,
  hasDestination = false,
  onUndoDestination,
  saveRoute = null,
  onRouteSaved,
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
  const legendStrokeColor = legendDisabled ? "rgba(100,116,139,0.95)" : "rgba(15,23,42,0.95)";

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
        <div
          className="pointer-events-auto touch-none"
          onPointerDownCapture={stopMapPointerDown}
          onTouchStartCapture={stopMapTouchStart}
          onMouseDownCapture={stopMapMouseDown}
        >
          <RecenterButton onClick={onRecenter} disabled={recenterDisabled} />
        </div>

        <div
          className="pointer-events-auto touch-none"
          onPointerDownCapture={stopMapPointerDown}
          onTouchStartCapture={stopMapTouchStart}
          onMouseDownCapture={stopMapMouseDown}
        >
          <ClearRouteButton
            onClick={showUndoDestination ? (onUndoDestination ?? (() => {})) : onClearRoute}
            disabled={middleDisabled}
            ariaLabel={showUndoDestination ? "Undo destination" : "Clear route"}
            pulse={showUndoDestination}
          />
        </div>

        <div
          className="pointer-events-auto touch-none"
          onPointerDownCapture={stopMapPointerDown}
          onTouchStartCapture={stopMapTouchStart}
          onMouseDownCapture={stopMapMouseDown}
        >
          <SaveRouteControl
            route={saveRoute}
            onSaved={onRouteSaved}
            compact
            isActiveSavedRoute={isActiveSavedRoute}
          />
        </div>

        <div
          className="relative pointer-events-auto touch-none"
          ref={wrapRef}
          onPointerDownCapture={stopMapPointerDown}
          onTouchStartCapture={stopMapTouchStart}
          onMouseDownCapture={stopMapMouseDown}
        >
          <button
            type="button"
            aria-label={legendOpen ? "Hide legend" : "Show legend"}
            aria-pressed={legendOpen}
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
              background: legendDisabled ? "rgba(160,170,185,0.18)" : "rgba(255,255,255,0.22)",
              border: legendDisabled
                ? "1px solid rgba(255,255,255,0.22)"
                : "1px solid rgba(255,255,255,0.40)",
              backdropFilter: "blur(26px)",
              WebkitBackdropFilter: "blur(26px)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)",
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

          {legendOpen && (
            <div
              ref={popoverRef}
              className={[
                "absolute top-[calc(100%+8px)] right-0",
                "w-max max-w-[min(92vw,22rem)]",
                "rounded-2xl border border-white/30",
                "bg-white/20 saturate-150",
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
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 border border-white/30 text-slate-900/80 active:scale-95"
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
