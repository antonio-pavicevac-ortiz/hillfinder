import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/mongodb";
import { uploadThingKey } from "@/lib/uploads/uploadThingFiles";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    const key = uploadThingKey(url);
    if (!key) {
      return NextResponse.json(
        { error: "Invalid avatar url" },
        { status: 400 },
      );
    }

    await connectToDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only accept files this user uploaded (recorded by the upload handler)
    const ownedKeys: string[] = user.avatarKeys ?? [];
    if (!ownedKeys.includes(key)) {
      return NextResponse.json(
        { error: "Invalid avatar url" },
        { status: 400 },
      );
    }

    user.image = url;
    await user.save();

    // Remove replaced avatars from storage. Any that fail stay in avatarKeys and are
    // retried when the account is deleted.
    const staleKeys = ownedKeys.filter((k) => k !== key);
    if (staleKeys.length) {
      try {
        const result = await new UTApi().deleteFiles(staleKeys);
        if (result.success) {
          await User.updateOne(
            { _id: user._id },
            { $pull: { avatarKeys: { $in: staleKeys } } },
          );
        }
      } catch (err) {
        console.error("[AVATAR_CLEANUP_ERROR]", err);
      }
    }

    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error("[AVATAR_UPDATE_ERROR]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
