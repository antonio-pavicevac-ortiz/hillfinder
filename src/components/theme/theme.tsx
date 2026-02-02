"use client";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <div className="join">
      <button className="btn join-item" onClick={() => setTheme("light")}>
        Light
      </button>
      <button className="btn join-item" onClick={() => setTheme("dark")}>
        Dark
      </button>
      <button className="btn join-item" onClick={() => setTheme("cupcake")}>
        Cupcake
      </button>
    </div>
  );
}
