import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  GOOGLE_LINK_COOKIE,
  GOOGLE_LINK_MAX_AGE_SECONDS,
  createGoogleLinkIntent,
} from "@/lib/auth/googleLink";
import { connectToDB } from "@/lib/mongodb";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const WINDOW_MS = 15 * 60 * 1000;

async function signedInUser(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  if (
    !rateLimit(`google-link:${clientIp(req.headers)}`, 10, WINDOW_MS) ||
    !rateLimit(`google-link:${email}`, 10, WINDOW_MS)
  ) {
    return {
      response: NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 }),
    };
  }

  await connectToDB();
  const user = await User.findOne({ email })
    .select("_id password googleId")
    .lean<{ _id: unknown; password?: string; googleId?: string | null }>();
  if (!user) return { response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  return { user };
}

// POST → Start connecting Google; the client then runs Google sign-in to finish
export async function POST(req: Request) {
  try {
    const { user, response } = await signedInUser(req);
    if (!user) return response;

    if (user.googleId) {
      return NextResponse.json({ error: "Google is already connected." }, { status: 409 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(GOOGLE_LINK_COOKIE, createGoogleLinkIntent(String(user._id)), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // Only the NextAuth callback needs it
      path: "/api/auth",
      maxAge: GOOGLE_LINK_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("[GOOGLE_LINK_ERROR]", err);
    return NextResponse.json({ error: "Couldn't connect Google. Please try again." }, { status: 500 });
  }
}

// DELETE → Disconnect Google, only when a password remains to sign in with
export async function DELETE(req: Request) {
  try {
    const { user, response } = await signedInUser(req);
    if (!user) return response;

    if (!user.password) {
      return NextResponse.json(
        { error: "Google is how you sign in to this account, so it can't be disconnected." },
        { status: 400 }
      );
    }

    await User.updateOne({ _id: user._id }, { $unset: { googleId: "" } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[GOOGLE_UNLINK_ERROR]", err);
    return NextResponse.json({ error: "Couldn't disconnect Google. Please try again." }, { status: 500 });
  }
}
