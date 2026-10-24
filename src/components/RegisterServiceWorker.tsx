"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    // The iPhone app's web view doesn't allow service workers for hillfinder.io, and the app
    // has its own offline page
    if (Capacitor.isNativePlatform()) return;

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return null;
}
