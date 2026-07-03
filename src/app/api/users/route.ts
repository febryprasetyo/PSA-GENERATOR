import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { users, masterHospitals } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/backend/auth/guard";
import bcrypt from "bcryptjs";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.payload?.role === "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let query = db.select({
      id: users.id,
      clientId: users.clientId,
      hospitalName: masterHospitals.hospitalName,
      name: users.name,
      username: users.username,
      role: users.role,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(masterHospitals, eq(users.clientId, masterHospitals.id));

    if (auth.payload?.role === "operator") {
      query = query.where(eq(users.role, "client")) as typeof query;
    }

    const allUsers = await query;
    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error("GET Users Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.payload?.role === "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, username, password, clientId } = body;
    let { role } = body;

    // Operator can only create client users
    if (auth.payload?.role === "operator") {
      role = "client";
    }

    if (!name || !username || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [newUser] = await db.insert(users).values({
      name,
      username,
      passwordHash,
      role,
      clientId: role === "client" ? clientId : null,
      status: "active",
    }).returning({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      status: users.status,
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST User Error:", error);
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') { 
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
