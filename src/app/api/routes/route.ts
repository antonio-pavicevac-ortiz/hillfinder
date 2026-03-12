import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongoose";
import SavedRoute from "@/models/SavedRoute";

// GET → Fetch recent routes for logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const routes = await SavedRoute.find({
      userId: session.user.email,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({ routes });
  } catch (error) {
    console.error("[GET /api/routes]", error);
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 });
  }
}

// POST → Save route
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();

    const {
      name,
      from,
      to,
      difficulty,
      coords,
      elevations,
      segments,
      distanceMeters,
      durationSeconds,
    } = body;

    if (!from || !to || !difficulty || !coords?.length) {
      return NextResponse.json({ error: "Missing required route fields" }, { status: 400 });
    }

    const savedRoute = await SavedRoute.create({
      userId: session.user.email,
      name: name?.trim() || `${from?.name || "From"} → ${to?.name || "Destination"}`,
      from,
      to,
      difficulty,
      coords,
      elevations,
      segments,
      distanceMeters,
      durationSeconds,
    });

    return NextResponse.json({ route: savedRoute }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/routes]", error);
    return NextResponse.json({ error: "Failed to save route" }, { status: 500 });
  }
}
