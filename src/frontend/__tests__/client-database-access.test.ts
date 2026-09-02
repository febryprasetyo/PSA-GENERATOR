import { describe, expect, it } from "vitest";
import { appRoutes, protectedNavItems } from "@/frontend/lib/routes";

describe("client database access", () => {
  it("shows Database Logger navigation to client accounts", () => {
    const database = protectedNavItems.find((item) => item.href === appRoutes.database);
    expect(database?.roles).toContain("client");
  });
});
