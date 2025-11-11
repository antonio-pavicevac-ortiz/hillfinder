import { Toaster } from "sonner"; // 👈 import toast system
import "./globals.css";
import Providers from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {/* Enables toast notifications globally */}
          <Toaster richColors position="top-center" />
          <main className="min-h-screen bg-hillfinder-gradient">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
