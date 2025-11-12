"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type AuthTemplateProps = { children: ReactNode };

export default function AuthTemplate({ children }: AuthTemplateProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.96 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="w-full max-w-lg sm:max-w-xl bg-white rounded-xl shadow-md p-8 sm:p-10"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
