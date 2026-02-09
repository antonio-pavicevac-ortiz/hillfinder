// src/components/dashboard/MapControls.tsx
"use client";

import type { ReactNode } from "react";

export default function MapControls({ children }: { children: ReactNode }) {
  return (
    <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+5.25rem)] z-[55] flex flex-col gap-2 pointer-events-auto">
      {children}
    </div>
  );
}
