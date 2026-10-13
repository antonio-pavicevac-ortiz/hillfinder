import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/mongodb";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { uploadThingKey } from "@/lib/uploads/uploadThingFiles";
import AccountDeletion, { hashEmail } from "@/models/AccountDeletion";
import SavedRoute from "@/models/SavedRoute";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

const DELETE_CONFIRMATION = "DELETE";
const DELETION_INCOMPLETE = "Account deletion didn’t finish; please retry.";

// DELETE → Permanently delete the signed-in user's account and data
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !rateLimit(
        `delete-account:${clientIp(req.headers)}`,
        5,
        15 * 60 * 1000,
      ) ||
      !rateLimit(`delete-account:${email}`, 5, 15 * 60 * 1000)
    ) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }

    const { confirmation, password } = await req.json().catch(() => ({}));
    if (confirmation !== DELETE_CONFIRMATION) {
      return NextResponse.json(
        { error: `Type ${DELETE_CONFIRMATION} to confirm.` },
        { status: 400 },
      );
    }

    await connectToDB();

    // Google-only accounts may have no User record; their saved routes are still keyed by email
    const user = await User.findOne({ email });

    if (user?.password) {
      const valid =
        typeof password === "string" &&
        (await bcrypt.compare(password, user.password));
      if (!valid) {
        return NextResponse.json(
          { error: "Incorrect password." },
          { status: 400 },
        );
      }
    }

    // Delete stored photos first. If storage cleanup fails, stop before touching any data
    // so the user can retry instead of being told it worked while photos remain.
    const ownedKeys: string[] = [...(user?.avatarKeys ?? [])];
    const currentKey = uploadThingKey(user?.image);
    const fileKeys = [
      ...new Set([...ownedKeys, ...(currentKey ? [currentKey] : [])]),
    ];
    if (fileKeys.length) {
      let deleted = false;
      try {
        deleted = (await new UTApi().deleteFiles(fileKeys)).success;
      } catch (err) {
        console.error("[DELETE_ACCOUNT_AVATAR_ERROR]", err);
      }
      if (!deleted) {
        return NextResponse.json(
          {
            error: DELETION_INCOMPLETE,
          },
          { status: 502 },
        );
      }
    }

    // Upserting inside a transaction needs the collection and its indexes to exist first
    await AccountDeletion.init();

    // Data removal and session revocation commit together, so a failure can't leave
    // the data gone while old sessions on other devices stay valid
    const deleted = await mongoose.connection.transaction(async (session) => {
      if (user) {
        // Only delete the user if no upload landed after the photos were cleaned up;
        // otherwise that file would be orphaned
        const { deletedCount } = await User.deleteOne(
          {
            _id: user._id,
            ...(ownedKeys.length
              ? { avatarKeys: ownedKeys }
              : {
                  $or: [
                    { avatarKeys: { $exists: false } },
                    { avatarKeys: { $size: 0 } },
                  ],
                }),
          },
          { session },
        );
        if (deletedCount === 0) return false;
      }

      await SavedRoute.deleteMany({ userId: email }, { session });

      // Invalidate every existing session for this email, including other devices
      await AccountDeletion.updateOne(
        { emailHash: hashEmail(email) },
        { $set: { deletedAt: new Date() } },
        { upsert: true, session },
      );
      return true;
    });

    if (!deleted) {
      return NextResponse.json(
        {
          error: DELETION_INCOMPLETE,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE_ACCOUNT_ERROR]", err);
    return NextResponse.json({ error: DELETION_INCOMPLETE }, { status: 500 });
  }
}
