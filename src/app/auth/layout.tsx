export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative bg-gradient-to-br from-green-100 via-yellow-50 to-green-200">
      {/* Offset wrapper for stable centering */}
      <div className="transform -translate-y-6 sm:-translate-y-10">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_0_25px_rgba(34,197,94,0.12)] hover:shadow-[0_0_35px_rgba(34,197,94,0.25)] transition-all duration-300 p-8 sm:p-10 w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
