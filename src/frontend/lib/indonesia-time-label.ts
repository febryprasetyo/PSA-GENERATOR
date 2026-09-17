export type IndonesiaTimeZoneLabel = "WIB" | "WITA" | "WIT";

const WITA_PROVINCES = new Set([
  "bali",
  "nusa tenggara barat",
  "ntb",
  "nusa tenggara timur",
  "ntt",
  "kalimantan selatan",
  "kalimantan timur",
  "kalimantan utara",
  "sulawesi utara",
  "gorontalo",
  "sulawesi tengah",
  "sulawesi barat",
  "sulawesi selatan",
  "sulawesi tenggara",
]);

const WIT_PROVINCES = new Set([
  "maluku",
  "maluku utara",
  "papua",
  "papua barat",
  "papua barat daya",
  "papua tengah",
  "papua pegunungan",
  "papua selatan",
]);

export function getIndonesiaTimeZoneLabel(
  province: string | null | undefined,
): IndonesiaTimeZoneLabel {
  const normalizedProvince = province?.trim().toLocaleLowerCase("id-ID") ?? "";
  if (WITA_PROVINCES.has(normalizedProvince)) return "WITA";
  if (WIT_PROVINCES.has(normalizedProvince)) return "WIT";
  return "WIB";
}
