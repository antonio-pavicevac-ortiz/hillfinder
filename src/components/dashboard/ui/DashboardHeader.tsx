"use client";

import { DashboardUser } from "@/types/user";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type DashboardHeaderProps = {
  user?: DashboardUser;
};

type UserMenuProps = {
  user?: DashboardUser;
};

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    // ✅ Entire header is "tap-through" to the map by default
    <div className="relative h-[64px] w-full">
      {/* ✅ Content row is also non-interactive by default */}
      <div className="relative z-10 h-full px-6 flex items-center justify-between pointer-events-none">
        <h1 className="text-lg font-semibold text-[var(--hf-text,#111827)] select-none">
          Welcome back, {user?.name ?? "Explorer"} 👋
        </h1>

        <UserMenu user={user} />
      </div>
    </div>
  );
}

function UserMenu({ user }: UserMenuProps) {
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
    // ✅ Only this area can receive taps
    <div className="relative pointer-events-auto" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        // ✅ tap-only behavior; avoids weird gesture feeling
        className="touch-manipulation w-9 h-9 rounded-full overflow-hidden bg-[var(--hf-card,#e5e7eb)] flex items-center justify-center text-[var(--hf-text,#374151)] font-semibold shadow-sm hover:shadow-md transition shadow-black/10 border border-[var(--hf-border,rgba(17,24,39,0.12))]"
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
          className="absolute right-0 mt-2 w-48 rounded-lg border border-[var(--hf-border,rgba(17,24,39,0.12))] bg-[var(--hf-card,#ffffff)] py-2 shadow-lg z-50"
          // ✅ don't let taps inside bubble to the map
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="px-4 py-2 text-sm text-[var(--hf-muted,#4b5563)] border-b border-[var(--hf-border,rgba(17,24,39,0.12))]">
            {user?.email}
          </div>

          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="touch-manipulation block px-4 py-2 text-[var(--hf-text,#374151)] hover:bg-[var(--hf-hover,rgba(17,24,39,0.06))]"
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/profile"
            onClick={() => setMenuOpen(false)}
            className="touch-manipulation block px-4 py-2 text-[var(--hf-text,#374151)] hover:bg-[var(--hf-hover,rgba(17,24,39,0.06))]"
          >
            Profile
          </Link>

          <Link
            href="/dashboard/settings"
            onClick={() => setMenuOpen(false)}
            className="touch-manipulation block px-4 py-2 text-[var(--hf-text,#374151)] hover:bg-[var(--hf-hover,rgba(17,24,39,0.06))]"
          >
            Settings
          </Link>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="touch-manipulation w-full text-left px-4 py-2 text-red-600 hover:bg-[var(--hf-hover,rgba(17,24,39,0.06))] dark:text-red-400"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
