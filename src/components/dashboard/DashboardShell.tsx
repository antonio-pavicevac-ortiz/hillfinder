"use client";

import { useEffect, useState } from "react";

import Dashboard from "@/components/dashboard/Dashboard";
import type { DashboardUser } from "@/types/user";

type DashboardShellProps = {
  user?: DashboardUser;
};

export default function DashboardShell({ user }: DashboardShellProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    function syncVoiceSetting() {
      const savedVoice = window.localStorage.getItem("hf_voice_enabled");
      setVoiceEnabled(savedVoice === "true");
    }

    syncVoiceSetting();

    window.addEventListener("hf-settings-updated", syncVoiceSetting);
    window.addEventListener("storage", syncVoiceSetting);

    return () => {
      window.removeEventListener("hf-settings-updated", syncVoiceSetting);
      window.removeEventListener("storage", syncVoiceSetting);
    };
  }, []);

  function updateVoiceEnabled(next: boolean) {
    setVoiceEnabled(next);
    window.localStorage.setItem("hf_voice_enabled", String(next));
    window.dispatchEvent(new Event("hf-settings-updated"));
  }

  return <Dashboard user={user} voiceEnabled={voiceEnabled} setVoiceEnabled={updateVoiceEnabled} />;
}
