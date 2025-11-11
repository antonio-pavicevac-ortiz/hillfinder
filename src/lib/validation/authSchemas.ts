// src/lib/validation/authSchemas.ts
import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation schemas for user authentication: signup and signin

// Schema for validating user signup data
export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Schema for validating user signin data
export const signinSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(emailRegex, { message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(64, "Password must be 64 characters or fewer")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter")
      .regex(/[a-z]/, "Password must include at least one lowercase letter")
      .regex(/[0-9]/, "Password must include at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must include at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupData = z.infer<typeof signupSchema>;
export type SigninData = z.infer<typeof signinSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
