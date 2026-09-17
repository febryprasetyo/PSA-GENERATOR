import { NextResponse } from "next/server";
import { getBrandConfig } from "@/shared/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getBrandConfig(), {
    headers: { "Cache-Control": "no-store" },
  });
}
