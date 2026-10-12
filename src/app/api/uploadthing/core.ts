import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { createUploadthing, UploadThingError, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

export const uploadRouter = {
  avatarUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    // Only signed-in users may upload; otherwise anyone could use our storage
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        throw new UploadThingError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      return { userEmail: session.user.email };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
