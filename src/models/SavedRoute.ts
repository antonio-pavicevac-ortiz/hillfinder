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
    navSteps: {
      type: [new Schema({
        index: { type: Number, required: true },
        instruction: { type: String, required: true },
        distance: { type: Number, required: true },
        duration: { type: Number, required: true },
        location: { type: [Number], required: true },
        maneuver: { type: new Schema({
          lng: { type: Number, required: true },
          lat: { type: Number, required: true },
          type: { type: String },
          modifier: String,
        }, { _id: false }), required: true },
        spokenAdvance: { type: Boolean, default: false },
        spokenFinal: { type: Boolean, default: false },
        completed: { type: Boolean, default: false },
        terrainHint: String,
      }, { _id: false })],
      default: [],
    },
    shareEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const SavedRoute = models.SavedRoute || model("SavedRoute", SavedRouteSchema);
// Next's hot reload can retain the older compiled model within this process.
if (!SavedRoute.schema.path("navSteps")) {
  SavedRoute.schema.add({ navSteps: SavedRouteSchema.obj.navSteps });
}
export default SavedRoute;
