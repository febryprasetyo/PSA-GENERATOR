import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AreasPage } from "@/frontend/components/pages/areas-page";

const auth = vi.hoisted(() => ({ role: "admin" }));
vi.mock("@/frontend/hooks/useAuth", () => ({ useAuth: () => ({ user: auth }) }));

describe("AreasPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes("/api/areas")
        ? { areas: [{ id: "a-1", name: "Area 1", description: "Barat", hospitals: [], hospitalCount: 0 }] }
        : { clients: [], pagination: { total: 0 } },
    })));
  });

  it("shows Area metadata actions for admin", async () => {
    auth.role = "admin";
    render(<AreasPage />);
    expect(await screen.findByText("Area 1")).toBeVisible();
    expect(screen.getByRole("button", { name: /tambah area/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /atur anggota/i })).toBeVisible();
  });

  it("lets operator manage members without creating Area", async () => {
    auth.role = "operator";
    render(<AreasPage />);
    expect(await screen.findByRole("button", { name: /atur anggota/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /tambah area/i })).not.toBeInTheDocument();
  });
});
