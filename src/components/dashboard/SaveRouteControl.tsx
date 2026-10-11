"use client";

import MapControlTooltip from "./ui/MapControlTooltip";
import { mapControlStyle } from "./ui/mapControlStyle";
import type { SaveRoutePayload } from "@/types/saved-route";
import { Bookmark, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SaveRouteControl({
  route,
  onSaved,
  onCreateRoute,
  savedRouteId = null,
  isCheckingSavedRoute = false,
  compact = false,
  isActiveSavedRoute = false,
}: {
  route: SaveRoutePayload | null;
  onSaved?: (routeId: string, route: SaveRoutePayload) => void;
  onCreateRoute?: () => void;
  savedRouteId?: string | null;
  isCheckingSavedRoute?: boolean;
  compact?: boolean;
  isActiveSavedRoute?: boolean;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const saved = !!route && !!savedRouteId && !isActiveSavedRoute;

  async function handleSave() {
    if (isCheckingSavedRoute || isSaving || saved || isActiveSavedRoute) return;
    if (!route) {
      if (onCreateRoute) {
        toast.info("Create a route to save it", {
          id: "save-route-guidance",
          duration: 6000,
          action: { label: "Create a route", onClick: onCreateRoute },
          actionButtonStyle: {
            background: "transparent",
            color: "inherit",
            padding: "6px 0",
            height: "auto",
            fontWeight: 700,
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          },
        });
      }
      return;
    }

    const savingToast = toast.loading("Saving route…");

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

      const data = await res.json();
      if (typeof data.route?._id !== "string") {
        throw new Error("Saved route response is missing its ID");
      }
      onSaved?.(data.route._id, route);
    } catch (err) {
      console.warn("[SaveRouteControl]", err);
      toast.error("Couldn't save route. Try again.");
    } finally {
      toast.dismiss(savingToast);
      setIsSaving(false);
    }
  }

  const disabled = (!route && !onCreateRoute) || isCheckingSavedRoute || isSaving || saved || isActiveSavedRoute;

  const sharedRound = "rounded-2xl";

  const controlBackground = disabled
    ? "rgba(52,211,153,0.11)"
    : "rgba(255,255,255,0.22)";

  const controlBorder = disabled
    ? "1px solid rgba(52,211,153,0.26)"
    : "1px solid rgba(255,255,255,0.40)";

  const controlShadow = disabled
    ? "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)"
    : "0 2px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.20)";

  const ariaLabel = saved
    ? "Route saved"
    : isSaving
      ? "Saving route"
      : isActiveSavedRoute
        ? "Route already saved"
        : "Save route";

  const title = saved
    ? "Route Saved"
    : isSaving
      ? "Saving..."
      : isActiveSavedRoute
        ? "This route is already saved"
        : "Save Route";

  const tooltipLabel = isCheckingSavedRoute
    ? "Checking saved route"
    : isSaving
    ? "Saving route"
    : saved || isActiveSavedRoute
      ? "Route already saved"
      : route
        ? "Save this route"
        : "Create a route to save it";

  if (compact) {
    return (
      <MapControlTooltip label={tooltipLabel}>
        {(descriptionId) => (
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-busy={isSaving || isCheckingSavedRoute}
            aria-describedby={descriptionId}
            className={[
              "relative flex items-center justify-center transition active:scale-95 disabled:cursor-default overflow-hidden",
              sharedRound,
            ].join(" ")}
            style={{
              width: 48,
              height: 48,
              ...mapControlStyle(
                "#00B86B",
                !!route && (saved || isActiveSavedRoute),
              ),
            }}
          >
            <div
              aria-hidden
              className={[
                "absolute inset-0 pointer-events-none",
                sharedRound,
              ].join(" ")}
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
              }}
            />

            {isSaving ? (
              <Loader2
                strokeWidth={2.85}
                className="relative z-10 h-5 w-5 animate-spin"
                style={{ color: "inherit" }}
              />
            ) : saved ? (
              <Check
                strokeWidth={2.85}
                className="relative z-10 h-5 w-5"
                style={{ color: "inherit" }}
              />
            ) : (
              <Bookmark
                strokeWidth={2.85}
                className="relative z-10 h-5 w-5"
                style={{ color: "inherit" }}
              />
            )}
          </button>
        )}
      </MapControlTooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={disabled}
      aria-busy={isSaving}
      title={title}
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
        className={["absolute inset-0 pointer-events-none", sharedRound].join(
          " ",
        )}
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
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
      ) : isActiveSavedRoute ? (
        <>
          <Bookmark
            strokeWidth={2.6}
            className="relative z-10 h-4 w-4 text-slate-500/95"
          />
          <span className="relative z-10 text-sm font-medium leading-none text-slate-500/95">
            Already Saved
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
