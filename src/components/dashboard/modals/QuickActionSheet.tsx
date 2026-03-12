"use client";

import { Route, Star, Zap } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onQuickRoute: () => void;
  onStartRoute: () => void;
  onViewSaved: () => void;
  quickRouteEnabled?: boolean;
}

export default function QuickActionsSheet({
  open,
  onClose,
  onQuickRoute,
  onStartRoute,
  onViewSaved,
  quickRouteEnabled,
}: Props) {
  const canQuickRoute = quickRouteEnabled ?? true;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}

      <div
        className={`
          fixed left-0 right-0 bottom-0 z-50
          rounded-t-2xl border-t border-black/10
          bg-white/90 backdrop-blur-xl shadow-lg
          transition-transform duration-300
          ${open ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"}
        `}
      >
        <div className="p-6 space-y-4">
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
                ? "bg-rose-100 hover:bg-rose-200 border border-rose-200"
                : "bg-rose-100/40 border border-rose-200/50 text-slate-400 cursor-not-allowed",
            ].join(" ")}
          >
            <Zap className={canQuickRoute ? "text-rose-700" : "text-slate-400"} />
            Quick Route
          </button>

          {!canQuickRoute && (
            <p className="px-1 -mt-2 text-xs text-slate-500">Set a destination on the map first.</p>
          )}

          <button
            onClick={() => {
              onStartRoute();
              onClose();
            }}
            className="w-full flex items-center gap-3 bg-blue-100 hover:bg-blue-200 border border-blue-200 px-4 py-3 rounded-xl"
          >
            <Route className="text-blue-700" />
            Plan Your Route
          </button>

          <button
            onClick={() => {
              onViewSaved();
              onClose();
            }}
            className="w-full flex items-center gap-3 bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 px-4 py-3 rounded-xl"
          >
            <Star className="text-yellow-700" />
            Saved Routes
          </button>
        </div>
      </div>
    </>
  );
}
