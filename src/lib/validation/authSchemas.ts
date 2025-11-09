// src/lib/validation/authSchemas.ts
import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signupSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(50, { message: "Name cannot exceed 50 characters" }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(emailRegex, { message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(64, { message: "Password cannot exceed 64 characters" })
    .regex(/[A-Za-z]/, { message: "Password must contain at least one letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),
});

export const signinSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(emailRegex, { message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

export type SignupData = z.infer<typeof signupSchema>;
export type SigninData = z.infer<typeof signinSchema>;
