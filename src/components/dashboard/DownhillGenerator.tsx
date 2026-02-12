"use client";

import AnimatedPanel from "@/components/ui/AnimatedPanel";
import { UXHint } from "@/components/ui/UXHint";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

export default function DownhillGenerator({
  open,
  initialTo = "",
  onClose,
  onGenerate,
  showHint,
}: {
  open: boolean;
  initialTo?: string;
  onClose: () => void;
  onGenerate: (params: { from: string; to: string }) => Promise<void> | void;
  showHint: boolean;
}) {
  const [from] = useState("Your Location");
  const [to, setTo] = useState(initialTo);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Lock generate after success until "To" changes
  const [generatedFor, setGeneratedFor] = useState<string>("");

  // Keep "To" synced to map-picked destination (initialTo)
  useEffect(() => {
    setTo(initialTo);
  }, [initialTo, open]);

  const trimmedTo = useMemo(() => to.trim(), [to]);
  const isGenerated = !!trimmedTo && trimmedTo === generatedFor;

  // ✅ Generate button enablement
  const canGenerate = !!trimmedTo && !isGenerated && !loading;

  async function handleGenerate() {
    const dest = to.trim();
    if (!dest) {
      setMessage("Please enter a destination to generate your downhill route.");
      return;
    }

    // already generated for this destination
    if (dest === generatedFor) return;

    setLoading(true);
    setMessage("Analyzing elevation and computing downhill segments…");

    try {
      await onGenerate({ from, to: dest });
      setMessage("");
      setGeneratedFor(dest);
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong generating the route.");
    } finally {
      setLoading(false);
    }
  }

  // --- Sheet motion tuning ---
  // Close rules:
  // - drag distance past ~90px, OR
  // - fast flick down (velocity), even if distance is smaller
  const CLOSE_DISTANCE_PX = 90;
  const FLICK_VELOCITY = 900; // px/s

  // Drag resistance (feels like iOS)
  // Lower = more resistance.
  const DRAG_ELASTIC: number = 0.18;

  // Spring feels
  const SPRING_IN = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const;
  const SPRING_OUT = { type: "spring", stiffness: 360, damping: 38, mass: 0.9 } as const;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="downhill-generator"
          className="w-full"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: SPRING_IN }}
          exit={{ y: 320, opacity: 0, transition: SPRING_OUT }}
        >
          <motion.div
            className="pointer-events-auto w-full bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl p-5"
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 9999 }}
            dragElastic={DRAG_ELASTIC}
            onDragEnd={(_, info) => {
              const offsetY = info.offset.y;
              const velocityY = info.velocity.y;

              // Treat small pull as cancel; sheet snaps back via spring automatically.
              const shouldClose = offsetY > CLOSE_DISTANCE_PX || velocityY > FLICK_VELOCITY;
              if (shouldClose) onClose();
            }}
            style={{ touchAction: "none" }}
          >
            {/* Header */}
            <div className="mb-4">
              {/* Full-width pill hit area */}
              <div className="flex justify-center mb-3">
                <button
                  type="button"
                  aria-label="Close planner"
                  className="group w-full flex justify-center py-4 -my-2 cursor-grab active:cursor-grabbing"
                  onClick={onClose}
                >
                  <div className="h-1.5 w-12 rounded-full bg-gray-400/60 transition-colors duration-200 group-hover:bg-gray-600/70 group-active:bg-gray-600/70" />
                </button>
              </div>

              <div className="flex items-center justify-center">
                <h2 className="text-lg font-semibold text-gray-900">Plan Your Downhill Route</h2>
              </div>
            </div>

            <AnimatedPanel visible={showHint} className="mb-3">
              <UXHint show>Tip: Drag either pin, then tap the map to generate your route.</UXHint>
            </AnimatedPanel>

            <label className="block text-sm font-medium text-gray-700">From</label>
            <input
              type="text"
              value={from}
              readOnly
              className="w-full mt-1 mb-4 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-default"
            />

            <label className="block text-sm font-medium text-gray-700">To</label>
            <input
              type="text"
              value={to}
              onChange={(e) => {
                const next = e.target.value;
                setTo(next);

                // Unlock generation when To changes away from generatedFor
                // (derived state will re-enable button automatically)
              }}
              placeholder="Enter destination"
              className="w-full mt-1 mb-4 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={[
                "w-full font-semibold py-2 rounded-lg transition border",
                loading ? "opacity-90" : "",
                isGenerated
                  ? "bg-gray-200 text-gray-600 border-gray-300"
                  : canGenerate
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                    : "bg-emerald-600/45 text-white/80 border-emerald-600/30 cursor-not-allowed",
              ].join(" ")}
            >
              {loading ? "Generating Route…" : isGenerated ? "Route Generated" : "Generate Downhill Route"}
            </button>

            {message && (
              <p className="text-center text-sm text-gray-700 mt-4 whitespace-pre-line">{message}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
