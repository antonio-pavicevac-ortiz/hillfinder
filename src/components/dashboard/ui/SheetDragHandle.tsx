"use client";

import type { PointerEventHandler } from "react";

export default function SheetDragHandle({ label, onClose, onPointerDown }: {
  label: string;
  onClose: () => void;
  onPointerDown: PointerEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClose}
      onPointerDown={onPointerDown}
      className="group absolute inset-x-0 top-0 flex h-12 w-full cursor-grab items-start justify-center pt-6 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
      style={{ touchAction: "none" }}
    >
      <span aria-hidden="true" className="h-1.5 w-12 shrink-0 rounded-full bg-gray-400/60 transition-colors duration-200 group-hover:bg-gray-600/70 group-active:bg-gray-600/70" />
    </button>
  );
}
