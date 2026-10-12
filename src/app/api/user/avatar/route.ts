import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Avatars must come from our UploadThing storage, not arbitrary hosts
function isUploadThingUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const { protocol, hostname } = new URL(value);
    return (
      protocol === "https:" &&
      (hostname === "utfs.io" || hostname === "ufs.sh" || hostname.endsWith(".ufs.sh"))
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    if (!isUploadThingUrl(url)) {
      return NextResponse.json({ error: "Invalid avatar url" }, { status: 400 });
    }

    await connectToDB();
    await User.findOneAndUpdate({ email: session.user.email }, { image: url });

    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error("[AVATAR_UPDATE_ERROR]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
