"use client";

export default function ShimmerBar() {
  return (
    <div
      className="
        relative h-16 w-full overflow-hidden
        bg-gradient-to-r from-green-100 via-yellow-50 to-green-100
        border-b border-green-200
        shadow-sm
      "
    >
      <div
        className="
          absolute inset-0 animate-shimmer
          bg-gradient-to-r from-transparent via-green-200/60 to-transparent
        "
      />
    </div>
  );
}
