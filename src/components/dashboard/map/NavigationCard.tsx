"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";

type NavigationCardProps = {
  currentInstruction: string;
  distanceText?: string;
  nextInstruction?: string;
  stepIndex: number;
  totalSteps: number;
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
  isMuted,
  onToggleMute,
  onPreviousStep,
  onNextStep,
}: NavigationCardProps) {
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
          <div className="px-3.5 pt-3.5 pb-2.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-800/75">
                Navigation
              </div>

              <div className="rounded-full border border-white/30 bg-white/28 px-2.5 py-1 text-[11px] font-medium text-slate-800 backdrop-blur-md">
                Step {stepIndex + 1} / {totalSteps}
                {distanceText ? ` • In ${distanceText}` : ""}
              </div>
            </div>

            <div className="text-[0.95rem] font-semibold leading-5 text-slate-900">
              {currentInstruction}
            </div>

            {nextInstruction ? (
              <div className="mt-3 text-[0.95rem] leading-5 text-slate-900">
                <span className="font-semibold mr-1">Then:</span>
                <span>{nextInstruction}</span>
              </div>
            ) : (
              <div className="mt-3 text-[13px] text-slate-800">You’re on the final step.</div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-black/5 px-3 py-3">
            <button
              onClick={onToggleMute}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/50 bg-white/55 px-3.5 text-slate-800 shadow-md backdrop-blur-md transition hover:bg-white/65 active:scale-95 active:bg-white/75"
              aria-label={isMuted ? "Unmute voice guidance" : "Mute voice guidance"}
            >
              {isMuted ? (
                <VolumeX size={18} className="text-slate-700" />
              ) : (
                <Volume2 size={18} className="text-slate-700" />
              )}
              <span className="text-[12px] font-semibold text-slate-700">
                {isMuted ? "Muted" : "Voice"}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onPreviousStep}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 bg-white/55 shadow-md backdrop-blur-md transition hover:bg-white/65 active:scale-95 active:bg-white/75"
                aria-label="Previous step"
              >
                <ChevronLeft size={18} className="text-slate-700" />
              </button>

              <button
                onClick={onNextStep}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 bg-white/55 shadow-md backdrop-blur-md transition hover:bg-white/65 active:scale-95 active:bg-white/75"
                aria-label="Next step"
              >
                <ChevronRight size={18} className="text-slate-700" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
