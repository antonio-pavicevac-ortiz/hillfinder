"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // 🧭 1️⃣ While checking session — show loading animation
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-100 via-yellow-50 to-green-200">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-green-400 opacity-40 animate-ping" />
          <div className="absolute inset-0 rounded-full border-4 border-green-600 animate-spin border-t-transparent" />
        </div>
        <p className="text-gray-600 font-medium animate-pulse">Checking your session...</p>
      </div>
    );
  }

  // 🔒 2️⃣ Not logged in — prompt sign-in
  if (!session) {
    return (
      <motion.div
        className="min-h-screen flex flex-col items-center justify-center bg-hillfinder-gradient"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h1 className="text-lg text-gray-700 mb-4">You’re not logged in!</h1>
        <Link
          href="/auth/signin"
          className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm transition-colors duration-200"
        >
          Sign In
        </Link>
      </motion.div>
    );
  }

  // ✅ 3️⃣ Logged in — render protected content
  return <>{children}</>;
}
