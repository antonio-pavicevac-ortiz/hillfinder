import { connectToDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token) {
      console.error("Reset password attempt failed: Missing reset token.");
      return NextResponse.json({ message: "Missing reset token." }, { status: 400 });
    }
    if (!password) {
      console.error("Reset password attempt failed: Missing new password.");
      return NextResponse.json({ message: "Missing password." }, { status: 400 });
    }

    console.log("Received reset token:", token);
    console.log("Received new password length:", password.length);

    await connectToDB();
    console.log("Connected to MongoDB.");

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    console.log("Hashed reset token for lookup:", hashedToken);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (user) console.log(`Matched reset token for user: ${user.email}`);

    if (!user) {
      console.error("Invalid or expired reset token provided:", token);
      return NextResponse.json({ message: "Invalid or expired token." }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();
    console.log("Password updated and reset token cleared for user:", user._id);

    return NextResponse.json(
      { message: "✅ Password successfully updated. You can now sign in." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during password reset process:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
