"use client";

import AnimatedPanel from "@/components/ui/AnimatedPanel";
import { UXHint } from "@/components/ui/UXHint";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const SKILL_INFO = {
  beginner: {
    label: "Beginner",
    blurb: "Smooth sailing 🌿 Gentle downhill routes with minimal effort.",
  },
  intermediate: {
    label: "Intermediate",
    blurb: "A bit of spice 🌄 Balanced descents with fun variation.",
  },
  advanced: {
    label: "Advanced",
    blurb: "Hold on tight 🔥 Steeper descents for experienced riders.",
  },
} as const;

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
  onGenerate: (params: {
    from: string;
    to: string;
    skill: "beginner" | "intermediate" | "advanced";
  }) => Promise<void> | void;
  showHint: boolean;
}) {
  const [from] = useState("Your Location");
  const [to, setTo] = useState(initialTo);
  const [skill, setSkill] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleGenerate() {
    if (!to.trim()) {
      setMessage("Please enter a destination to generate your downhill route.");
      return;
    }

    onGenerate({ from, to, skill });

    setLoading(true);
    setMessage("Analyzing elevation and computing downhill segments…");

    setTimeout(() => {
      setMessage(
        `Route generated! (Placeholder)
Skill level: ${skill}
From: ${from}
To: ${to}`
      );
      setLoading(false);
    }, 1500);
  }

  useEffect(() => {
    setTo(initialTo);
  }, [initialTo]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="
      relative
      w-[100%] sm:w-[500px]
      bg-white/70 backdrop-blur-xl
      rounded-2xl border border-white/30 shadow-xl
      p-5
    "
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Plan Your Downhill Route</h2>
      <AnimatedPanel visible={showHint} className="mb-3">
        <UXHint show>Tip: Drag either pin, then tap the map to generate your route.</UXHint>
      </AnimatedPanel>

      {/* From */}
      <label className="block text-sm font-medium text-gray-700">From</label>
      <input
        type="text"
        value={from}
        readOnly
        className="w-full mt-1 mb-4 px-3 py-2 border border-gray-300 rounded-lg
bg-gray-100 cursor-default
focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />

      {/* To */}
      <label className="block text-sm font-medium text-gray-700">To</label>
      <input
        type="text"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Enter destination"
        className="w-full mt-1 mb-4 px-3 py-2 border border-gray-300 rounded-lg
focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />

      {/* Skill */}
      <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>

      <div className="flex flex-col gap-3 mb-4">
        {/* Skill buttons */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
          {(["beginner", "intermediate", "advanced"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setSkill(level)}
              className={`px-3 py-2 text-sm sm:text-base rounded-xl border transition
flex items-center justify-center
focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                ${
                  skill === level
                    ? level === "beginner"
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : level === "intermediate"
                        ? "bg-yellow-500 text-white border-yellow-500"
                        : "bg-red-500 text-white border-red-500"
                    : "border-gray-300 text-gray-700 bg-white"
                }`}
            >
              {SKILL_INFO[level].label}
            </button>
          ))}
        </div>
        {/* Skill blurb */}
        <p className="text-sm text-gray-600 transition-opacity">{SKILL_INFO[skill].blurb}</p>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700
                 disabled:opacity-50 text-white font-semibold
                 py-2 rounded-lg transition"
      >
        {loading ? "Generating Route…" : "Generate Downhill Route"}
      </button>

      {message && (
        <p className="text-center text-sm text-gray-700 mt-4 whitespace-pre-line">{message}</p>
      )}
    </motion.div>
  );
}
