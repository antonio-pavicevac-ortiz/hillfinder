import { Schema, model, models } from "mongoose";

const RoutePointSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    name: { type: String },
  },
  { _id: false }
);

const SavedRouteSegmentSchema = new Schema(
  {
    coords: {
      type: [[Number]],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "uphill"],
      required: true,
    },
  },
  { _id: false }
);

const SavedRouteSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String },
    from: { type: RoutePointSchema, required: true },
    to: { type: RoutePointSchema, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "hard"],
      required: true,
    },
    coords: {
      type: [[Number]],
      required: true,
    },
    elevations: {
      type: [Number],
    },
    segments: {
      type: [SavedRouteSegmentSchema],
    },
    distanceMeters: { type: Number },
    durationSeconds: { type: Number },
    shareEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export default models.SavedRoute || model("SavedRoute", SavedRouteSchema);
