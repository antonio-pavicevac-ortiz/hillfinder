import mongoose, { Schema, Document, models } from "mongoose";

// 🧩 1️⃣ Define a TypeScript interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 🧱 2️⃣ Define the Mongoose Schema
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

// 🔁 3️⃣ Prevent model recompilation in dev mode
const User = models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
