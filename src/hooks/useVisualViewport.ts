"use client";

import { useEffect, useState } from "react";

export type VisualViewportBox = {
  top: number;
  height: number;
  keyboardOpen: boolean;
};

// The on-screen keyboard covers the page without resizing it (iOS) and the browser may scroll
// to keep a field in view. The visual viewport is the part still showing, so a sheet placed in
// it sits right above the keyboard
const KEYBOARD_MIN_HEIGHT = 120;

export function useVisualViewport(active: boolean) {
  const [box, setBox] = useState<VisualViewportBox | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) {
      setBox(null);
      return;
    }

    const update = () => {
      setBox({
        top: vv.offsetTop,
        height: vv.height,
        keyboardOpen: window.innerHeight - vv.height > KEYBOARD_MIN_HEIGHT,
      });
    };
    update();

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);

  return box;
}
