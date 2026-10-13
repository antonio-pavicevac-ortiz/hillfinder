"use client";

import { signOut } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const CONFIRMATION = "DELETE";

const inputClass =
  "w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors";

// Remove Hillfinder's on-device settings and route cache so nothing lingers after deletion
function clearLocalHillfinderData() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("hf_") || key.startsWith("hf-"))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // localStorage unavailable — nothing to clear
  }
}

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setHasPassword(Boolean(data?.user?.hasPassword)))
      .catch(() => setHasPassword(false));
  }, [open]);

  function cancel() {
    setOpen(false);
    setPassword("");
    setConfirmation("");
    setError(null);
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (deleting) return;
    setError(null);
    setDeleting(true);

    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Account deletion didn’t finish; please retry.");
        setDeleting(false);
        return;
      }

      clearLocalHillfinderData();
      toast.success("Your account has been deleted.");
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Couldn't delete your account. Check your connection and try again.");
      setDeleting(false);
    }
  }

  const canSubmit = confirmation === CONFIRMATION && (!hasPassword || password) && !deleting;

  return (
    <section className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-white/80 dark:bg-slate-800/80 p-4 shadow-sm transition-colors">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Delete account</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
        Permanently delete your account, saved routes, and profile photo. This can&apos;t be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-lg border border-red-300 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
        >
          Delete account…
        </button>
      ) : (
        <form onSubmit={deleteAccount} className="mt-4 space-y-3">
          {hasPassword && (
            <div>
              <label
                htmlFor="delete-password"
                className="text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Password
              </label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="delete-confirmation"
              className="text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              Type <strong>{CONFIRMATION}</strong> to confirm
            </label>
            <input
              id="delete-confirmation"
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {deleting ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={deleting}
              className="rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
