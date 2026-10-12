import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongoose"; // ✅ your existing connection helper
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { signupSchema } from "@/lib/validation/authSchemas";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`signup:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many sign-up attempts. Try again later." },
        { status: 429 }
      );
    }

    const parsed = signupSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid sign-up details." },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists. Please sign in." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return NextResponse.json(
      {
        message: "User created successfully",
        user: { name: newUser.name, email: newUser.email },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
