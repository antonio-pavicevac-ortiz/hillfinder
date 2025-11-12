"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

const menuItems = [
  { label: "Profile", href: "/dashboard/profile" },
  { label: "Settings", href: "/dashboard/settings" },
  { label: "Sign out", action: "signout" },
];

export default function DashboardMenu() {
  return (
    <ul className="py-1 text-sm text-gray-700">
      {menuItems.map((item) => (
        <li key={item.label}>
          {item.href ? (
            <Link
              href={item.href}
              className="block px-4 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <button
              onClick={() => {
                if (item.action === "signout") signOut({ callbackUrl: "/auth/signout" });
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              {item.label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
