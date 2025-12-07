"use client";

import type React from "react";
import { useState } from "react";
import { toast } from "sonner";

export default function ProfileForm({ dbUser }: { dbUser: any }) {
  const [name, setName] = useState(dbUser?.name || "");
  const [email, setEmail] = useState(dbUser?.email || "");
  const [username, setUsername] = useState(dbUser?.username || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  async function saveProfile() {
    setProfileError(null);
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, username }),
    });
    const data = await res.json();
    if (!res.ok) {
      setProfileError(data.error || "Failed to update profile");
      return false;
    }
    return true;
  }

  async function updatePassword() {
    setPasswordError(null);
    const res = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPasswordError(data.error || "Password update failed");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setProfileError(null);
    setPasswordError(null);
    setFieldErrors({});

    const newFieldErrors: {
      name?: string;
      email?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim()) {
      newFieldErrors.name = "Name is required";
    }

    if (!email.trim()) {
      newFieldErrors.email = "Email is required";
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      newFieldErrors.email = "Please enter a valid email address";
    }

    const wantsPasswordChange = currentPassword || newPassword || confirmPassword;

    if (wantsPasswordChange) {
      if (!currentPassword) {
        setPasswordError("Please enter your current password to change it.");
      }
      if (newPassword.length < 12) {
        newFieldErrors.newPassword = "Password must be at least 12 characters long";
      }
      const strictRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

      if (!strictRegex.test(newPassword)) {
        newFieldErrors.newPassword =
          "Password must include uppercase, lowercase, a number, and a special character";
      }
      const forbidden = [
        dbUser?.email?.toLowerCase(),
        dbUser?.username?.toLowerCase(),
        dbUser?.name?.toLowerCase(),
      ];

      if (
        forbidden.some(
          (val) => val && newPassword.toLowerCase().includes(val.replace(/[^a-z0-9]/gi, ""))
        )
      ) {
        newFieldErrors.newPassword = "Password cannot contain your name, username, or email";
      }
      const weakPatterns = ["password", "qwerty", "12345", "abc123", "letmein"];

      if (weakPatterns.some((p) => newPassword.toLowerCase().includes(p.toLowerCase()))) {
        newFieldErrors.newPassword = "Password contains a forbidden weak pattern";
      }
      if (newPassword !== confirmPassword) {
        newFieldErrors.confirmPassword = "New passwords do not match";
      }
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setLoading(false);
      return;
    }

    const profileOK = await saveProfile();

    let passwordOK = true;
    if (wantsPasswordChange) {
      passwordOK = await updatePassword();
    }

    if (profileOK && passwordOK) {
      toast.success("Settings updated successfully!");
      setMessage("Settings updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && <p className="text-sm text-emerald-600 text-center">{message}</p>}
      {profileError && <p className="text-sm text-red-600 text-center">{profileError}</p>}
      {passwordError && <p className="text-sm text-red-600 text-center">{passwordError}</p>}

      {/* FULL NAME */}
      <div>
        <label className="text-sm font-medium text-gray-700">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        {fieldErrors.name && <p className="mt-1 text-md text-red-600">{fieldErrors.name}</p>}
      </div>

      {/* EMAIL */}
      <div>
        <label className="text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        {fieldErrors.email && <p className="mt-1 text-md text-red-600">{fieldErrors.email}</p>}
      </div>

      {/* USERNAME */}
      <div>
        <label className="text-sm font-medium text-gray-700">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* CHANGE PASSWORD */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">Change Password</h3>

        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />

        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        {fieldErrors.newPassword && (
          <p className="mt-1 text-md text-red-600">{fieldErrors.newPassword}</p>
        )}

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        {fieldErrors.confirmPassword && (
          <p className="mt-1 text-md text-red-600">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg transition"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
