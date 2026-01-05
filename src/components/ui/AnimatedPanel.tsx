"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedPanelProps {
  children: ReactNode;
  visible?: boolean;
  className?: string;
  delay?: number;
}

export default function AnimatedPanel({
  children,
  visible = true,
  className = "",
  delay = 0,
}: AnimatedPanelProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{
            duration: 0.25,
            ease: "easeOut",
            delay,
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
