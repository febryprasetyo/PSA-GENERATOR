import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { users } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.payload?.role === "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

  try {
    const body = await request.json();
    let { name, username, password, role, status, clientId } = body;

    if (auth.payload?.role === "operator") {
      role = "client"; // operators cannot change role to anything else
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (role) {
      updateData.role = role;
      if (role === "client") {
        updateData.clientId = clientId;
      } else {
        updateData.clientId = null;
      }
    } else if (clientId !== undefined) {
      updateData.clientId = clientId;
    }
    if (status) updateData.status = status;
    
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // if operator, they can only update client users
    let conditions = eq(users.id, id);
    if (auth.payload?.role === "operator") {
      conditions = and(conditions, eq(users.role, "client")) as any;
    }

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(conditions)
      .returning({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
        status: users.status,
      });

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found or forbidden" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("PUT User Error:", error);
    if (error.code === '23505') { 
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.payload?.role === "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

  // Prevent user from deleting themselves
  if (auth.payload?.userId === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
  }

  try {
    let conditions = eq(users.id, id);
    if (auth.payload?.role === "operator") {
      conditions = and(conditions, eq(users.role, "client")) as any;
    }

    const [deletedUser] = await db.delete(users).where(conditions).returning({ id: users.id });

    if (!deletedUser) {
      return NextResponse.json({ error: "User not found or forbidden" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deletedUser.id });
  } catch (error) {
    console.error("DELETE User Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
