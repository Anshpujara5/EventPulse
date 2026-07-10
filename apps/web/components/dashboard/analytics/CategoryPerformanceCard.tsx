import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { CategoryStat } from "./analytics-types";

function formatPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${Math.min(value, 100).toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function CategoryPerformanceCard({
  categories,
}: {
  categories: CategoryStat[];
}) {
  const maxActivity = Math.max(
    ...categories.map(
      (category) =>
        category.viewSessions +
        category.cartSessions +
        category.sessionsThatPurchased,
    ),
    1,
  );
  const hasGmv = categories.some(
    (category) => category.gmv !== null && category.currency !== null,
  );

  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-300">
          <Icon className="size-5" name="chart" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white">
            Category Performance
          </h2>
          <p className="text-xs text-slate-500">
            How category interaction sessions progress to later purchases.
          </p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="mt-5 flex min-h-56 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/25 px-6 py-8 text-center">
          <p className="max-w-sm text-sm text-slate-400">
            No category data yet. Send category in product event properties to
            compare product groups.
          </p>
        </div>
      ) : (
        <>
          {!hasGmv && (
            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
              GMV unavailable. Send category and product-attributed purchase
              price, quantity, and currency to unlock this metric.
            </div>
          )}

          <div className="mt-4 divide-y divide-slate-800/80">
            {categories.map((category) => {
              const totalActivity =
                category.viewSessions +
                category.cartSessions +
                category.sessionsThatPurchased;
              const barPct = Math.max((totalActivity / maxActivity) * 100, 4);

              return (
                <div
                  className="py-3"
                  key={`${category.projectId}:${category.category}`}
                >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-black text-slate-100"
                      title={category.category}
                    >
                      {category.category}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      {category.projectName}
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[11px] text-slate-500">
                      Viewed sessions that purchased
                    </span>
                    <p className="text-sm font-black text-white">
                      {formatPercent(category.viewToPurchasePercent)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-slate-500">Views</span>
                    <p className="font-black text-white">
                      {category.viewSessions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Cart</span>
                    <p className="font-black text-white">
                      {category.cartSessions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">
                      Sessions that purchased
                    </span>
                    <p className="font-black text-white">
                      {category.sessionsThatPurchased.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">
                      Cart sessions that purchased
                    </span>
                    <p className="font-black text-white">
                      {formatPercent(category.cartToPurchasePercent)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Units</span>
                    <p className="font-black text-white">
                      {category.unitsAddedToCart.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">GMV</span>
                    <p className="font-black text-white">
                      {category.gmv !== null && category.currency !== null
                        ? formatMoney(category.gmv, category.currency)
                        : "Unavailable"}
                    </p>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </>
      )}
    </GlowCard>
  );
}
