import daisyui from "daisyui";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite linear",
      },
      backgroundImage: {
        "hillfinder-gradient": "linear-gradient(to bottom, #E1F5C4, #EDE574)",
        "navbar-gradient": "linear-gradient(to bottom, white,#E1F5C4)",
      },
      colors: {
        brandGreen: {
          DEFAULT: "#16a34a", // Tailwind’s emerald-600 (rich, natural green)
          light: "#4ade80", // emerald-400
          dark: "#166534", // emerald-800
        },
      },
    },
  },
  plugins: [daisyui],
  // daisyui: { themes: ["light","dark"] }, // optional
};

export default config;
