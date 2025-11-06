import mongoose, { Schema, Document, models } from "mongoose";

export interface IRoute extends Document {
  userId: string; // 🧑‍💻 New field: links route to a user
  name: string;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  elevationGain?: number;
  elevationLoss?: number;
  createdAt?: Date;
}

const RouteSchema = new Schema<IRoute>(
  {
    userId: { type: String, required: true }, // 👈 This line right here
    name: { type: String, required: true },
    start: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    end: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    elevationGain: Number,
    elevationLoss: Number,
  },
  { timestamps: true }
);

export default models.Route || mongoose.model<IRoute>("Route", RouteSchema);
