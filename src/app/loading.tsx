import Image from "next/image";

// Shown instantly while the server checks the session and renders the page, so a slow
// (cold) start shows the brand instead of a blank white screen
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-hillfinder-gradient"
    >
      <style>{`
        @keyframes hf-boot-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hf-boot-float, .hf-boot-spin { animation: none !important; }
        }
      `}</style>

      {/* A small WebP rather than favicon.svg (125 KB: a PNG wrapped in SVG), so the logo
          arrives with the gradient instead of popping in seconds later. Unoptimized to skip
          the image optimizer, which is itself slow on a cold start */}
      <Image
        src="/boot-logo.webp"
        alt=""
        width={116}
        height={120}
        priority
        unoptimized
        className="hf-boot-float drop-shadow-[0_12px_24px_rgba(15,53,88,0.2)]"
        style={{ animation: "hf-boot-float 2.4s ease-in-out infinite" }}
      />

      <div
        aria-hidden
        className="hf-boot-spin mt-8 h-7 w-7 animate-spin rounded-full border-[3px] border-brandGreen/25 border-t-brandGreen"
      />
      <span className="sr-only">Loading Hillfinder…</span>
    </div>
  );
}
