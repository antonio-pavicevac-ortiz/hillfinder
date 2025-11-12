"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import clsx from "clsx";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [successMessage, setSuccessMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const router = useRouter();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setSuccessMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      if (response.ok) {
        toast.success("📧 Check your inbox for the reset link!");
        setTimeout(() => router.push("/auth/signin"), 2000);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setSuccessMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <h1 className="text-2xl font-semibold text-gray-900 mb-4 text-center">
        Forgot your password?
      </h1>
      <p className="text-gray-700 mb-6 text-center">
        Enter your email address below and we'll send you a link to reset your password.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.4 }}
          className="text-left"
        >
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className={clsx(
              "border rounded-md px-4 py-2 w-full text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition",
              errors.email
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-green-600"
            )}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isSubmitting}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.5 }}
        >
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium rounded-md py-2 transition disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </motion.div>

        {successMessage && <p className="mt-4 text-sm text-green-700">{successMessage}</p>}
      </form>
    </>
  );
}
