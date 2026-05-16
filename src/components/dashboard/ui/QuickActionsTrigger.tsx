"use client";

interface Props {
  onOpen: () => void;
}

export default function QuickActionsTrigger({ onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="
        touch-manipulation
        px-6 py-2
        bg-white/90 dark:bg-slate-900/90
        rounded-full
        border border-white/60 dark:border-slate-700/60
        shadow-md
        text-gray-700 dark:text-slate-200
        font-medium
        transition-colors
      "
    >
      ↑ Quick Actions
    </button>
  );
}
