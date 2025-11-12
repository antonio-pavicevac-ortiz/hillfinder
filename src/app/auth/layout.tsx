import AuthNavbar from "@/components/auth/AuthNavbar";
import type { ReactNode } from "react";

type AuthLayoutProps = { children: ReactNode };

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col hillfinder-gradient">
      <AuthNavbar />
      <main className="flex-1 flex items-center justify-center px-4">{children}</main>
    </div>
  );
}
