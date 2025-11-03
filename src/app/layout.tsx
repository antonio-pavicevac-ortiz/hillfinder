import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css"; // 👈 must exist and be here (top-level)

export const metadata: Metadata = { title: "Hillfinder" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
