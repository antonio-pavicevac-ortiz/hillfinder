import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongoose";
import SavedRoute from "@/models/SavedRoute";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await connectToDatabase();

    const route = await SavedRoute.findOne({
      _id: id,
      $or: [{ shareEnabled: true }, { shareEnabled: { $exists: false } }],
    }).lean();

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error) {
    console.error("[GET /api/routes/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 });
  }
}
