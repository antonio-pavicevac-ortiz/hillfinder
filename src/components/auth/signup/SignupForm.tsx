"use client";

import { signupSchema, type SignupData } from "@/lib/validation/authSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function SignupForm() {
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupData) {
    console.log("Submitting signup form with data:", data);
    setMessage("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Signup failed");
      } else {
        toast.success("🎉 Account created! Redirecting...");
        setMessage("✅ Account created! Redirecting...");
        await signIn("credentials", {
          redirect: true,
          email: data.email,
          password: data.password,
          callbackUrl: "/dashboard",
        });
      }
    } catch {
      setMessage("An unexpected error occurred.");
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Create your Hillfinder account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Name */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.4 }}
          >
            <input
              {...register("name")}
              placeholder="Name"
              className={clsx(
                "border rounded-md px-4 py-2 w-full text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition",
                errors.name
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-600"
              )}
            />
          </motion.div>
          {errors.name && (
            <p className="text-sm text-left text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.5 }}
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
          </motion.div>
          {errors.email && (
            <p className="text-sm text-left text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.6 }}
          >
            <input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              placeholder="Password"
              className={clsx(
                "border rounded-md px-4 py-2 w-full text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition pr-10",
                errors.password
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-600"
              )}
            />
          </motion.div>
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute top-2 right-3 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? "👁️" : "🙈"}
          </button>
          {errors.password && (
            <p className="text-sm text-left text-red-600 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.7 }}
          >
            <input
              type={showConfirmPassword ? "text" : "password"}
              {...register("confirmPassword")}
              placeholder="Confirm Password"
              className={clsx(
                "border rounded-md px-4 py-2 w-full text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition pr-10",
                errors.confirmPassword
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-600"
              )}
            />
          </motion.div>
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute top-2 right-3 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? "👁️" : "🙈"}
          </button>
          {errors.confirmPassword && (
            <p className="text-sm text-left text-red-600 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.8 }}
        >
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-green text-white w-full rounded p-2"
          >
            {isSubmitting ? "Creating Account..." : "Sign Up"}
          </button>
        </motion.div>

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
