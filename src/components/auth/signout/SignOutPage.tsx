"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function SignOutPage() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl font-bold text-gray-800 mb-3">You’ve been signed out</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        Thanks for visiting Hillfinder — come back soon for your next great route 🗺️
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/auth/signin"
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md font-medium transition"
        >
          Sign back in
        </Link>
      </div>
    </motion.div>
  );
}
