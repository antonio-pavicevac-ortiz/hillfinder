"use client";

import { ClientSafeProvider, signIn } from "next-auth/react";
import { useState } from "react";

type SignInClientProps = {
  providers: Record<string, ClientSafeProvider> | null;
};

export default function SignInClient({ providers }: SignInClientProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <>
      <h1 className="text-2xl font-semibold mb-6 text-gray-800 text-center">
        Sign in to Hillfinder
      </h1>

      {providers?.credentials && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const result = await signIn("credentials", {
              email,
              password,
              callbackUrl: "/dashboard",
            });
            if (result?.error) {
              setError(result.error);
            }
          }}
          className="space-y-3 text-left mt-1"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 rounded w-full focus:ring-2 focus:ring-green-400 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 rounded w-full focus:ring-2 focus:ring-green-400 focus:outline-none"
          />
          <button
            type="submit"
            className="btn btn-green text-white w-full rounded p-2 font-medium hover:bg-green-700 transition"
          >
            Sign in
          </button>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </form>
      )}

      <div className="flex items-center my-4">
        <div className="flex-grow h-px bg-gray-200"></div>
        <span className="px-2 text-gray-500 text-sm">or</span>
        <div className="flex-grow h-px bg-gray-200"></div>
      </div>

      {providers?.google && (
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition"
        >
          Continue with Google
        </button>
      )}
    </>
  );
}
