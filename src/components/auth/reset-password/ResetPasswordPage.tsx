"use client";

import { resetPasswordSchema, type ResetPasswordData } from "@/lib/validation/authSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const tokenFromURL = new URLSearchParams(window.location.search).get("token");
      if (tokenFromURL) setToken(tokenFromURL);
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordData) {
    if (isSubmitting) return;
    if (!token) {
      toast.error("Missing reset token — please use the email link again.");
      return;
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, token }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Reset failed");

      // 🎉 Success Toast + redirect
      toast.success("✅ Password reset successfully! Redirecting...");
      setTimeout(() => {
        router.push("/auth/signin");
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    }
  }

  return (
    <div className="bg-white rounded-xl w-full max-w-md text-center">
      <h1 className="text-2xl font-bold mb-2 text-gray-800">Reset your password</h1>
      <p className="text-sm text-gray-600 mb-6">
        Enter a new password for your Hillfinder account.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* New Password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            {...register("password")}
            className="border border-gray-300 px-4 py-2 rounded-md w-full text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isSubmitting}
            className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
          {errors.password && (
            <p className="text-sm text-left text-red-600 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            {...register("confirmPassword")}
            className="border border-gray-300 px-4 py-2 rounded-md w-full text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            disabled={isSubmitting}
            className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            {showConfirmPassword ? "🙈" : "👁️"}
          </button>
          {errors.confirmPassword && (
            <p className="text-sm text-left text-red-600 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="btn-green text-white w-full rounded p-2 transition disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
