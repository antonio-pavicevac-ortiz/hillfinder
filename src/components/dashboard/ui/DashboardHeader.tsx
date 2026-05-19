"use client";

import { DashboardUser } from "@/types/user";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type DashboardHeaderProps = {
  user?: DashboardUser;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
};

type UserMenuProps = {
  user?: DashboardUser;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
};

export default function DashboardHeader({ user, onOpenSettings, onOpenProfile }: DashboardHeaderProps) {
  const { data: session } = useSession();
  const resolvedUser = user ?? session?.user;

  return (
    <div className="relative h-[64px] w-full">
      <div className="relative z-10 h-full px-6 flex items-center justify-between pointer-events-none">
        <h1 className="text-lg font-semibold text-[var(--hf-text,#111827)] select-none">
          Welcome back, {resolvedUser?.name ?? "Explorer"} 👋
        </h1>

        <UserMenu user={resolvedUser} onOpenSettings={onOpenSettings} onOpenProfile={onOpenProfile} />
      </div>
    </div>
  );
}

function UserMenu({ user, onOpenSettings, onOpenProfile }: UserMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    <div className="relative pointer-events-auto" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="touch-manipulation w-9 h-9 rounded-full overflow-hidden bg-[var(--hf-card,#e5e7eb)] flex items-center justify-center text-[var(--hf-text,#374151)] font-semibold shadow-sm hover:shadow-md transition shadow-black/10 border border-[var(--hf-border,rgba(17,24,39,0.12))]"
      >
        {user?.image && !imgError ? (
          <img
            src={user.image}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-sm">{initials}</span>
        )}
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg border border-[var(--hf-border,rgba(17,24,39,0.12))] bg-[var(--hf-card,#ffffff)] py-2 shadow-lg z-50"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
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

          {onOpenProfile ? (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenProfile();
              }}
              className="touch-manipulation w-full text-left px-4 py-2 text-[var(--hf-text,#374151)] hover:bg-[var(--hf-hover,rgba(17,24,39,0.06))]"
            >
              Profile
            </button>
          ) : (
            <Link
              href="/dashboard/profile"
              onClick={() => setMenuOpen(false)}
              className="touch-manipulation block px-4 py-2 text-[var(--hf-text,#374151)] hover:bg-[var(--hf-hover,rgba(17,24,39,0.06))]"
            >
              Profile
            </Link>
          )}

          {onOpenSettings ? (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenSettings();
              }}
              className="touch-manipulation w-full text-left px-4 py-2 text-[var(--hf-text,#374151)] hover:bg-[var(--hf-hover,rgba(17,24,39,0.06))]"
            >
              Settings
            </button>
          ) : (
            <Link
              href="/dashboard/settings"
              onClick={() => setMenuOpen(false)}
              className="touch-manipulation block px-4 py-2 text-[var(--hf-text,#374151)] hover:bg-[var(--hf-hover,rgba(17,24,39,0.06))]"
            >
              Settings
            </Link>
          )}

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
