import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongoose";
import SavedRoute from "@/models/SavedRoute";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    await connectToDatabase();

    const route = await SavedRoute.findOne({
      _id: id,
      $or: [{ shareEnabled: true }, { shareEnabled: { $exists: false } }],
    })
      // userId is the owner's email; never expose it on the public share endpoint
      .select("-userId")
      .lean();

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error) {
    console.error("[GET /api/routes/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 });
  }
}
