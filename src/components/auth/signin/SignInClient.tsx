"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setMessage("Invalid email or password.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm bg-hillfinder-gradient shadow-green-200/50 transition-all duration-300 hover:shadow-green-300/60">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Sign in to Hillfinder
      </h1>

      <form onSubmit={handleCredentialsLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="border border-gray-300 rounded w-full p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="border border-gray-300 rounded w-full p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-green w-full text-white py-2 rounded font-semibold"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {message && <p className="text-red-600 text-sm mt-2">{message}</p>}

      <div className="my-6 text-center text-gray-500 text-sm">or</div>

      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="w-full border border-gray-300 rounded py-2 text-gray-700 hover:bg-gray-100 transition"
      >
        Continue with Google
      </button>

      <p className="text-center text-sm text-gray-500 mt-4">
        Don’t have an account?{" "}
        <a
          href="/auth/signup"
          className="text-green-600 font-medium hover:underline"
        >
          Sign up
        </a>
      </p>
    </div>
  );
}
