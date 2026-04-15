"use client";

type LoadingOverlayProps = {
  text?: string;
  tone?: "light" | "dark";
  fixed?: boolean;
  showBackdrop?: boolean;
};

export default function LoadingOverlay({
  text = "Loading…",
  tone = "dark",
  fixed = true,
  showBackdrop = false,
}: LoadingOverlayProps) {
  const wrapperClass = fixed ? "fixed inset-0 z-[16]" : "absolute inset-0 z-[1]";

  const cardClass = [
    "border border-emerald-500/20",
    "bg-black",
    "shadow-[0_18px_60px_rgba(0,0,0,0.45)]",
  ].join(" ");

  return (
    <div
      className={[wrapperClass, "pointer-events-auto flex items-center justify-center px-6"].join(
        " "
      )}
    >
      {showBackdrop && (
        <div
          className="absolute inset-0 bg-black/28 [-webkit-backdrop-filter:blur(1px)] [backdrop-filter:blur(1px)]"
          aria-hidden="true"
        />
      )}

      <div
        className={[
          "relative z-[1] inline-flex min-w-[16rem] max-w-[20rem] items-center gap-3 rounded-2xl px-5 py-4",
          cardClass,
        ].join(" ")}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <div
          className={[
            "h-4 w-4 rounded-full border-2 animate-spin",
            "border-emerald-400/40 border-t-emerald-400",
          ].join(" ")}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-white/90">{text}</span>
      </div>
    </div>
  );
}
