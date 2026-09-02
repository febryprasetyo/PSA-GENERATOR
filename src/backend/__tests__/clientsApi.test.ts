import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/clients/route";
import { requireAuth } from "@/backend/auth/guard";
import { db } from "@/backend/db";

vi.mock("@/backend/auth/guard", () => ({ requireAuth: vi.fn() }));
vi.mock("@/backend/db", () => ({ db: { insert: vi.fn() } }));

describe("POST /api/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ payload: { id: "u-1", role: "operator" } } as never);
  });

  it("rejects a whitespace-only hospital name", async () => {
    const response = await POST(new Request("http://localhost/api/clients", { method: "POST", body: JSON.stringify({ hospitalName: "   " }) }));
    expect(response.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("trims the hospital name before insert", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "h-1", hospitalName: "RS Test" }]);
    const values = vi.fn().mockReturnValue({ returning });
    vi.mocked(db.insert).mockReturnValue({ values } as never);
    const response = await POST(new Request("http://localhost/api/clients", { method: "POST", body: JSON.stringify({ hospitalName: "  RS Test  " }) }));
    expect(response.status).toBe(201);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ hospitalName: "RS Test" }));
  });
});
