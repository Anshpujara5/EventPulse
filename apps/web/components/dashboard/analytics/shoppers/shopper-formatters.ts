import type { TrendGranularity } from "../analytics-types";

export function formatShopperCount(value: number): string {
  return value.toLocaleString();
}

export function formatShopperDecimal(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatShopperPercent(value: number | null): string {
  return value === null ? "—" : `${formatShopperDecimal(value)}%`;
}

export function formatShopperMoney(value: number, currency: string): string {
  return `${currency} ${formatShopperDecimal(value)}`;
}

export function formatShopperBucket(
  iso: string,
  granularity: TrendGranularity,
): string {
  const date = new Date(iso);

  if (granularity === "hour") {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  if (granularity === "day") {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}
