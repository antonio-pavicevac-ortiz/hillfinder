"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export default function MapControlTooltip({
  label,
  children,
}: {
  label: string;
  children: (descriptionId: string) => ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const touch = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  function cancelTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", dismiss);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  return (
    <div
      className="relative pointer-events-auto touch-none select-none"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={() => {
        cancelTimer();
        setOpen(false);
      }}
      onFocusCapture={() => {
        if (!touch.current) setOpen(true);
      }}
      onBlurCapture={() => setOpen(false)}
      onPointerDownCapture={(event) => {
        event.stopPropagation();
        cancelTimer();
        held.current = false;
        touch.current = event.pointerType !== "mouse";
        if (!touch.current) return;
        setOpen(false);
        start.current = { x: event.clientX, y: event.clientY };
        timer.current = setTimeout(() => {
          held.current = true;
          setOpen(true);
        }, 500);
      }}
      onPointerMoveCapture={(event) => {
        if (!touch.current || !start.current) return;
        if (
          Math.hypot(
            event.clientX - start.current.x,
            event.clientY - start.current.y,
          ) > 10
        ) {
          cancelTimer();
          setOpen(false);
        }
      }}
      onPointerUpCapture={() => {
        cancelTimer();
        start.current = null;
        if (touch.current) setOpen(false);
      }}
      onPointerCancelCapture={() => {
        cancelTimer();
        start.current = null;
        setOpen(false);
      }}
      onClickCapture={(event) => {
        if (held.current) {
          event.preventDefault();
          event.stopPropagation();
          held.current = false;
        }
        setOpen(false);
        touch.current = false;
      }}
      onTouchStartCapture={(event) => event.stopPropagation()}
      onMouseDownCapture={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children(id)}
      <span
        id={id}
        role="tooltip"
        className={[
          "absolute right-full top-1/2 z-[100] -translate-y-1/2 pr-2.5",
          "w-max max-w-[calc(100vw-72px)] text-xs font-medium text-white",
          open ? "visible" : "invisible",
        ].join(" ")}
      >
        <span className="relative block rounded-xl bg-slate-900/95 px-3 py-2 shadow-lg">
          {label}
          <span
            aria-hidden="true"
            className="absolute left-full top-1/2 -translate-y-1/2 border-y-[5px] border-l-[6px] border-y-transparent border-l-slate-900/95"
          />
        </span>
      </span>
    </div>
  );
}
