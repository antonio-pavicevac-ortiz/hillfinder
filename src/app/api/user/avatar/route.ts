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

    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    await connectToDB();
    await User.findByIdAndUpdate(session.user.id, { image: url });

    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error("[AVATAR_UPDATE_ERROR]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
