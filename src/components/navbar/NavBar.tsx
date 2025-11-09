"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname(); // ← get current route
  const isSigninPage = pathname === "/auth/signin";
  const isSignupPage = pathname === "/auth/signup";

  return (
    <nav className="bg-navbar-gradient border-b border-green-100 shadow-[0_2px_8px_rgba(0,0,0,0.3)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Left: Brand */}
        <Link
          href="/"
          className="text-2xl font-bold text-gray-800 hover:text-gray-700 transition"
        >
          Hillfinder
        </Link>

        {/* Right: Conditional */}
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <p className="text-sm text-gray-600">
                Welcome, {session.user?.name?.split(" ")[0] || "Climber"}
              </p>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100 transition"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              {/* 👇 Only show if not already on those pages */}
              {!isSigninPage && (
                <Link href="/auth/signin" className="px-4 py-2 btn-green">
                  Login
                </Link>
              )}
              {!isSignupPage && (
                <Link href="/auth/signup" className="px-4 py-2 btn-green">
                  Sign Up
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
