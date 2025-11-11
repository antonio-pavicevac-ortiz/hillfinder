import { connectToDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    // 🧩 1. Connect to DB
    await connectToDB();

    // 🧩 2. Hash the token to match stored one
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 🧩 3. Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return NextResponse.json({ message: "Invalid or expired token." }, { status: 400 });
    }

    // 🧩 4. Hash and update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 🧩 5. Clear token fields (set to null explicitly to indicate cleared fields)
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return NextResponse.json(
      { message: "✅ Password successfully updated. You can now sign in." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
