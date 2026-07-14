export function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}

export function percentOrNull(
  numerator: number,
  denominator: number,
): number | null {
  return denominator > 0 ? roundPct((numerator / denominator) * 100) : null;
}

export function percentageOfTotal(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
}

export function toCount(value: bigint | null | undefined): number {
  return Number(value ?? 0);
}
