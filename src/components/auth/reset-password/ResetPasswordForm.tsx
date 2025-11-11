"use client";

import { resetPasswordSchema, type ResetPasswordData } from "@/lib/validation/authSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function ResetPasswordForm() {
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordData) {
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Reset failed");

      setMessage("✅ Password reset successfully! Redirecting...");
    } catch (err: any) {
      setMessage(err.message || "An unexpected error occurred.");
    }
  }

  return (
    <div className="bg-white rounded-xl w-full max-w-md text-center">
      <h1 className="text-2xl font-bold mb-2 text-gray-800">Reset your password</h1>
      <p className="text-sm text-gray-600 mb-6">
        Enter a new password for your Hillfinder account.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* New Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.25 }}
          className="relative"
        >
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            {...register("password")}
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
            tabIndex={-1}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
          {errors.password && (
            <p className="text-sm text-left text-red-600 mt-1">{errors.password.message}</p>
          )}
        </motion.div>

        {/* Confirm Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.25 }}
          className="relative"
        >
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            {...register("confirmPassword")}
            className={clsx(
              "border rounded-md px-4 py-2 w-full text-gray-900 placeholder-gray-400 pr-10 focus:outline-none focus:ring-2 transition",
              errors.confirmPassword
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-green-600"
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute top-2 right-3 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showConfirmPassword ? "🙈" : "👁️"}
          </button>
          {errors.confirmPassword && (
            <p className="text-sm text-left text-red-600 mt-1">{errors.confirmPassword.message}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.25 }}
        >
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-green text-white w-full rounded-md py-2 transition disabled:opacity-50"
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
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
    </div>
  );
}
