"use client";

import { signupSchema, type SignupData } from "@/lib/validation/authSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function SignupForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupData) {
    setMessage("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        setMessage(result.error || "Signup failed");
      } else {
        setMessage("✅ Account created! Redirecting...");
        await signIn("credentials", {
          redirect: true,
          email: data.email,
          password: data.password,
          callbackUrl: "/dashboard",
        });
      }
    } catch (err) {
      setMessage("An unexpected error occurred.");
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Create your Hillfinder account
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input
          type="text"
          placeholder="Name"
          {...register("name")}
          className="border p-2 rounded w-full"
        />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}

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
          className={`btn-green text-white p-2 rounded w-full transition ${
            isSubmitting ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Creating Account..." : "Sign Up"}
        </button>

        {message && (
          <p
            className={`text-sm text-center ${
              message.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </>
  );
}
