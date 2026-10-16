"use client";

import { motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Flag,
  Navigation as NavigationIcon,
  RefreshCw,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";

type NavigationCardProps = {
  currentInstruction: string;
  distanceText?: string;
  nextInstruction?: string;
  stepIndex: number;
  totalSteps: number;
  isPreview?: boolean;
  onStart?: () => void;
  isOffRoute?: boolean;
  isRejoinShown?: boolean;
  canStartNewRoute?: boolean;
  onBackToRoute?: () => void;
  onNewRouteFromHere?: () => void;
  onEnd?: () => void;
  isArrived?: boolean;
  destinationName?: string;
  rideTimeText?: string;
  rideDistanceText?: string;
  onDone?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
};

export default function NavigationCard({
  currentInstruction,
  distanceText,
  nextInstruction,
  stepIndex,
  totalSteps,
  isPreview = false,
  onStart,
  isOffRoute = false,
  isRejoinShown = false,
  canStartNewRoute = true,
  onBackToRoute,
  onNewRouteFromHere,
  onEnd,
  isArrived = false,
  destinationName,
  rideTimeText,
  rideDistanceText,
  onDone,
  isMuted,
  onToggleMute,
  onPreviousStep,
  onNextStep,
}: NavigationCardProps) {
  if (isArrived) {
    return (
      <CardShell>
        <div className="px-3.5 pt-3.5 pb-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">
            <Flag size={13} aria-hidden="true" />
            Arrived
          </div>

          <div role="status" aria-live="polite">
            <div className="text-[1.05rem] font-semibold leading-5 text-slate-900 dark:text-white">
              You’ve arrived
            </div>
            {destinationName ? (
              <div className="mt-1 truncate text-[13px] text-slate-800 dark:text-slate-300">{destinationName}</div>
            ) : null}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2">
            <RideStat label="Time" value={rideTimeText} />
            <RideStat label="Distance" value={rideDistanceText} />
          </dl>
        </div>

        <div className="border-t border-black/5 dark:border-white/10 px-3 py-3">
          <button
            onClick={onDone}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-600/40 bg-emerald-600 px-4 text-[14px] font-semibold text-white shadow-md transition hover:bg-emerald-700 active:scale-95 active:bg-emerald-800"
          >
            <Check size={16} aria-hidden="true" />
            Done
          </button>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell>
      <div className="px-3.5 pt-3.5 pb-2.5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-800/75 dark:text-slate-200/75">
            {isPreview ? "Route preview" : "Navigation"}
          </div>

          {/* The distance to the next turn means nothing once the rider has left the route */}
          <div role="status" aria-live="polite">
            {isOffRoute ? (
              <div className="rounded-full border border-amber-400/60 bg-amber-300/80 dark:border-amber-500/50 dark:bg-amber-500/30 px-2.5 py-1 text-[11px] font-semibold text-amber-950 dark:text-amber-200 backdrop-blur-md">
                Off route
              </div>
            ) : (
              <div className="rounded-full border border-white/30 bg-white/28 dark:bg-slate-900/40 px-2.5 py-1 text-[11px] font-medium text-slate-800 dark:text-slate-200 backdrop-blur-md">
                Step {stepIndex + 1} / {totalSteps}
                {distanceText ? ` • In ${distanceText}` : ""}
              </div>
            )}
          </div>
        </div>

        {/* Dimmed rather than hidden: likely stale, but still shows where the route goes */}
        <div
          className={`transition-opacity duration-300 motion-reduce:transition-none ${isOffRoute ? "opacity-45" : ""}`}
        >
          <div className="text-[0.95rem] font-semibold leading-5 text-slate-900 dark:text-white">
            {currentInstruction}
          </div>

          {nextInstruction ? (
            <div className="mt-3 text-[0.95rem] leading-5 text-slate-900 dark:text-slate-100">
              <span className="font-semibold mr-1">Then:</span>
              <span>{nextInstruction}</span>
            </div>
          ) : (
            <div className="mt-3 text-[13px] text-slate-800 dark:text-slate-300">You’re on the final step.</div>
          )}
        </div>

        {isOffRoute && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={onBackToRoute}
              disabled={isRejoinShown}
              aria-label={isRejoinShown ? "Way back to the route is shown on the map" : "Show the way back to the route"}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-blue-600/40 bg-blue-600 px-2 text-[13px] font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-95 active:bg-blue-800 disabled:cursor-default disabled:opacity-70 disabled:active:scale-100"
            >
              <CornerDownLeft size={15} aria-hidden="true" />
              {isRejoinShown ? "Way shown" : "Back to route"}
            </button>

            <button
              onClick={onNewRouteFromHere}
              disabled={!canStartNewRoute}
              aria-label="New route from here"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/50 dark:border-slate-600/50 bg-white/55 dark:bg-slate-800/55 px-2 text-[13px] font-semibold text-slate-800 dark:text-slate-200 shadow-md backdrop-blur-md transition hover:bg-white/65 dark:hover:bg-slate-800/70 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            >
              <RefreshCw size={15} aria-hidden="true" />
              New route
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-black/5 dark:border-white/10 px-3 py-3">
        <button
          onClick={onToggleMute}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/50 dark:border-slate-600/50 bg-white/55 dark:bg-slate-800/55 px-3.5 text-slate-800 dark:text-slate-200 shadow-md backdrop-blur-md transition hover:bg-white/65 dark:hover:bg-slate-800/70 active:scale-95 active:bg-white/75 dark:active:bg-slate-800/80"
          aria-label={isMuted ? "Unmute voice guidance" : "Mute voice guidance"}
        >
          {isMuted ? (
            <VolumeX size={18} className="text-slate-700 dark:text-slate-300" />
          ) : (
            <Volume2 size={18} className="text-slate-700 dark:text-slate-300" />
          )}
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            {isMuted ? "Muted" : "Voice"}
          </span>
        </button>

        {isPreview ? (
          <button
            onClick={onStart}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-600/40 bg-emerald-600 px-4 text-[14px] font-semibold text-white shadow-md transition hover:bg-emerald-700 active:scale-95 active:bg-emerald-800"
          >
            <NavigationIcon size={16} aria-hidden="true" />
            Start
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {/* Icon only: with a label, the footer overflows the card on 375pt-wide phones */}
            <button
              onClick={onEnd}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-600/40 bg-rose-600 text-white shadow-md transition hover:bg-rose-700 active:scale-95 active:bg-rose-800"
              aria-label="End navigation"
              title="End navigation"
            >
              <Square size={13} fill="currentColor" aria-hidden="true" />
            </button>

            <button
              onClick={onPreviousStep}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 dark:border-slate-600/50 bg-white/55 dark:bg-slate-800/55 shadow-md backdrop-blur-md transition hover:bg-white/65 dark:hover:bg-slate-800/70 active:scale-95 active:bg-white/75 dark:active:bg-slate-800/80"
              aria-label="Previous step"
            >
              <ChevronLeft size={18} className="text-slate-700 dark:text-slate-300" />
            </button>

            <button
              onClick={onNextStep}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 dark:border-slate-600/50 bg-white/55 dark:bg-slate-800/55 shadow-md backdrop-blur-md transition hover:bg-white/65 dark:hover:bg-slate-800/70 active:scale-95 active:bg-white/75 dark:active:bg-slate-800/80"
              aria-label="Next step"
            >
              <ChevronRight size={18} className="text-slate-700 dark:text-slate-300" />
            </button>
          </div>
        )}
      </div>
    </CardShell>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed left-4 right-[5.75rem] z-20 pointer-events-none"
      style={{ top: "calc(env(safe-area-inset-top) + 80px)" }}
    >
      <div className="w-full max-w-[19rem] pointer-events-auto">
        <div
          className="overflow-hidden rounded-3xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(236,228,214,0.22) 100%)",
            border: "1px solid rgba(255,255,255,0.32)",
            backdropFilter: "blur(34px) saturate(145%)",
            WebkitBackdropFilter: "blur(34px) saturate(145%)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
}

function RideStat({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-white/30 bg-white/28 dark:bg-slate-900/40 px-2.5 py-1.5 backdrop-blur-md">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-400">{label}</dt>
      <dd className="text-[15px] font-semibold text-slate-900 dark:text-white">{value || "—"}</dd>
    </div>
  );
}
