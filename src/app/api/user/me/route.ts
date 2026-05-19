import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    const email = session.user.email;
    let dbUser: any = null;

    if (email) {
      dbUser = await User.findOne({ email }).lean();
    } else {
      const id = (session.user as any).id;
      if (typeof id === "string" && /^[a-f\d]{24}$/i.test(id)) {
        dbUser = await User.findById(id).lean();
      }
    }

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: dbUser._id?.toString(),
        name: dbUser.name || "",
        email: dbUser.email || "",
        username: dbUser.username || "",
        image: dbUser.image || null,
      },
    });
  } catch (err) {
    console.error("[USER_ME_ERROR]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
