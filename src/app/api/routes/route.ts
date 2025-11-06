import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongoose";
import Route from "@/models/Route";

// POST → Save a new route for the logged-in user
export async function POST(req: Request) {
  try {
    // 1️⃣ Get user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Connect to DB
    await connectToDatabase();

    // 3️⃣ Parse request body
    const body = await req.json();

    // 4️⃣ Attach user ID from session (Google ID or email)
    const route = new Route({
      ...body,
      userId: session.user.id || session.user.email, // 👈 store whichever is available
    });

    // 5️⃣ Save the route
    await route.save();

    return NextResponse.json(
      { message: "✅ Route saved successfully", route },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error saving route:", err);
    return NextResponse.json(
      { message: "Error saving route", error: String(err) },
      { status: 500 }
    );
  }
}

// GET → Retrieve routes only for the logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch routes that belong to this user
    const routes = await Route.find({
      userId: session.user.id || session.user.email,
    });

    return NextResponse.json(routes, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching routes:", err);
    return NextResponse.json(
      { message: "Error fetching routes", error: String(err) },
      { status: 500 }
    );
  }
}
