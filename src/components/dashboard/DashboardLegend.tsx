export function DashboardLegend({ visible }: { visible: boolean }) {
  return (
    <div
      className={`
    absolute bottom-28 left-4 z-40

    rounded-2xl
    border border-white/50
    bg-white/85 backdrop-blur-xl
    shadow-[0_16px_40px_rgba(0,0,0,0.2)]
    px-4 py-3
    text-sm text-gray-800
    transition-all duration-180 ease-out
    ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95 pointer-events-none"}
  `}
    >
      <div className="font-semibold mb-2">Hillfinder Guide</div>

      <div className="flex items-center gap-2 mb-1 whitespace-nowrap">
        <span className="inline-block w-3 h-3 rounded-full bg-[#22c55e]" />
        <span>Smooth downhill</span>
      </div>

      <div className="flex items-center gap-2 mb-1 whitespace-nowrap">
        <span className="inline-block w-3 h-3 rounded-full bg-[#eab308]" />
        <span>Fun descent</span>
      </div>

      <div className="flex items-center gap-2 mb-1 whitespace-nowrap">
        <span className="inline-block w-3 h-3 rounded-full bg-[#ef4444]" />
        <span>Steep downhill</span>
      </div>

      <div className="flex items-center gap-2 mb-1 whitespace-nowrap">
        <span className="inline-block w-3 h-3 rounded-full bg-[#7f1d1d]" />
        <span>Uphill (effort)</span>
      </div>
    </div>
  );
}
