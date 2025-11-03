import type { Config } from "tailwindcss";
import daisyui from "daisyui";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "hillfinder-gradient": "linear-gradient(to bottom, #E1F5C4, #EDE574)",
        "navbar-gradient": "linear-gradient(to bottom, white,#f9f6d0)",
      },
    },
  },
  plugins: [daisyui],
  // daisyui: { themes: ["light","dark"] }, // optional
};

export default config;
