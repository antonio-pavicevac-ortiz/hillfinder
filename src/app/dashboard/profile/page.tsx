"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [preview, setPreview] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hillfinder-gradient">
        <p className="text-gray-700 text-lg">You're not logged in.</p>
      </div>
    );
  }

  const user = session.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "👤";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  return (
    <motion.div
      className="min-h-screen bg-hillfinder-gradient flex flex-col items-center pt-24"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md p-8 w-full max-w-md text-center">
        {/* Avatar Section with Upload */}
        <div className="relative">
          <div className="flex justify-center mb-4">
            {preview || user?.image ? (
              <img
                src={preview || user?.image || ""}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-green-600 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-600 shadow-sm text-green-700 font-bold text-xl">
                {initials}
              </div>
            )}
          </div>
          <label className="text-green-700 text-sm cursor-pointer hover:underline">
            Change photo
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Profile Settings</h1>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-800">{user?.name || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-800">{user?.email || "—"}</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-block mt-6 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition"
        >
          Back to Dashboard
        </Link>
      </div>
    </motion.div>
  );
}
