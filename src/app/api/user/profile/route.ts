import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, username } = await req.json();

    await connectToDB();

    await User.findByIdAndUpdate(session.user.id, {
      name,
      email,
      username,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PROFILE_UPDATE_ERROR]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
