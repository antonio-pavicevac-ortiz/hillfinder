"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
// TypeScript interface for route responses
interface RouteResponse {
  _id?: string;
  name?: string;
  start?: { lat: number; lng: number };
  end?: { lat: number; lng: number };
  elevationGain?: number;
  elevationLoss?: number;
  userId?: string;
  message?: string;
  error?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RouteResponse | null>(null); // ✅ declare response state

  // 🧭 1️⃣ While loading — glowing compass animation
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

  // 🧩 2️⃣ If not logged in
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

  // 🧩 3️⃣ Logged in
  const handleAddRoute = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Central Park Slope Ride",
          start: { lat: 40.785091, lng: -73.968285 },
          end: { lat: 40.774987, lng: -73.963154 },
          elevationGain: 12,
          elevationLoss: 48,
        }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({ message: "Error creating route", error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  // 🧩 3️⃣ Logged in
  return (
    <motion.div
      className="min-h-screen flex flex-col bg-hillfinder-gradient"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Navbar / Header */}
      <DashboardHeader>
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-600 text-white font-semibold">
          {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
        </div>
      </DashboardHeader>
      {/* Content section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <button
          onClick={handleAddRoute}
          className={`btn btn-green mb-4 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
          disabled={loading}
        >
          {loading ? (
            <span className="animate-pulse text-green-700 font-medium">
              🧭 Calculating route details...
            </span>
          ) : (
            "➕ Add Test Route"
          )}
        </button>

        {response && (
          <pre className="bg-white/70 p-4 rounded text-sm max-w-md overflow-auto shadow">
            {JSON.stringify(response, null, 2)}
          </pre>
        )}
      </main>
    </motion.div>
  );
}
