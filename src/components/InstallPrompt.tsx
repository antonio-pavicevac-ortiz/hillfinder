"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "hf_install_dismissed";

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // User previously dismissed
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") dismiss();
    setPrompt(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setPrompt(null);
  }

  if (!prompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Hillfinder"
      className="
        fixed bottom-6 left-4 right-4 z-[9990]
        flex items-center gap-3
        rounded-2xl border border-white/10
        bg-slate-900/90 backdrop-blur-xl
        px-4 py-3 shadow-2xl
        animate-in slide-in-from-bottom-4 duration-300
      "
    >
      <img
        src="/icons/icon-192.png"
        alt=""
        aria-hidden="true"
        className="w-10 h-10 rounded-xl flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">
          Add Hillfinder to your home screen
        </p>
        <p className="text-xs text-slate-400 truncate">
          Find downhills without opening a browser
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="
            rounded-full bg-green-500 px-4 py-1.5
            text-xs font-semibold text-white
            hover:bg-green-400 active:scale-95 transition-all touch-manipulation
          "
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="p-1 text-slate-500 hover:text-slate-300 transition-colors touch-manipulation"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
