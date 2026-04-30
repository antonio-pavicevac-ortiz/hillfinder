"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("light");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lockPortrait, setLockPortrait] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    function syncSettings() {
      const savedVoice = window.localStorage.getItem("hf_voice_enabled");
      const savedPortrait = window.localStorage.getItem("hf_lock_portrait");

      if (savedVoice) setVoiceEnabled(savedVoice === "true");
      if (savedPortrait) setLockPortrait(savedPortrait === "true");
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
    const savedTheme = window.localStorage.getItem("hf_theme");
    const savedVoice = window.localStorage.getItem("hf_voice_enabled");
    const savedPortrait = window.localStorage.getItem("hf_lock_portrait");

    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    if (savedVoice) setVoiceEnabled(savedVoice === "true");
    if (savedPortrait) setLockPortrait(savedPortrait === "true");

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    window.localStorage.setItem("hf_theme", theme);
    window.localStorage.setItem("hf_voice_enabled", String(voiceEnabled));
    window.localStorage.setItem("hf_lock_portrait", String(lockPortrait));

    window.dispatchEvent(new Event("hf-settings-updated"));
  }, [hydrated, theme, voiceEnabled, lockPortrait]);

  if (!hydrated) return null;

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-5 py-6">
      <div className="mx-auto max-w-xl mt-20">
        <Link href="/dashboard" className="text-sm text-emerald-700">
          ← Back to dashboard
        </Link>

        <h1 className="mt-5 text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Customize your Hillfinder experience.</p>

        <div className="mt-6 space-y-4">
          <SettingRow
            title="Theme"
            subtitle={theme === "dark" ? "Dark mode" : "Light mode"}
            on={theme === "dark"}
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
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
        </div>
      </div>
    </main>
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
    <section className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onClick}
        className={`relative h-6 w-12 rounded-full transition ${
          on ? "bg-emerald-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            on ? "left-6" : "left-0.5"
          }`}
        />
      </button>
    </section>
  );
}
