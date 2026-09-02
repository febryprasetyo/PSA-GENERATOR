import { describe, expect, it } from "vitest";
import { resolveHospitalScope } from "@/backend/auth/client-scope";

describe("client hospital scope", () => {
  it("forces a client to its assigned hospital even when another hospital is requested", () => {
    expect(resolveHospitalScope("client", "hospital-cepoko", "hospital-other"))
      .toEqual({ hospitalId: "hospital-cepoko", allowed: true });
  });

  it("denies a client session without an assigned hospital", () => {
    expect(resolveHospitalScope("client", undefined, "hospital-other"))
      .toEqual({ hospitalId: null, allowed: false });
  });

  it("allows an operator to use the requested hospital filter", () => {
    expect(resolveHospitalScope("operator", undefined, "hospital-other"))
      .toEqual({ hospitalId: "hospital-other", allowed: true });
  });
});
