"use client";

import type { UploadRouter } from "@/app/api/uploadthing/core";
import { UploadDropzone } from "@uploadthing/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AvatarUploader({ initialAvatar }: { initialAvatar: string | null }) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar);
  const [saving, setSaving] = useState(false);

  async function saveAvatarToDB(url: string) {
    try {
      setSaving(true);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to save avatar");
        return;
      }

      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      <UploadDropzone<UploadRouter, "avatarUploader">
        endpoint="avatarUploader"
        appearance={{
          //
          // SAFE STYLING — Does not modify internal click targets
          //
          container: [
            "ut-upload-dropzone",
            "w-full rounded-xl border border-dashed border-gray-300",
            "bg-white/90 hover:bg-white transition shadow-sm",
            "flex flex-col items-center justify-center",
            "p-6 md:p-8",
          ].join(" "),

          uploadIcon: [
            "text-gray-400",
            "w-12 h-12",
            "transition-transform duration-300",
            "group-hover:scale-110",
          ].join(" "),

          label: "text-gray-800 font-semibold text-sm md:text-base mt-3 text-center",
          allowedContent: "text-xs text-gray-500 mt-1 text-center",

          // 🌱 Hillfinder green button
          button: [
            "ut-button ut-button",
            "text-white",
            "font-medium",
            "px-4 py-2 rounded-lg",
            "transition",
          ].join(" "),
        }}
        onClientUploadComplete={(res) => {
          console.log("UPLOAD RESULT:", res); // ← ADD THIS

          const url = res?.[0]?.url;
          if (!url) {
            console.warn("No URL returned from UploadThing");
            return;
          }

          console.log("Extracted URL:", url); // ← ADD THIS

          setAvatarUrl(url);
          saveAvatarToDB(url);
        }}
        onUploadError={(err) => alert(`Upload failed: ${err.message}`)}
        className="group" // Enables hover animations
      />

      {saving && <p className="text-sm text-gray-500 mt-2">Saving avatar…</p>}
    </div>
  );
}
