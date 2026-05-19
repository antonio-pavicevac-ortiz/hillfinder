"use client";

import AvatarUploader from "@/components/user/AvatarUploader";
import ProfileForm from "@/components/user/ProfileForm";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  username: string;
  image: string | null;
};

export default function ProfilePanel({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setProfileData(data.user);
        else setError("Could not load profile");
      })
      .catch(() => setError("Could not load profile"))
      .finally(() => setLoading(false));
  }, []);

  const avatar = profileData?.image ?? session?.user?.image ?? null;
  const fallbackUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${
    profileData?.username || profileData?.email || "guest"
  }`;
  const src = avatar || fallbackUrl;

  return (
    <div className="fixed inset-0 z-[100] bg-[#f6f7f2] dark:bg-slate-900 overflow-y-auto transition-colors">
      <section className="mx-auto max-w-3xl space-y-8 px-6 pt-4 pb-10 min-h-screen">
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            ← Back to map
          </button>
          <h1 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-slate-100">
            Profile Settings
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Manage your personal details and your Hillfinder identity.
          </p>
        </div>

        {loading && (
          <div className="text-center text-gray-500 dark:text-slate-400 py-12">Loading…</div>
        )}

        {error && <div className="text-center text-red-500 py-12">{error}</div>}

        {profileData && (
          <>
            <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/5 space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100 text-center md:text-left">
                Profile Picture
              </h2>
              <div className="mt-4 flex flex-col items-center md:flex-row md:items-center md:gap-10">
                <div className="h-36 w-36 md:h-40 md:w-40 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center overflow-hidden mb-6 md:mb-0">
                  <img
                    src={src}
                    alt={profileData.name || "Avatar"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 w-full">
                  <AvatarUploader initialAvatar={avatar} />
                  <p className="mt-4 text-xs text-gray-400 dark:text-slate-500 text-center md:text-center">
                    Recommended: square image • JPG, PNG, or WEBP • up to 4MB
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/5 space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
                Account Details
              </h2>
              <ProfileForm dbUser={profileData} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
