"use client";

import { signInSchema, type SigninData } from "@/lib/validation/authSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

type SignInClientProps = {
  providers: Record<string, any> | null;
};

export default function SignInClient({ providers }: SignInClientProps) {
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninData>({
    resolver: zodResolver(signInSchema),
  });

  async function onSubmit(data: SigninData) {
    setError("");
    const result = await signIn("credentials", {
      ...data,
      redirect: false,
    });
    if (result?.error) setError(result.error);
  }

  return (
    <div className="bg-white rounded-xl w-full max-w-sm text-center">
      <h1 className="text-2xl font-semibold mb-6">Sign in to Hillfinder</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          {...register("email")}
          className="border p-2 rounded w-full"
        />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}

        <input
          type="password"
          placeholder="Password"
          {...register("password")}
          className="border p-2 rounded w-full"
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-green text-white w-full rounded p-2"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <div className="flex items-center my-4">
        <div className="flex-grow h-px bg-gray-200"></div>
        <span className="px-2 text-gray-500 text-sm">or</span>
        <div className="flex-grow h-px bg-gray-200"></div>
      </div>

      {providers?.google && (
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
        >
          Continue with Google
        </button>
      )}
    </div>
  );
}
