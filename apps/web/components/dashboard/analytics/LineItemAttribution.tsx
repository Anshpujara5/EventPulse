import type {
  ItemsCoverage,
  LineRevenueMeasurement,
} from "./analytics-types";
import { formatMoney } from "./sales/sales-formatters";

export function ItemsCoverageNotice({
  coverage,
  includeCategory = false,
}: {
  coverage: ItemsCoverage;
  includeCategory?: boolean;
}) {
  const qualityIssueCount =
    coverage.skippedLines.malformed +
    coverage.skippedLines.missingProductId +
    coverage.skippedLines.invalidQuantity +
    coverage.skippedLines.invalidPrice +
    coverage.skippedLines.invalidCurrency +
    (includeCategory ? coverage.skippedLines.missingCategory : 0);
  const statusLabel =
    coverage.status === "complete"
      ? "Complete coverage"
      : coverage.status === "partial"
        ? "Partial coverage"
        : "Items tracking unavailable";

  return (
    <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-950/45 px-4 py-3 text-xs text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-slate-200">
          {coverage.eligibleConfirmedOrders === 0
            ? "No confirmed orders in this scope"
            : `${coverage.ordersWithUsableItems.toLocaleString()} of ${coverage.eligibleConfirmedOrders.toLocaleString()} confirmed orders have usable items[]`}
        </p>
        <span
          className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
            coverage.status === "complete"
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
              : "border-amber-400/25 bg-amber-500/10 text-amber-200"
          }`}
        >
          {statusLabel}
          {coverage.percentage !== null ? ` · ${coverage.percentage}%` : ""}
        </span>
      </div>
      <p className="mt-2 text-slate-400">
        {includeCategory ? "Category" : "Product"} line revenue uses
        items[].price × quantity. Line totals may differ from order GMV because
        of fees, discounts, and shipping; neither is adjusted.
      </p>
      {qualityIssueCount > 0 && (
        <p className="mt-1 text-amber-200/80">
          {qualityIssueCount.toLocaleString()} incomplete line-item field
          {qualityIssueCount === 1 ? " was" : "s were"} skipped rather than
          estimated.
        </p>
      )}
      {coverage.unlockGuidance && (
        <p className="mt-1 text-amber-100/90">{coverage.unlockGuidance}</p>
      )}
    </div>
  );
}

export function LineRevenueValue({
  lineRevenue,
}: {
  lineRevenue: LineRevenueMeasurement;
}) {
  if (lineRevenue.status === "unavailable") {
    return (
      <p className="text-slate-500" title={lineRevenue.unlockGuidance}>
        Unavailable
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
      {lineRevenue.currencies.map((slice) => (
        <span className="whitespace-nowrap" key={slice.currency}>
          {formatMoney(slice.value, slice.currency)}
        </span>
      ))}
    </div>
  );
}
