import type {
  SalesOrderCountBasis,
  TrendGranularity,
} from "../analytics-types";

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function formatNumber(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export function formatMoney(value: number, currency: string): string {
  return `${currency} ${formatNumber(value)}`;
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${formatNumber(value)}%`;
}

export function formatOrderBasis(basis: SalesOrderCountBasis): string {
  return basis === "distinct-order-id"
    ? "Basis: distinct-order-id"
    : "Basis: purchasing-session-estimate · Approximated by purchasing sessions";
}

export function formatTrendLabel(
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
