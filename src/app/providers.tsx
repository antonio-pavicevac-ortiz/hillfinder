// src/app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="data-theme" // DaisyUI looks for data-theme
        defaultTheme="light" // or "system" if you prefer
        enableSystem // allow OS-level preference
        // Next 15 avoids script ordering issues; ThemeProvider is safe here
        // If you ever see a script-order warning again, add: scriptProps={{ async: true }}
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
