"use client";

import SettingsPage from "@/components/dashboard/settings/SettingsPage";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#f6f7f2] dark:bg-slate-900">
      <SettingsPage onBack={onClose} />
    </div>
  );
}
