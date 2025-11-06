"use client";

import Link from "next/link";

export default function SignInPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Welcome back
      </h1>
      <form className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-green-400 outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-green-400 outline-none"
        />
        <button
          type="submit"
          className="btn-green w-full py-2 rounded-md font-medium shadow hover:opacity-90 transition"
        >
          Sign in
        </button>
      </form>

      <p className="text-sm text-gray-600 text-center mt-6">
        Don’t have an account?{" "}
        <Link
          href="/auth/signup"
          className="text-green-600 font-medium hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
