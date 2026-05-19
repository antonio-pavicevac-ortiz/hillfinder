"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  DEFAULT_TERRAIN_VOICE_STYLE,
  TERRAIN_STYLE_STORAGE_KEY,
  type TerrainVoiceStyle,
} from "@/lib/navigation/terrainPhrases";

export default function SettingsPage({ onBack }: { onBack?: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lockPortrait, setLockPortrait] = useState(true);
  const [terrainStyle, setTerrainStyle] = useState<TerrainVoiceStyle>(DEFAULT_TERRAIN_VOICE_STYLE);
  const [hydrated, setHydrated] = useState(false);

  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    function syncSettings() {
      const savedVoice = window.localStorage.getItem("hf_voice_enabled");
      const savedPortrait = window.localStorage.getItem("hf_lock_portrait");
      const savedStyle = window.localStorage.getItem(TERRAIN_STYLE_STORAGE_KEY) as TerrainVoiceStyle | null;
      if (savedVoice !== null) setVoiceEnabled(savedVoice === "true");
      if (savedPortrait !== null) setLockPortrait(savedPortrait === "true");
      if (savedStyle) setTerrainStyle(savedStyle);
    }

    syncSettings();
    setHydrated(true);

    window.addEventListener("hf-settings-updated", syncSettings);
    window.addEventListener("storage", syncSettings);

    return () => {
      window.removeEventListener("hf-settings-updated", syncSettings);
      window.removeEventListener("storage", syncSettings);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("hf_voice_enabled", String(voiceEnabled));
    window.localStorage.setItem("hf_lock_portrait", String(lockPortrait));
    window.localStorage.setItem(TERRAIN_STYLE_STORAGE_KEY, terrainStyle);
    window.dispatchEvent(new Event("hf-settings-updated"));
  }, [hydrated, voiceEnabled, lockPortrait, terrainStyle]);

  if (!hydrated) return null;

  return (
    <main className="min-h-screen bg-[#f6f7f2] dark:bg-slate-900 px-5 py-6 transition-colors">
      <div className="mx-auto max-w-xl mt-6">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            ← Back to map
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            ← Back to dashboard
          </Link>
        )}

        <h1 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Customize your Hillfinder experience.
        </p>

        <div className="mt-6 space-y-4">
          <SettingRow
            title="Theme"
            subtitle={isDark ? "Dark mode" : "Light mode"}
            on={isDark}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          />

          <SettingRow
            title="Voice Guidance"
            subtitle={voiceEnabled ? "Voice on" : "Voice off"}
            on={voiceEnabled}
            onClick={() => setVoiceEnabled((v) => !v)}
          />

          <SettingRow
            title="Orientation Lock"
            subtitle={lockPortrait ? "Portrait only" : "Allow rotation"}
            on={lockPortrait}
            onClick={() => setLockPortrait((v) => !v)}
          />

          <SegmentedRow
            title="Guidance Style"
            subtitle={
              terrainStyle === "calm"
                ? "Relaxed, steady cues"
                : terrainStyle === "energetic"
                  ? "Upbeat, encouraging cues"
                  : "Short, direct cues only"
            }
            options={[
              { value: "calm",      label: "Calm" },
              { value: "energetic", label: "Energetic" },
              { value: "minimal",   label: "Minimal" },
            ]}
            value={terrainStyle}
            onChange={(v) => setTerrainStyle(v as TerrainVoiceStyle)}
          />
        </div>
      </div>
    </main>
  );
}

function SegmentedRow({
  title,
  subtitle,
  options,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 p-4 shadow-sm transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>
        </div>

        <div className="flex flex-shrink-0 gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={value === opt.value}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                value === opt.value
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function SettingRow({
  title,
  subtitle,
  on,
  onClick,
}: {
  title: string;
  subtitle: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <section className="flex items-center justify-between rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 p-4 shadow-sm transition-colors">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        className={`relative h-6 w-12 rounded-full transition-all duration-200 ${
          on
            ? "bg-emerald-500 shadow-[0_1px_4px_rgba(16,185,129,0.45)]"
            : "bg-slate-200 dark:bg-slate-700 shadow-[inset_0_1px_3px_rgba(0,0,0,0.18)] dark:shadow-[inset_0_2px_5px_rgba(0,0,0,0.45)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full shadow-sm transition-all duration-200 ${
            on
              ? "left-6 bg-white"
              : "left-0.5 bg-white/90 dark:bg-slate-300"
          }`}
        />
      </button>
    </section>
  );
}
