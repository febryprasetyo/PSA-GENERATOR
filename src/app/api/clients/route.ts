import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { masterHospitals } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";

import { count, or, ilike, desc, asc } from "drizzle-orm";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "hospitalName";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    const offset = (page - 1) * limit;

    let baseQuery = db.select({
      id: masterHospitals.id,
      hospitalName: masterHospitals.hospitalName,
      province: masterHospitals.province,
      city: masterHospitals.city,
      address: masterHospitals.address,
      owner: masterHospitals.owner,
      kelas: masterHospitals.kelas,
    }).from(masterHospitals);

    let whereClause = undefined;
    if (search) {
      whereClause = or(
        ilike(masterHospitals.hospitalName, `%${search}%`),
        ilike(masterHospitals.province, `%${search}%`),
        ilike(masterHospitals.city, `%${search}%`)
      );
    }

    if (whereClause) {
      baseQuery = baseQuery.where(whereClause) as typeof baseQuery;
    }

    let orderByClause;
    if (sortBy === "hospitalName") orderByClause = sortOrder === "desc" ? desc(masterHospitals.hospitalName) : asc(masterHospitals.hospitalName);
    else if (sortBy === "province") orderByClause = sortOrder === "desc" ? desc(masterHospitals.province) : asc(masterHospitals.province);
    else if (sortBy === "city") orderByClause = sortOrder === "desc" ? desc(masterHospitals.city) : asc(masterHospitals.city);
    else if (sortBy === "kelas") orderByClause = sortOrder === "desc" ? desc(masterHospitals.kelas) : asc(masterHospitals.kelas);
    else orderByClause = asc(masterHospitals.hospitalName);

    baseQuery = baseQuery.orderBy(orderByClause).limit(limit).offset(offset) as typeof baseQuery;

    const data = await baseQuery;

    // Get total count
    const totalQuery = db.select({ value: count() }).from(masterHospitals);
    if (whereClause) {
      totalQuery.where(whereClause);
    }
    const [totalResult] = await totalQuery;
    const total = totalResult.value;

    return NextResponse.json({ 
      clients: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("GET Hospitals Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.payload?.role !== "admin" && auth.payload?.role !== "operator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { hospitalName, province, city, address, owner, kelas } = body;

    if (!hospitalName) {
      return NextResponse.json({ error: "Nama Rumah Sakit wajib diisi" }, { status: 400 });
    }

    const [newHospital] = await db.insert(masterHospitals).values({
      hospitalName,
      province,
      city,
      address,
      owner,
      kelas,
    }).returning();

    return NextResponse.json({ client: newHospital }, { status: 201 });
  } catch (error) {
    console.error("POST Client Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
