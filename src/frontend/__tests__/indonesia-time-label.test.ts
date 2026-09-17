import { describe, expect, it } from "vitest";
import { getIndonesiaTimeZoneLabel } from "@/frontend/lib/indonesia-time-label";

describe("getIndonesiaTimeZoneLabel", () => {
  it.each([
    ["DKI Jakarta", "WIB"],
    ["Bali", "WITA"],
    ["Nusa Tenggara Timur", "WITA"],
    ["Papua", "WIT"],
    ["Papua Barat Daya", "WIT"],
  ])("memetakan %s ke %s", (province, expected) => {
    expect(getIndonesiaTimeZoneLabel(province)).toBe(expected);
  });

  it("menggunakan WIB jika provinsi kosong atau tidak dikenali", () => {
    expect(getIndonesiaTimeZoneLabel(null)).toBe("WIB");
    expect(getIndonesiaTimeZoneLabel("Provinsi Baru")).toBe("WIB");
  });
});
