import { connectToDB } from "@/lib/mongodb";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import User from "@/models/User";
import crypto from "crypto";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const GENERIC_RESPONSE = { message: "If that email exists, we’ve sent a reset link." };

export async function POST(req: Request) {
  try {
    const { email: rawEmail } = await req.json();

    // Reject non-string input so query operators like {"$ne": null} can't reach Mongo
    if (typeof rawEmail !== "string" || !rawEmail.trim()) {
      return NextResponse.json({ message: "Please enter your email address." }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();

    if (
      !rateLimit(`forgot:ip:${clientIp(req.headers)}`, 10, 60 * 60 * 1000) ||
      !rateLimit(`forgot:email:${email}`, 3, 60 * 60 * 1000)
    ) {
      // Same response as success so the limit doesn't reveal whether the account exists
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    // 🧩 1. Connect to MongoDB
    await connectToDB();

    // 🧩 2. Find user by email
    const user = await User.findOne({ email });
    // Google accounts have no password; don't let a reset email add one
    if (!user || !user.password) {
      // Don’t reveal that user doesn’t exist
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    // 🧩 3. Generate reset token + expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour

    await user.save();

    // 🧩 4. Create reset link with plain token (for email)
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;

    // 🧩 5. Configure and send reset email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Reset your Hillfinder password",
      html: `
        <p>Hi there,</p>
        <p>You requested to reset your password. Click the link below to create a new one:</p>
        <a href="${resetLink}" style="color:#007bff;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>– The Hillfinder Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (err) {
    console.error("Error sending reset email:", err);
    return NextResponse.json(
      { message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
