"use client";

import { DashboardUser } from "@/types/user";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type DashboardHeaderProps = {
  user: DashboardUser;
};

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get avatar fallback initials
  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase() ?? "U";

  return (
    <header className="w-full h-[64px] flex items-center justify-between px-6  border--b">
      <h1 className="text-lg font-semibold text-gray-900">
        Welcome back, {user?.name ?? "Explorer"} 👋
      </h1>

      {/* Avatar + Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-gray-700 font-semibold shadow-sm hover:shadow-md transition shadow-black/10"
        >
          {user?.image ? (
            <img src={user.image} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm">{initials}</span>
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg border border-gray-100 py-2 animate-fadeIn z-50">
            <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
              {user?.email}
            </div>

            <a href="/dashboard" className="block px-4 py-2 hover:bg-gray-100 text-gray-700">
              Dashboard
            </a>

            <a
              href="/dashboard/profile"
              className="block px-4 py-2 hover:bg-gray-100 text-gray-700"
            >
              Profile
            </a>

            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700">
              Settings
            </button>

            <a href="/dashboard/saved" className="block px-4 py-2 hover:bg-gray-100 text-gray-700">
              Saved Routes
            </a>

            <button
              onClick={() => signOut()}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
