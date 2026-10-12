import { connectToDB } from "@/lib/mongodb";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { resetPasswordSchema } from "@/lib/validation/authSchemas";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`reset:${clientIp(req.headers)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many reset attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { token } = body;

    if (typeof token !== "string" || !token) {
      return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
    }

    // Enforce the same password rules as the reset form
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid password." },
        { status: 400 }
      );
    }

    await connectToDB();

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(parsed.data.password, salt);

    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return NextResponse.json(
      { message: "✅ Password successfully updated. You can now sign in." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during password reset process:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
