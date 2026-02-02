"use client";

import { motion, type PanInfo, useAnimationControls } from "framer-motion";
import { ReactNode, useEffect } from "react";

const PEEK_Y = 400;
const OPEN_THRESHOLD_PX = 60;
const CLOSE_THRESHOLD_PX = 80;

export default function BottomSheet({
  open,
  onOpen,
  onClose,
  children,
  className = "",
  maxWidthClass = "max-w-[520px]",
}: {
  open: boolean;
  onOpen?: () => void;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  maxWidthClass?: string;
}) {
  const controls = useAnimationControls();

  useEffect(() => {
    controls.start({ y: open ? 0 : PEEK_Y });
  }, [open, controls]);

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const offsetY = info.offset.y;

    if (!open && onOpen && offsetY < -OPEN_THRESHOLD_PX) {
      onOpen();
      return;
    }

    if (open && offsetY > CLOSE_THRESHOLD_PX) {
      onClose();
      return;
    }

    controls.start({ y: open ? 0 : PEEK_Y });
  }

  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center pointer-events-none">
      {open && (
        <button
          aria-label="Close panel"
          className="absolute inset-0 bg-black/35 backdrop-blur-[2px] pointer-events-auto"
          onClick={onClose}
        />
      )}

      <motion.div
        className={[
          "relative z-10 w-full px-2 pb-2 pointer-events-auto",
          maxWidthClass,
          className,
        ].join(" ")}
        animate={controls}
        initial={{ y: open ? 0 : PEEK_Y }}
        transition={{ type: "spring", stiffness: 300, damping: 40 }}
        drag="y"
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: PEEK_Y }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
      >
        {/* Drag handle */}
        {children}
      </motion.div>
    </div>
  );
}
