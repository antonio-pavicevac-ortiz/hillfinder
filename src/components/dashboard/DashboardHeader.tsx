"use client";

import { ReactNode, useState } from "react";
import DashboardMenu from "./DashboardMenu";

interface DashboardHeaderProps {
  children?: ReactNode;
}

export default function DashboardHeader({ children }: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-1 bg-white/60 backdrop-blur-md shadow-sm border-b border-green-100">
      {/* Left side: App title or greeting */}
      <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        Welcome back, Antonio 👋
      </h1>

      {/* Right side: Avatar / user menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-green-100 hover:bg-green-200 transition"
        >
          {children}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-lg shadow-md">
            <DashboardMenu />
          </div>
        )}
      </div>
    </header>
  );
}
