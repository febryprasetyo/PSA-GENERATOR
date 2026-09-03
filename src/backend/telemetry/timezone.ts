export type IndonesianTimeZone = "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura";

export type LocalDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

const WIB_PROVINCES = new Set([
  "aceh", "di aceh", "sumatera utara", "sumatera barat", "riau", "kepulauan riau",
  "jambi", "bengkulu", "sumatera selatan", "kepulauan bangka belitung", "bangka belitung",
  "lampung", "banten", "dki jakarta", "jakarta", "jawa barat", "jawa tengah",
  "di yogyakarta", "daerah istimewa yogyakarta", "yogyakarta", "jawa timur",
  "kalimantan barat", "kalimantan tengah",
]);

const WITA_PROVINCES = new Set([
  "kalimantan selatan", "kalimantan timur", "kalimantan utara", "bali",
  "nusa tenggara barat", "ntb", "nusa tenggara timur", "ntt", "sulawesi utara",
  "gorontalo", "sulawesi tengah", "sulawesi barat", "sulawesi selatan", "sulawesi tenggara",
]);

const WIT_PROVINCES = new Set([
  "maluku", "maluku utara", "papua", "papua barat", "papua barat daya", "papua selatan",
  "papua tengah", "papua pegunungan",
]);

const OFFSET_MINUTES: Record<IndonesianTimeZone, number> = {
  "Asia/Jakarta": 7 * 60,
  "Asia/Makassar": 8 * 60,
  "Asia/Jayapura": 9 * 60,
};

function normalizeProvince(province: string | null | undefined): string {
  return (province || "").toLocaleLowerCase("id-ID").replace(/\./g, "").replace(/\s+/g, " ").trim();
}

export function resolveHospitalTimeZone(province: string | null | undefined): { timeZone: IndonesianTimeZone; usedFallback: boolean } {
  const normalized = normalizeProvince(province);
  if (WIB_PROVINCES.has(normalized)) return { timeZone: "Asia/Jakarta", usedFallback: false };
  if (WITA_PROVINCES.has(normalized)) return { timeZone: "Asia/Makassar", usedFallback: false };
  if (WIT_PROVINCES.has(normalized)) return { timeZone: "Asia/Jayapura", usedFallback: false };
  return { timeZone: "Asia/Jakarta", usedFallback: true };
}

const OFFSET_FREE_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/;
const OFFSET_AWARE_TIMESTAMP = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export function parseMachineTimestamp(
  value: unknown,
  timeZone: IndonesianTimeZone,
  receivedAt: Date,
): { date: Date; source: "machine" | "received"; driftMs: number | null } {
  let parsed: Date | null = null;

  if (value instanceof Date || typeof value === "number") {
    const candidate = new Date(value);
    if (Number.isFinite(candidate.getTime())) parsed = candidate;
  } else if (typeof value === "string" && OFFSET_AWARE_TIMESTAMP.test(value.trim())) {
    const candidate = new Date(value.trim());
    if (Number.isFinite(candidate.getTime())) parsed = candidate;
  } else if (typeof value === "string") {
    const match = OFFSET_FREE_TIMESTAMP.exec(value.trim());
    if (match) {
      const [, yearText, monthText, dayText, hourText, minuteText, secondText, millisecondText = "0"] = match;
      const year = Number(yearText);
      const month = Number(monthText);
      const day = Number(dayText);
      const hour = Number(hourText);
      const minute = Number(minuteText);
      const second = Number(secondText);
      const millisecond = Number(millisecondText.padEnd(3, "0"));
      const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
      const validation = new Date(wallClockUtc);
      const valid = validation.getUTCFullYear() === year
        && validation.getUTCMonth() === month - 1
        && validation.getUTCDate() === day
        && validation.getUTCHours() === hour
        && validation.getUTCMinutes() === minute
        && validation.getUTCSeconds() === second;
      if (valid) parsed = new Date(wallClockUtc - OFFSET_MINUTES[timeZone] * 60_000);
    }
  }

  if (!parsed) return { date: receivedAt, source: "received", driftMs: null };
  return { date: parsed, source: "machine", driftMs: Math.abs(parsed.getTime() - receivedAt.getTime()) };
}

export function getLocalDateParts(value: Date, timeZone: IndonesianTimeZone): LocalDateParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
    millisecond: value.getUTCMilliseconds(),
  };
}

export function formatHospitalTimestamp(value: Date | string | number, timeZone: IndonesianTimeZone): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  const parts = getLocalDateParts(date, timeZone);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}
