import InstallPrompt from "@/components/InstallPrompt";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "../globals.css";
import Providers from "./providers";

export const viewport: Viewport = {
  themeColor: "#22c55e",
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
          position="top-center"
          toastOptions={{
            className: "hf-toast hf-toast--drop",
          }}
          style={{ zIndex: 9999 }}
        />
      </body>
    </html>
  );
}
