"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// How the device is held. The CSS orientation media query compares the viewport's width and
// height instead, so it reads "landscape" whenever the on-screen keyboard shortens the page
function isDeviceLandscape() {
  const type = window.screen.orientation?.type;
  if (type) return type.startsWith("landscape");

  const legacyAngle = (window as Window & { orientation?: number }).orientation;
  if (typeof legacyAngle === "number") return Math.abs(legacyAngle) === 90;

  // Screen size, unlike the viewport, doesn't change when the keyboard opens
  return window.screen.width > window.screen.height;
}

// Touch-first phones/tablets need portrait guidance; desktop windows do not
const TOUCH_DEVICE_QUERY = "(pointer: coarse) and (hover: none)";

export default function PortraitOrientationOverlay({ enabled }: { enabled: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);

    const touch = window.matchMedia(TOUCH_DEVICE_QUERY);
    const update = () => setVisible(touch.matches && isDeviceLandscape());
    update();

    window.screen.orientation?.addEventListener("change", update);
    window.addEventListener("orientationchange", update);
    touch.addEventListener("change", update);

    return () => {
      window.screen.orientation?.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
      touch.removeEventListener("change", update);
    };
  }, []);

  if (!mounted || !enabled || !visible) return null;

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
