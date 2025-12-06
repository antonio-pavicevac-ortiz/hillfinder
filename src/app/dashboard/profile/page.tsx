import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import AvatarUploader from "@/components/user/AvatarUploader";
import { connectToDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }

  await connectToDB();
  const dbUser = await User.findById(session.user.id).lean();

  const avatar = (dbUser && (dbUser as any).image) || (session.user.image as string | null) || null;

  return (
    <section className="mx-auto max-w-3xl space-y-8 px-6 pt-4 pb-10 ">
      {/* Page Header */}
      <div className="mt-20">
        <h1 className="text-2xl font-semibold text-gray-800">Profile Settings</h1>
        <p className="text-gray-500 text-sm">
          Manage your personal details and your Hillfinder identity.
        </p>
      </div>

      {/* Profile Picture Card */}
      <div className="rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 text-center md:text-left">
          Profile Picture
        </h2>

        <div className="mt-4 flex flex-col items-center md:flex-row md:items-center md:gap-10">
          {/* Avatar Preview */}
          <div className="h-36 w-36 md:h-40 md:w-40 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center overflow-hidden mb-6 md:mb-0">
            {avatar ? (
              <img
                src={avatar}
                alt={session.user.name || "Avatar"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-white text-2xl md:text-3xl font-semibold">
                {(session.user.name || "?").slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          {/* Upload Zone */}
          <div className="flex-1 w-full">
            <AvatarUploader initialAvatar={avatar} />
            <p className="mt-4 text-xs text-gray-400 text-center md:text-center">
              Recommended: square image • JPG, PNG, or WEBP • up to 4MB
            </p>
          </div>
        </div>
      </div>

      {/* Account Information Card ... (unchanged) */}
    </section>
  );
}
