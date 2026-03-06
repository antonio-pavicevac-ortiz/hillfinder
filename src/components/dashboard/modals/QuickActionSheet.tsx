"use client";

import { MapPin, Route, Star, Zap } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onUseLocation: () => void;
  onQuickRoute: () => void;
  onStartRoute: () => void;
  onViewSaved: () => void;

  quickRouteEnabled?: boolean; // ✅ NEW
}

export default function QuickActionsSheet({
  open,
  onClose,
  onUseLocation,
  onQuickRoute, // ✅ NEW
  onStartRoute,
  onViewSaved,
  quickRouteEnabled,
}: Props) {
  const canQuickRoute = quickRouteEnabled ?? true;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      )}

      {/* Sheet */}
      {/* Sheet */}
      <div
        className={`
    fixed left-0 right-0 bottom-0 z-50
    bg-white/90 backdrop-blur-xl rounded-t-2xl shadow-lg border-t border-black/10
    transition-transform duration-300
    ${open ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"}
  `}
      >
        <div className="p-6 space-y-4">
          <button
            onClick={() => {
              onUseLocation();
              onClose();
            }}
            className="w-full flex items-center gap-3 bg-green-100 hover:bg-green-200 px-4 py-3 rounded-xl"
          >
            <MapPin className="text-green-700" />
            Use My Location
          </button>

          <button
            onClick={() => {
              if (!canQuickRoute) return;
              onQuickRoute();
              onClose();
            }}
            disabled={!canQuickRoute}
            className={[
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition border",
              canQuickRoute
                ? "bg-rose-100 hover:bg-rose-200 border-rose-200"
                : "bg-rose-100/40 text-slate-400 border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] cursor-not-allowed",
            ].join(" ")}
          >
            <Zap className={canQuickRoute ? "text-rose-700" : "text-slate-400"} />
            Quick Route
          </button>

          {!canQuickRoute && (
            <p className="text-xs text-slate-500 -mt-2 px-1">Set a destination on the map first.</p>
          )}

          <button
            onClick={() => {
              onStartRoute();
              onClose();
            }}
            className="w-full flex items-center gap-3 bg-blue-100 hover:bg-blue-200 px-4 py-3 rounded-xl"
          >
            <Route className="text-blue-700" />
            Plan Your Route
          </button>

          <button
            onClick={() => {
              onViewSaved();
              onClose();
            }}
            className="w-full flex items-center gap-3 bg-yellow-100 hover:bg-yellow-200 px-4 py-3 rounded-xl"
          >
            <Star className="text-yellow-700" />
            View Saved Spots
          </button>
        </div>
      </div>
    </>
  );
}
