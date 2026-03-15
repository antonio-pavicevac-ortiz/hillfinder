import { Toaster } from "sonner";
import "./globals.css";
import Providers from "./providers";

export const metadata = {
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen overflow-x-hidden">
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
