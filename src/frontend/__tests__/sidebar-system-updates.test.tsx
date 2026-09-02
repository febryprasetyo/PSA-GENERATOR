import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/frontend/components/layout/sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/frontend/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "admin" }, logout: vi.fn() }),
}));
vi.mock("@/frontend/hooks/useBrand", () => ({
  useBrand: () => ({ brandColor: "blue", brandName: "MGM", brandIcon: "/icon.png", brandLogo: "/logo.png" }),
}));

describe("Sidebar", () => {
  it("does not show the System Updates patch control", () => {
    render(<Sidebar collapsed={false} setCollapsed={vi.fn()} />);
    expect(screen.queryByText("System Updates")).not.toBeInTheDocument();
  });
});
