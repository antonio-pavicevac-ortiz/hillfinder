"use client";

import { User } from "lucide-react";
import { useState } from "react";

export default function DashboardHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/50 border-b border-black/10 px-4 py-3 flex items-center justify-between z-30">
      {/* Greeting */}
      <h1 className="text-lg font-semibold text-gray-900">Welcome back, Antonio 👋</h1>

      {/* Profile Menu Button */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-white"
        >
          <User size={18} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-lg border border-gray-100 py-2 z-50">
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700">
              Profile
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700">
              Settings
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
