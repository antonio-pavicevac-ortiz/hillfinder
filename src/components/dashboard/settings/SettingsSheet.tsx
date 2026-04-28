"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;

  theme: "light" | "dark";
  onToggleTheme: () => void;

  voiceEnabled: boolean;
  onToggleVoice: () => void;

  lockPortrait: boolean;
  onToggleOrientation: () => void;
};

export default function SettingsSheet({
  open,
  onClose,
  theme,
  onToggleTheme,
  voiceEnabled,
  onToggleVoice,
  lockPortrait,
  onToggleOrientation,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onClose}
      />
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 40 }}
          className="absolute bottom-0 left-0 right-0 px-3 pb-[calc(env(safe-area-inset-bottom)+70px)]"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-[42rem] mx-auto">
            <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl p-4">
              {/* Header */}
              <div className="text-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
              </div>

              {/* Section */}
              <div className="space-y-3">
                {/* Theme */}
                <SettingRow
                  title="Theme"
                  subtitle={theme === "dark" ? "Dark mode" : "Light mode"}
                  action={<Toggle on={theme === "dark"} onClick={onToggleTheme} />}
                />

                {/* Voice */}
                <SettingRow
                  title="Voice Guidance"
                  subtitle={voiceEnabled ? "Enabled" : "Muted"}
                  action={<Toggle on={voiceEnabled} onClick={onToggleVoice} />}
                />

                {/* Orientation */}
                <SettingRow
                  title="Orientation Lock"
                  subtitle={lockPortrait ? "Portrait only" : "Allow rotation"}
                  action={<Toggle on={lockPortrait} onClick={onToggleOrientation} />}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function SettingRow({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-white/60 border border-white/30">
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
      {action}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-12 h-6 rounded-full transition ${
        on ? "bg-emerald-500" : "bg-gray-300"
      }`}
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          on ? "left-6" : "left-0.5"
        }`}
      />
    </button>
  );
}
