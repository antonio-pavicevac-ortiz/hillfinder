import { connectToDatabase } from "@/lib/mongoose";
import SavedRoute from "@/models/SavedRoute";
import { isValidObjectId } from "mongoose";

// A saved route as anyone with its link may see it. Read directly from this deployment's
// database rather than over HTTP, so pages never depend on another deployment's API.
export async function getSharedRoute(id: string) {
  if (!isValidObjectId(id)) return null;

  await connectToDatabase();

  const route = await SavedRoute.findOne({
    _id: id,
    $or: [{ shareEnabled: true }, { shareEnabled: { $exists: false } }],
  })
    // userId is the owner's email; never expose it on public share surfaces
    .select("-userId")
    .lean();

  // Plain JSON (ObjectIds and Dates as strings), the same shape the API returns
  return route ? JSON.parse(JSON.stringify(route)) : null;
}
