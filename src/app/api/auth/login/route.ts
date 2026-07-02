import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { users } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken } from "@/backend/auth/jwt";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Update lastLoginAt
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const isViewer = user.role === "viewer";
    const expiresIn = isViewer ? "24h" : "1h";
    const maxAge = isViewer ? 24 * 60 * 60 : 60 * 60; // 24 hours or 1 hour

    const token = await signToken({
      userId: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    }, expiresIn);

    const response = NextResponse.json({
      success: true,
      user: { name: user.name, role: user.role, username: user.username },
    });

    response.cookies.set({
      name: "psa_session",
      value: token,
      httpOnly: true,
      secure: request.url.startsWith("https"),
      sameSite: "lax",
      maxAge: maxAge,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
