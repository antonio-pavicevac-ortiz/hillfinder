"use client";

import { MapPin, Route, Star } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onUseLocation: () => void;
  onStartRoute: () => void;
  onViewSaved: () => void;
}

export default function QuickActionsSheet({
  open,
  onClose,
  onUseLocation,
  onStartRoute,
  onViewSaved,
}: Props) {
  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      )}

      {/* Sheet */}
      <div
        className={`
          fixed left-0 right-0 bottom-0 z-50
          bg-white/90 backdrop-blur-xl rounded-t-2xl shadow-lg border-t border-black/10
          transition-transform duration-300
          ${open ? "translate-y-0" : "translate-y-full"}
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
              onStartRoute();
              onClose();
            }}
            className="w-full flex items-center gap-3 bg-blue-100 hover:bg-blue-200 px-4 py-3 rounded-xl"
          >
            <Route className="text-blue-700" />
            Start New Route
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
