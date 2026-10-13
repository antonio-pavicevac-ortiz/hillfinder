import mongoose, { Document, models } from "mongoose";

// 🧩 1️⃣ Define a TypeScript interface
export interface IUser extends Document {
  name: string;
  email: string;
  // Absent for Google accounts, which never get a password
  password?: string;
  authProvider?: "credentials" | "google";
  googleId?: string;
  image?: string | null;
  avatarKeys?: string[];
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// 🧱 2️⃣ Define the Mongoose Schema
const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  username: { type: String },
  // Credentials accounts always set one; Google accounts have none
  password: { type: String },
  authProvider: { type: String, enum: ["credentials", "google"], default: "credentials" },
  // Google's stable account id ("sub"). Google sign-ins match on this, never on email.
  googleId: { type: String, unique: true, sparse: true },
  image: { type: String, default: null },
  // Every UploadThing file this user uploaded, so all of them can be deleted with the account
  avatarKeys: { type: [String], default: [] },
  resetPasswordToken: { type: String, default: null }, // ✅ Add this
  resetPasswordExpires: { type: Date, default: null }, // ✅ And this
});

// 🔁 3️⃣ Prevent model recompilation in dev mode
const User = models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
