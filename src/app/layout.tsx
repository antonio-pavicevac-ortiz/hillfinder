import NavBar from "@/components/navbar/NavBar";
import "./globals.css";
import Providers from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <NavBar />
          <main className="min-h-screen bg-hillfinder-gradient">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
