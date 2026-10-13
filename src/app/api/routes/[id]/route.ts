import { NextResponse } from "next/server";

import { getSharedRoute } from "@/lib/routes/sharedRoute";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const route = await getSharedRoute(id);

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error) {
    console.error("[GET /api/routes/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 });
  }
}
