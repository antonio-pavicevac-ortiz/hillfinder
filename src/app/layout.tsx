import InstallPrompt from "@/components/InstallPrompt";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import { Analytics } from "@vercel/analytics/next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "../globals.css";
import Providers from "./providers";

export const viewport: Viewport = {
  themeColor: "#22c55e",
  // Draw under the iPhone status bar and home indicator; pages pad themselves with the
  // safe-area insets so nothing ends up behind them
  viewportFit: "cover",
};

export const metadata = {
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Hillfinder",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen overflow-x-hidden">
        <RegisterServiceWorker />
        <InstallPrompt />
        <Providers>
          <main className="min-h-screen bg-hillfinder-gradient pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">{children}</main>
        </Providers>

        <Toaster
          position="top-center"
          toastOptions={{
            className: "hf-toast hf-toast--drop hf-toast-centered",
          }}
          style={{ zIndex: 9999 }}
        />
        <Analytics />
      </body>
    </html>
  );
}
