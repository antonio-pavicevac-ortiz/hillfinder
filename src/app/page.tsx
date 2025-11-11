export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-hillfinder-gradient text-center">
      <h1 className="text-4xl font-bold mb-4 text-gray-800">Welcome to Hillfinder</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        Discover scenic downhill routes near you. Whether you’re biking, skateboarding, or just
        exploring — Hillfinder helps you find your perfect ride.
      </p>
      <div className="flex justify-center gap-4 mt-6">
        <a
          href="/auth/signin"
          className="px-5 py-2 rounded-md border border-green-600 text-green-700 hover:bg-green-50 font-medium transition"
        >
          Sign In
        </a>
        <a
          href="/auth/signup"
          className="px-5 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium transition"
        >
          Sign Up
        </a>
      </div>
    </main>
  );
}
