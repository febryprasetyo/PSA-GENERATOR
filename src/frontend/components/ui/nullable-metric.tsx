type Props = {
  value: number | null | undefined;
  digits?: number;
  suffix?: string;
};

export function NullableMetric({ value, digits = 2, suffix = "" }: Props) {
  if (value === null || value === undefined || !Number.isFinite(value)) return <>-</>;
  return <>{value.toFixed(digits)}{suffix ? ` ${suffix}` : ""}</>;
}
