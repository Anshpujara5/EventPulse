import type { SalesTabData } from "../analytics-types";
import { SalesComparisonCard } from "../sales/SalesComparisonCard";
import { SalesCurrencyBreakdown } from "../sales/SalesCurrencyBreakdown";
import { SalesDataQualityCard } from "../sales/SalesDataQualityCard";
import { SalesHeadlineCards } from "../sales/SalesHeadlineCards";
import { SalesInsightsCard } from "../sales/SalesInsightsCard";
import { SalesTrendCard } from "../sales/SalesTrendCard";

const REQUIRED_FIELDS = ["order_id", "amount", "currency"] as const;

export function SalesTab({ data }: { data: SalesTabData }) {
  const noPurchaseEvents = data.dataQuality.purchaseEvents === 0;

  return (
    <div className="mt-5 min-w-0 space-y-4">
      <section
        aria-labelledby="sales-performance-heading"
        className="min-w-0 rounded-2xl border border-slate-800/80 bg-slate-950/25 px-4 py-4 sm:px-5"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2
              className="text-lg font-black text-white"
              id="sales-performance-heading"
            >
              Sales performance
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              Confirmed Orders use distinct order_id values. GMV and AOV include
              only confirmed orders with valid tracked money fields.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2" aria-label="Required sales tracking fields">
            {REQUIRED_FIELDS.map((field) => (
              <code
                className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-2.5 py-1 font-mono text-[11px] text-cyan-100"
                key={field}
              >
                {field}
              </code>
            ))}
          </div>
        </div>

        {noPurchaseEvents && (
          <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/45 px-4 py-3">
            <p className="text-sm font-bold text-slate-200">
              No purchase events in this scope.
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {data.orders.status === "confirmed"
                ? "Exact order tracking is configured; confirmed Orders are measured as zero for this range."
                : data.orders.unlockGuidance}
            </p>
          </div>
        )}
      </section>

      <SalesHeadlineCards data={data} />
      <SalesTrendCard trend={data.trend} />
      <SalesCurrencyBreakdown money={data.money} />
      <SalesComparisonCard comparison={data.comparison} />

      <div className={`grid min-w-0 gap-4 ${data.insights.length > 0 ? "xl:grid-cols-[0.8fr_1.2fr]" : ""}`}>
        <SalesInsightsCard insights={data.insights} />
        <SalesDataQualityCard quality={data.dataQuality} />
      </div>
    </div>
  );
}
