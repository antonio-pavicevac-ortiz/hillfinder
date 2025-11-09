export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-hillfinder-gradient text-center">
      <h1 className="text-4xl font-bold mb-4 text-gray-800">Welcome to Hillfinder</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        Discover scenic downhill routes near you. Whether you’re biking, skateboarding, or
        just exploring — Hillfinder helps you find your perfect ride.
      </p>
      <div className="flex gap-4">
        <a
          href="/auth/signin"
          className="btn-green text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
        >
          Sign In
        </a>
        <a
          href="/auth/signup"
          className="btn-green text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
        >
          Sign Up
        </a>
      </div>
    </main>
  );
}
