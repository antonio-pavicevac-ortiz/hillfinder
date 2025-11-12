"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AuthNavbar() {
  const pathname = usePathname();

  const links = [
    { href: "/auth/signin", label: "Login" },
    { href: "/auth/signup", label: "Sign Up" },
  ];

  return (
    <header className="w-full py-4 bg-transparent">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 sm:px-10">
        {/* Logo or brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
            N
          </div>
          <span className="text-lg font-semibold text-gray-800">Hillfinder</span>
        </Link>

        {/* Auth navigation toggle */}
        <nav className="flex items-center gap-3">
          {links.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-all duration-200 ${
                  isActive
                    ? "bg-green-600 border-green-600 text-white shadow-sm"
                    : "bg-white border-green-600 text-green-700 hover:bg-green-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
