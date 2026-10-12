"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function PortraitOrientationOverlay({ enabled }: { enabled: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !enabled) return null;

  // Share the page-root stacking context with sheets and loading overlays.
  return createPortal(
    <div className="hf-orientation-overlay" role="status" aria-live="polite">
      <p className="text-white text-lg font-semibold">
        Rotate your device for the best experience 📱
      </p>
    </div>,
    document.body,
  );
}
