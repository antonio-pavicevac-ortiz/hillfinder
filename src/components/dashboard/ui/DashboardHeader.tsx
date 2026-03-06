"use client";

import { DashboardUser } from "@/types/user";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type DashboardHeaderProps = {
  user?: DashboardUser;
};

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ✅ Close menu when tapping/clicking outside (works on mobile too)
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (menuRef.current && !menuRef.current.contains(t)) setMenuOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const initials =
    user?.name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase() ?? "U";

  return (
    // ✅ Entire header is "tap-through" to the map by default
    <div className="relative h-[64px] w-full">
      {/* ✅ Content row is also non-interactive by default */}
      <div className="relative z-10 h-full px-6 flex items-center justify-between pointer-events-none">
        <h1 className="text-lg font-semibold text-gray-900 select-none">
          Welcome back, {user?.name ?? "Explorer"} 👋
        </h1>

        {/* ✅ Only this area can receive taps */}
        <div className="relative pointer-events-auto" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            // ✅ tap-only behavior; avoids weird gesture feeling
            className="touch-manipulation w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-gray-700 font-semibold shadow-sm hover:shadow-md transition shadow-black/10"
          >
            {user?.image ? (
              // (Optional) next/image later, but fine for now
              <img src={user.image} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">{initials}</span>
            )}
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg border border-gray-100 py-2 z-50"
              // ✅ don't let taps inside bubble to the map
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                {user?.email}
              </div>

              <a
                href="/dashboard"
                className="touch-manipulation block px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                Dashboard
              </a>

              <a
                href="/dashboard/profile"
                className="touch-manipulation block px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                Profile
              </a>

              <button
                type="button"
                className="touch-manipulation w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                Settings
              </button>

              <a
                href="/dashboard/saved"
                className="touch-manipulation block px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                Saved Routes
              </a>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ callbackUrl: "/auth/signout" });
                }}
                className="touch-manipulation w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
