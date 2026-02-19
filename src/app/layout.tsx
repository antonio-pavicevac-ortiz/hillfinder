import { Toaster } from "sonner";
import "./globals.css";
import Providers from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen overflow-x-hidden">
        {/* ✅ Put Toaster at body level so fixed positioning is truly viewport-based */}

        <Providers>
          <main className="min-h-screen bg-hillfinder-gradient">{children}</main>
          <Toaster
            position="top-center"
            toastOptions={{
              className: "hf-toast hf-toast--drop",
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
