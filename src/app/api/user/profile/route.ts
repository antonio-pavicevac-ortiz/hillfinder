import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().optional(),
  username: z.string().trim().max(40, "Username is too long").optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email;
    if (!sessionEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = profileSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid profile details" },
        { status: 400 }
      );
    }

    const { name, email, username } = parsed.data;

    // Email is the sign-in identity and the owner key for saved routes, so it
    // can't change without a verified flow.
    if (email && email !== sessionEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "Email changes aren't supported yet." },
        { status: 400 }
      );
    }

    await connectToDB();

    const updated = await User.findOneAndUpdate(
      { email: sessionEmail },
      { name, ...(username !== undefined && { username }) }
    );

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PROFILE_UPDATE_ERROR]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
