import mongoose, { Document, models } from "mongoose";

// 🧩 1️⃣ Define a TypeScript interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
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
  password: { type: String, required: true },
  image: { type: String, default: null },
  // Every UploadThing file this user uploaded, so all of them can be deleted with the account
  avatarKeys: { type: [String], default: [] },
  resetPasswordToken: { type: String, default: null }, // ✅ Add this
  resetPasswordExpires: { type: Date, default: null }, // ✅ And this
});

// 🔁 3️⃣ Prevent model recompilation in dev mode
const User = models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
