export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] px-6 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className="mb-6 w-16 h-16"
        aria-hidden="true"
      >
        <path
          d="M4 52 L20 24 L32 40 L42 28 L60 52 Z"
          fill="#22c55e"
          opacity="0.9"
        />
        <circle cx="50" cy="20" r="8" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
        <line x1="56" y1="14" x2="44" y2="26" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <h1 className="text-2xl font-bold text-white mb-2">You&rsquo;re offline</h1>
      <p className="text-slate-400 text-sm mb-8 max-w-xs">
        Hillfinder needs a connection to find new routes. Check your signal and try again.
      </p>

      <a
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-green-400 active:scale-95 transition-all"
      >
        Try again
      </a>
    </div>
  );
}
