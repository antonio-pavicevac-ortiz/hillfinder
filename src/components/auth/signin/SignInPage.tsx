"use client";

import { signinSchema, type SigninData } from "@/lib/validation/authSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { motion } from "framer-motion";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function SignInPage({ providers }: { providers?: Record<string, any> | null }) {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninData>({
    resolver: zodResolver(signinSchema),
  });

  async function onSubmit(data: SigninData) {
    setError("");

    const result = await signIn("credentials", {
      ...data,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      toast.error("Invalid email or password. Please try again.");
    } else if (result?.ok) {
      toast.success("Welcome back to Hillfinder 🌄");
      setTimeout(() => router.push("/dashboard"), 1200);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Sign in to Hillfinder</h1>

      <form suppressHydrationWarning onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.25 }}
        >
          <input
            {...register("email")}
            type="email"
            placeholder="Email"
            className={clsx(
              "border rounded-md px-4 py-2 w-full text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition",
              errors.email
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-green-600"
            )}
          />
          {errors.email && (
            <p className="text-sm text-left text-red-600 mt-1">{errors.email.message}</p>
          )}
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.25 }}
          className="relative"
        >
          <input
            type={showPassword ? "text" : "password"}
            {...register("password")}
            placeholder="Password"
            className={clsx(
              "border rounded-md px-4 py-2 w-full text-gray-900 placeholder-gray-400 pr-10 focus:outline-none focus:ring-2 transition",
              errors.password
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-green-600"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute top-2 right-3 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
          {errors.password && (
            <p className="text-sm text-left text-red-600 mt-1">{errors.password.message}</p>
          )}
        </motion.div>

        {/* Forgot password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.25 }}
          className="flex justify-end"
        >
          <Link
            href="/auth/forgot-password"
            className="text-sm text-gray-500 hover:text-green-700 transition-colors"
          >
            Forgot Password?
          </Link>
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.25 }}
        >
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-green text-white w-full rounded-md py-2 transition disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </motion.div>

        {/* Error feedback + Create Account */}
        {error && (
          <div className="mt-3 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>

            {error.includes("sign up") && (
              <Link
                href="/auth/signup"
                className="inline-block bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition"
              >
                Create an Account
              </Link>
            )}
          </div>
        )}
      </form>

      {/* Divider */}
      <div className="flex items-center my-4">
        <div className="flex-grow h-px bg-gray-200"></div>
        <span className="px-2 text-gray-500 text-sm">or</span>
        <div className="flex-grow h-px bg-gray-200"></div>
      </div>

      {/* Google Sign In */}
      {providers?.google && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.25 }}
        >
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition"
          >
            Continue with Google
          </button>
        </motion.div>
      )}
    </>
  );
}
