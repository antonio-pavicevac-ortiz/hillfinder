export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-yellow-50 to-green-200">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.1)] p-8 mx-4">
        {children}
      </div>
    </main>
  );
}
