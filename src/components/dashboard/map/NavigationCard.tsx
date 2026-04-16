"use client";

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
    <div
      className="fixed left-4 right-[5.75rem] z-20 pointer-events-none"
      style={{ top: "calc(env(safe-area-inset-top) + 80px)" }}
    >
      <div className="w-full max-w-[18.5rem] pointer-events-auto">
        <div
          className="overflow-hidden rounded-[1.75rem]"
          style={{
            background: "rgba(255,255,255,0.62)",
            border: "1px solid rgba(255,255,255,0.38)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <div className="px-3 pt-3 pb-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700/65">
                Navigation
              </div>

              <div className="rounded-full bg-white/50 px-2.5 py-1 text-[10px] font-medium text-slate-800">
                Step {stepIndex + 1} / {totalSteps}
              </div>
            </div>

            <div className="text-[0.95rem] font-semibold leading-5 text-slate-900">
              {currentInstruction}
            </div>

            {distanceText ? (
              <div className="mt-2 text-[13px] font-medium text-slate-700/78">
                In {distanceText}
              </div>
            ) : null}

            {nextInstruction ? (
              <div className="mt-3 rounded-2xl bg-white/34 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700/60">
                  Then
                </div>
                <div className="mt-1 text-[12px] leading-4 text-slate-800">{nextInstruction}</div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl bg-white/34 px-3 py-2 text-[13px] text-slate-800">
                You’re on the final step.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-black/5 px-3 py-3">
            <button
              onClick={onToggleMute}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/50 bg-white/58 px-3.5 text-slate-800 transition active:scale-95"
              aria-label={isMuted ? "Unmute voice guidance" : "Mute voice guidance"}
            >
              {isMuted ? (
                <VolumeX size={18} className="text-slate-800" />
              ) : (
                <Volume2 size={18} className="text-slate-800" />
              )}
              <span className="text-[12px] font-semibold">{isMuted ? "Muted" : "Voice"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onPreviousStep}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/42 bg-white/42 transition active:scale-95"
                aria-label="Previous step"
              >
                <ChevronLeft size={18} className="text-slate-700" />
              </button>

              <button
                onClick={onNextStep}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/42 bg-white/42 transition active:scale-95"
                aria-label="Next step"
              >
                <ChevronRight size={18} className="text-slate-700" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
