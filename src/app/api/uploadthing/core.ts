import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/mongodb";
import User from "@/models/User";
import { createUTApi } from "@/lib/uploads/utapi";
import { getServerSession } from "next-auth";
import {
  createUploadthing,
  UploadThingError,
  type FileRouter,
} from "uploadthing/server";

const f = createUploadthing();

export const uploadRouter = {
  avatarUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    // Only signed-in users may upload; otherwise anyone could use our storage
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "Unauthorized",
        });
      }

      // Ownership is recorded on the User document, so an upload with nowhere to record
      // it (e.g. a Google sign-in without a local account) could never be cleaned up
      await connectToDB();
      const hasAccount = await User.exists({ email: session.user.email });
      if (!hasAccount) {
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "Your account isn't set up for photo uploads yet.",
        });
      }

      return { userEmail: session.user.email };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      // Record ownership server-side: the avatar route only accepts files listed here,
      // and account deletion removes all of them from storage
      await connectToDB();
      const { matchedCount } = await User.updateOne(
        { email: metadata.userEmail },
        { $addToSet: { avatarKeys: file.key } },
      );

      // The account was deleted mid-upload: remove the file rather than orphan it
      if (matchedCount === 0) {
        await createUTApi().deleteFiles(file.key);
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "Account not found.",
        });
      }

      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
