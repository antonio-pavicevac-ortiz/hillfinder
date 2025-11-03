// src/app/api/auth/signup/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getDb } from "@/lib/mongo";

type Body = { email: string; password: string; name?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = (body.email || "").toLowerCase().trim();
    const password = body.password || "";
    const name = body.name || "";

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Invalid email or password (min 8 chars)" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const users = db.collection("users");

    // Check existing
    const exists = await users.findOne({ email });
    if (exists) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashed = await hash(password, 12); // 12 salt rounds

    // Create user document (fields expected by the adapter: at least email)
    const insert = {
      email,
      name,
      password: hashed,
      createdAt: new Date(),
      // any extra profile fields here
    };

    const res = await users.insertOne(insert);

    // Optionally strip password before returning
    return NextResponse.json({ ok: true, id: res.insertedId.toString() });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
