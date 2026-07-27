import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/history/export/route";
import { requireAuth } from "@/backend/auth/guard";
import { NextRequest } from "next/server";
import { redis } from "@/backend/redis";

vi.mock("@/backend/auth/guard", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/backend/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("@/backend/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([]),
  },
}));

describe("Export API (/api/history/export)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ error: "Unauthorized", status: 401 } as any);

    const req = new NextRequest("http://localhost:3300/api/history/export");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("should return 400 if date range exceeds 90 days (3 months)", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      payload: { role: "admin", id: "u-1" },
    } as any);

    const req = new NextRequest(
      "http://localhost:3300/api/history/export?startDate=2025-01-01&endDate=2025-06-01"
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("3 bulan (90 hari)");
  });

  it("should return 400 if startDate is after endDate", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      payload: { role: "admin", id: "u-1" },
    } as any);

    const req = new NextRequest(
      "http://localhost:3300/api/history/export?startDate=2025-06-01&endDate=2025-01-01"
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Tanggal mulai tidak boleh lebih besar");
  });

  it("should return cached CSV if present in Redis", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      payload: { role: "admin", id: "u-1" },
    } as any);

    vi.mocked(redis.get).mockResolvedValue("\uFEFFHeader,Test\n1,2");

    const req = new NextRequest(
      "http://localhost:3300/api/history/export?startDate=2026-06-01&endDate=2026-07-01"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
  });
});
