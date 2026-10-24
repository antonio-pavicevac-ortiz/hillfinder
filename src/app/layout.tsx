import InstallPrompt from "@/components/InstallPrompt";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import { Analytics } from "@vercel/analytics/next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "../globals.css";
import Providers from "./providers";

// Toasts rise from the bottom, clear of the dashboard's bottom bar and home indicator, so
// they don't cover the route card at the top
const TOAST_OFFSET = { bottom: "calc(env(safe-area-inset-bottom) + 72px)" };

export const viewport: Viewport = {
  themeColor: "#22c55e",
  // Draw under the iPhone status bar and home indicator; pages whose content starts at the
  // top pad themselves with env(safe-area-inset-top) so nothing ends up behind it
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
          <main className="min-h-screen bg-hillfinder-gradient">{children}</main>
        </Providers>

        <Toaster
          position="bottom-center"
          offset={TOAST_OFFSET}
          mobileOffset={TOAST_OFFSET}
          toastOptions={{
            className: "hf-toast hf-toast--rise hf-toast-centered",
          }}
          style={{ zIndex: 9999 }}
        />
        <Analytics />
      </body>
    </html>
  );
}
