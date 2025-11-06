"use client";

import { useSession, signOut } from "next-auth/react";
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
        <p className="text-gray-600 font-medium animate-pulse">
          Checking your session...
        </p>
      </div>
    );
  }

  // 🧩 2️⃣ If not logged in
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-hillfinder-gradient">
        <h1 className="text-lg text-gray-700 mb-4">You’re not logged in!</h1>
        <Link href="/auth/signin" className="btn btn-primary mt-4">
          Sign in
        </Link>
      </div>
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-hillfinder-gradient">
      <h1 className="text-3xl font-bold mb-2">Welcome, {session.user?.name}</h1>
      <p className="text-gray-700 mb-8">
        You’re now signed in with {session.user?.email}.
      </p>

      <button
        onClick={handleAddRoute}
        className={`btn btn-green mb-4 ${
          loading ? "opacity-60 cursor-not-allowed" : ""
        }`}
        disabled={loading}
      >
        {loading ? "Saving..." : "Add Test Route"}
      </button>

      {response && (
        <pre className="bg-white/70 p-4 rounded text-sm max-w-md overflow-auto shadow">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="btn btn-green mt-6"
      >
        Sign out
      </button>
    </div>
  );
}
