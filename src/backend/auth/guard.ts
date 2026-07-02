import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("psa_session")?.value;

  if (!token) {
    return { error: "Unauthorized", status: 401 };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { error: "Invalid or expired session", status: 401 };
  }

  if (payload.role !== "admin") {
    return { error: "Forbidden: Admin access required", status: 403 };
  }

  return { payload };
}

export async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("psa_session")?.value;

  if (!token) {
    return { error: "Unauthorized", status: 401 };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { error: "Invalid or expired session", status: 401 };
  }

  return { payload };
}
