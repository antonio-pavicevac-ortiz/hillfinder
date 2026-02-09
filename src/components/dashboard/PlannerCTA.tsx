"use client";

type Props = {
  visible: boolean;
  onPress: () => void;
  title?: string;
  subtitle?: string;
};

export default function PlannerCTA({
  visible,
  onPress,
  title = "Plan a downhill route",
  subtitle = "Tap to open the planner",
}: Props) {
  if (!visible) return null;

  const glassBar =
    "relative bg-white/12 saturate-150 " +
    "border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.12)] " +
    "backdrop-blur-xl rounded-2xl " +
    "before:pointer-events-none before:absolute before:inset-0 " +
    "before:bg-gradient-to-b before:from-white/20 before:to-transparent";

  return (
    <div
      className="absolute left-3 right-3 z-[68] pointer-events-auto"
      style={{ bottom: `calc(56px + env(safe-area-inset-bottom) + 0.75rem)` }}
    >
      <button
        type="button"
        onClick={onPress}
        className={`${glassBar} w-full px-4 py-3 text-left`}
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="text-xs text-slate-700/80 truncate">{subtitle}</div>
          </div>
          <div className="shrink-0 text-slate-800/70 text-lg">›</div>
        </div>
      </button>
    </div>
  );
}
