import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

declare global {
  var passwordAttempts: { [key: string]: number[] };
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    globalThis.passwordAttempts = globalThis.passwordAttempts || {};

    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const limit = 3;

    if (!globalThis.passwordAttempts[ip]) {
      globalThis.passwordAttempts[ip] = [];
    }

    globalThis.passwordAttempts[ip] = globalThis.passwordAttempts[ip].filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (globalThis.passwordAttempts[ip].length >= limit) {
      return NextResponse.json(
        { error: "Too many password attempts. Try again later." },
        { status: 429 }
      );
    }

    globalThis.passwordAttempts[ip].push(now);

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
    }

    // Enforce minimum password length
    if (!newPassword || newPassword.length < 12) {
      return NextResponse.json(
        { error: "Password must be at least 12 characters long" },
        { status: 400 }
      );
    }

    // Enforce strict password complexity
    const strictRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

    if (!strictRegex.test(newPassword)) {
      return NextResponse.json(
        {
          error: "Password must include uppercase, lowercase, a number, and a special character",
        },
        { status: 400 }
      );
    }

    await connectToDB();

    const user = await User.findById(session.user.id);

    const forbidden = [
      user?.email?.toLowerCase(),
      user?.username?.toLowerCase(),
      user?.name?.toLowerCase(),
    ];

    if (
      forbidden.some(
        (val) => val && newPassword.toLowerCase().includes(val.replace(/[^a-z0-9]/gi, ""))
      )
    ) {
      return NextResponse.json(
        { error: "Password cannot contain your name, username, or email" },
        { status: 400 }
      );
    }

    const weakPatterns = ["password", "qwerty", "12345", "abc123", "letmein"];

    if (weakPatterns.some((p) => newPassword.toLowerCase().includes(p.toLowerCase()))) {
      return NextResponse.json(
        { error: "Password contains a forbidden weak pattern" },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return NextResponse.json(
        { error: "New password cannot be the same as the old password" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    user.password = hashed;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PASSWORD_UPDATE_ERROR]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
