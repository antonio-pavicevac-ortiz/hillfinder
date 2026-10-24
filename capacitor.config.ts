import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.hillfinder",
  appName: "Hillfinder",
  webDir: "capacitor-www",
  server: {
    // Set CAP_SERVER_URL to a dev server (e.g. the ngrok URL from `npm run dev:ngrok`) to try
    // site changes in the app before they deploy; sync again without it to go back
    url: process.env.CAP_SERVER_URL || "https://hillfinder.io",
    errorPath: "index.html",
  },
  ios: {
    backgroundColor: "#020617",
  },
};

export default config;
