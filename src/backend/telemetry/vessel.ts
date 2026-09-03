export function parseNullableMetric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNullableMetricString(value: string | number | null | undefined): { value: string | null; invalid: boolean } {
  if (value === null || value === undefined || value === "") return { value: null, invalid: false };
  return Number.isFinite(Number(value))
    ? { value: String(value), invalid: false }
    : { value: null, invalid: true };
}
