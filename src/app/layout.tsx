import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css"; // 👈 must exist and be here (top-level)
import NavBar from "@/components/navbar/NavBar"; // ✅ add this import

export const metadata: Metadata = { title: "Hillfinder" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* ✅ Everything below now has access to the NextAuth session */}
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
