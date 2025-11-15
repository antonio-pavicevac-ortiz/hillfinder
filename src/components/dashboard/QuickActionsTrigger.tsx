"use client";

interface Props {
  onOpen: () => void;
}

export default function QuickActionsTrigger({ onOpen }: Props) {
  return (
    <button
      onClick={onOpen}
      className="
        px-6 py-2
        bg-white/90
        rounded-full
        border border-white/60
        shadow-md
        text-gray-700
        font-medium
      "
    >
      ↑ Quick Actions
    </button>
  );
}
