import { NextResponse } from "next/server";
import { verifyToken } from "@/backend/auth/jwt";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("psa_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);

  if (!payload) {
    // Token is expired or invalid
    const response = NextResponse.json({ error: "Session expired" }, { status: 401 });
    response.cookies.delete("psa_session");
    return response;
  }

  return NextResponse.json({
    user: {
      id: payload.userId,
      name: payload.name,
      username: payload.username,
      role: payload.role,
    },
  });
}
