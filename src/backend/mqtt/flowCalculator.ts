export function getCalculationSafeFlow(flowSentral: number | null): number {
  if (flowSentral === null) return 0;
  return Math.max(flowSentral, 0);
}
