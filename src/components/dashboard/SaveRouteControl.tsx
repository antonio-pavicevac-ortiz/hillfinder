"use client";

import type { SaveRoutePayload } from "@/types/saved-route";
import { Bookmark, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function SaveRouteControl({
  route,
  onSaved,
  compact = false,
}: {
  route: SaveRoutePayload | null;
  onSaved?: () => void;
  compact?: boolean;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [route]);

  async function handleSave() {
    if (!route || isSaving || saved) return;

    try {
      setIsSaving(true);

      const res = await fetch("/api/routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(route),
      });

      if (!res.ok) {
        throw new Error("Failed to save route");
      }

      setSaved(true);
      onSaved?.();
    } catch (err) {
      console.error("[SaveRouteControl]", err);
    } finally {
      setIsSaving(false);
    }
  }

  const disabled = !route || isSaving;

  const sharedRound = "rounded-2xl";

  const controlBackground = disabled ? "rgba(160,170,185,0.18)" : "rgba(255,255,255,0.22)";

  const controlBorder = disabled
    ? "1px solid rgba(255,255,255,0.22)"
    : "1px solid rgba(255,255,255,0.40)";

  const controlShadow = disabled
    ? "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)"
    : "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)";

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSave}
        disabled={disabled}
        aria-label={saved ? "Route saved" : isSaving ? "Saving route" : "Save route"}
        title={saved ? "Route Saved" : isSaving ? "Saving..." : "Save Route"}
        className={[
          "relative flex items-center justify-center transition active:scale-95 disabled:cursor-default overflow-hidden",
          sharedRound,
        ].join(" ")}
        style={{
          width: 48,
          height: 48,
          background: controlBackground,
          border: controlBorder,
          backdropFilter: "blur(26px)",
          WebkitBackdropFilter: "blur(26px)",
          boxShadow: controlShadow,
        }}
      >
        <div
          aria-hidden
          className={["absolute inset-0 pointer-events-none", sharedRound].join(" ")}
          style={{
            background: "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
          }}
        />

        {isSaving ? (
          <Loader2
            strokeWidth={2.85}
            className="relative z-10 h-5 w-5 animate-spin"
            style={{ color: disabled ? "rgba(112,128,150,0.98)" : "rgba(15,23,42,0.95)" }}
          />
        ) : saved ? (
          <Check
            strokeWidth={2.85}
            className="relative z-10 h-5 w-5"
            style={{ color: disabled ? "rgba(112,128,150,0.98)" : "rgba(15,23,42,0.95)" }}
          />
        ) : (
          <Bookmark
            strokeWidth={2.85}
            className="relative z-10 h-5 w-5"
            style={{ color: disabled ? "rgba(112,128,150,0.98)" : "rgba(15,23,42,0.95)" }}
          />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={disabled}
      className={[
        "relative w-full flex items-center justify-center gap-2 transition active:scale-95 disabled:cursor-default overflow-hidden",
        sharedRound,
      ].join(" ")}
      style={{
        padding: "0.75rem 1rem",
        background: controlBackground,
        border: controlBorder,
        backdropFilter: "blur(26px)",
        WebkitBackdropFilter: "blur(26px)",
        boxShadow: controlShadow,
      }}
    >
      <div
        aria-hidden
        className={["absolute inset-0 pointer-events-none", sharedRound].join(" ")}
        style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
        }}
      />

      {isSaving ? (
        <>
          <Loader2
            strokeWidth={2.6}
            className={[
              "relative z-10 h-4 w-4 animate-spin",
              disabled ? "text-slate-500/95" : "text-slate-900/90",
            ].join(" ")}
          />
          <span
            className={[
              "relative z-10 text-sm font-medium leading-none",
              disabled ? "text-slate-500/95" : "text-slate-900/90",
            ].join(" ")}
          >
            Saving...
          </span>
        </>
      ) : saved ? (
        <>
          <Check
            strokeWidth={2.6}
            className={[
              "relative z-10 h-4 w-4",
              disabled ? "text-slate-500/95" : "text-slate-900/90",
            ].join(" ")}
          />
          <span
            className={[
              "relative z-10 text-sm font-medium leading-none",
              disabled ? "text-slate-500/95" : "text-slate-900/90",
            ].join(" ")}
          >
            Route Saved
          </span>
        </>
      ) : (
        <>
          <Bookmark
            strokeWidth={2.6}
            className={[
              "relative z-10 h-4 w-4",
              disabled ? "text-slate-500/95" : "text-slate-900/90",
            ].join(" ")}
          />
          <span
            className={[
              "relative z-10 text-sm font-medium leading-none",
              disabled ? "text-slate-500/95" : "text-slate-900/90",
            ].join(" ")}
          >
            Save Route
          </span>
        </>
      )}
    </button>
  );
}
