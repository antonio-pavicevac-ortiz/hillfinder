"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Google sign-in redirects back to Settings with ?google=<result>
const LINK_RESULT_MESSAGES: Record<string, string> = {
  GoogleAccountInUse: "That Google account is already used by another Hillfinder account.",
  GoogleAlreadyConnected: "A different Google account is already connected.",
  GoogleLinkExpired: "Connecting Google timed out. Please try again.",
  GoogleLinkFailed: "Couldn't connect Google. Please try again.",
};

type Status = { googleConnected: boolean; hasPassword: boolean };

export default function GoogleConnectionSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const res = await fetch("/api/user/me");
      const data = res.ok ? await res.json() : null;
      if (data?.user) {
        setStatus({
          googleConnected: Boolean(data.user.googleConnected),
          hasPassword: Boolean(data.user.hasPassword),
        });
      }
    } catch {
      // Leave the section in its loading state; nothing to act on offline
    }
  }

  useEffect(() => {
    loadStatus();

    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (!result) return;
    if (result === "connected") toast.success("Google connected.");
    else setError(LINK_RESULT_MESSAGES[result] ?? LINK_RESULT_MESSAGES.GoogleLinkFailed);

    params.delete("google");
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
  }, []);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/google", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || LINK_RESULT_MESSAGES.GoogleLinkFailed);
        setBusy(false);
        return;
      }
      await signIn("google", { callbackUrl: "/dashboard/settings?google=connected" });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/google", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't disconnect Google. Please try again.");
      } else {
        toast.success("Google disconnected.");
        await loadStatus();
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  const buttonClass =
    "shrink-0 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition";

  return (
    <section className="rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 p-4 shadow-sm transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Google</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {!status
              ? "Checking…"
              : status.googleConnected
                ? status.hasPassword
                  ? "Connected — sign in with Google or your password"
                  : "Connected — you sign in with Google"
                : "Connect to sign in with Google as well"}
          </p>
        </div>

        {status && !status.googleConnected && (
          <button type="button" onClick={connect} disabled={busy} className={buttonClass}>
            {busy ? "Connecting…" : "Connect"}
          </button>
        )}
        {status?.googleConnected && status.hasPassword && (
          <button type="button" onClick={disconnect} disabled={busy} className={buttonClass}>
            {busy ? "Disconnecting…" : "Disconnect"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
