"use client";

import { motion } from "framer-motion";
import { ReactNode, useEffect } from "react";

const PEEK_Y = 200; // 👈 adjust this number to show more/less sliver

export default function BottomSheet({
  open,
  onClose,
  children,
  className = "",
  maxWidthClass = "max-w-[520px]",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  maxWidthClass?: string;
}) {
  // close on Escape (only when open)
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center pointer-events-none">
      {/* Backdrop only when open */}
      {open && (
        <button
          aria-label="Close panel"
          className="absolute inset-0 bg-black/35 backdrop-blur-[2px] pointer-events-auto"
          onClick={onClose}
        />
      )}

      {/* Sheet stays mounted; moves between open and peek */}
      <motion.div
        role="dialog"
        aria-modal="true"
        className={[
          "relative z-10 w-full px-2 pb-2 pointer-events-auto",
          maxWidthClass,
          className,
        ].join(" ")}
        animate={{ y: open ? 0 : PEEK_Y }}
        transition={{ type: "spring", stiffness: 300, damping: 40, bounce: 0 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
