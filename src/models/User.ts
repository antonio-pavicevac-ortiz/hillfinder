import mongoose, { Document, models } from "mongoose";

// 🧩 1️⃣ Define a TypeScript interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 🧱 2️⃣ Define the Mongoose Schema
const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  image: { type: String },
  resetPasswordToken: { type: String }, // ✅ Add this
  resetPasswordExpires: { type: Date }, // ✅ And this
});

// 🔁 3️⃣ Prevent model recompilation in dev mode
const User = models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
