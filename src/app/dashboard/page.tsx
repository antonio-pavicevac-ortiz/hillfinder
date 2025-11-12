"use client";

import DashboardPage from "@/components/dashboard/DashboardPage";
import { motion } from "framer-motion";

export default function DashboardRoute() {
  return (
    <motion.div
      className="min-h-screen flex flex-col bg-hillfinder-gradient"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <DashboardPage />
    </motion.div>
  );
}
