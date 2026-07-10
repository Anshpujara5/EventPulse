"use client";

import { useMemo, useState } from "react";
import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { ProductPerformance, ProductStat } from "./analytics-types";

type SortMode = "views" | "cart" | "conversion" | "units";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "views", label: "Most viewed" },
  { value: "cart", label: "Most added to cart" },
  { value: "conversion", label: "Highest session conversion" },
  { value: "units", label: "Highest units added" },
];

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

function metricValue(product: ProductStat, mode: SortMode): number {
  if (mode === "cart") {
    return product.cartSessions;
  }

  if (mode === "conversion") {
    return product.viewToPurchasePercent ?? -1;
  }

  if (mode === "units") {
    return product.unitsAddedToCart;
  }

  return product.viewSessions;
}

function OpportunityPill({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-white">{count}</p>
    </div>
  );
}

export function ProductPerformanceCard({
  performance,
}: {
  performance: ProductPerformance;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("views");

  const sortedProducts = useMemo(() => {
    return [...performance.products]
      .sort((a, b) => {
        const metricDifference =
          metricValue(b, sortMode) - metricValue(a, sortMode);

        if (metricDifference !== 0) {
          return metricDifference;
        }

        return `${a.projectName}:${a.productName ?? a.productId}`.localeCompare(
          `${b.projectName}:${b.productName ?? b.productId}`,
        );
      })
      .slice(0, 8);
  }, [performance.products, sortMode]);

  const maxMetric = Math.max(
    ...sortedProducts.map((product) => metricValue(product, sortMode)),
    1,
  );
  const hasGmv = performance.products.some(
    (product) => product.gmv !== null && product.currency !== null,
  );

  return (
    <GlowCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
            <Icon className="size-5" name="cube" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-white">
              Product Performance
            </h2>
            <p className="text-xs text-slate-500">
              How product interaction sessions progress to later purchases.
            </p>
          </div>
        </div>

        <div className="flex max-w-full overflow-x-auto rounded-xl border border-slate-700/70 bg-slate-950/50 p-1">
          {SORT_OPTIONS.map((option) => (
            <button
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-black transition ${
                sortMode === option.value
                  ? "bg-cyan-500/15 text-cyan-200"
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
              }`}
              key={option.value}
              onClick={() => setSortMode(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!performance.hasProductData ? (
        <div className="mt-5 flex min-h-56 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/25 px-6 py-8 text-center">
          <p className="max-w-md text-sm text-slate-400">
            No product data yet. Include product_id or productId in your event
            properties to unlock product performance analytics.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <OpportunityPill
              count={performance.highViewLowPurchase.length}
              label="High interest, low session purchase"
            />
            <OpportunityPill
              count={performance.highCartLowPurchase.length}
              label="Added, low session purchase"
            />
          </div>

          {!hasGmv && (
            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
              GMV unavailable. Send product-attributed purchase price, quantity,
              and currency to unlock this metric.
            </div>
          )}

          <div className="mt-4 divide-y divide-slate-800/80">
            {sortedProducts.map((product) => {
              const selectedMetric = metricValue(product, sortMode);
              const barPct =
                selectedMetric < 0
                  ? 0
                  : Math.max((selectedMetric / maxMetric) * 100, 4);
              const label = product.productName ?? product.productId;

              return (
                <div
                  className="py-3"
                  key={`${product.projectId}:${product.productId}`}
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_110px_100px_100px_80px_100px] lg:items-center">
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-black text-slate-100"
                        title={label}
                      >
                        {label}
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                        {product.productId} · {product.projectName}
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between gap-2 text-xs lg:block">
                      <span className="text-slate-500">
                        Sessions that purchased
                      </span>
                      <p className="font-black text-white">
                        {product.sessionsThatPurchased.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex justify-between gap-2 text-xs lg:block">
                      <span className="text-slate-500">
                        Viewed sessions that purchased
                      </span>
                      <p className="font-black text-white">
                        {formatPercent(product.viewToPurchasePercent)}
                      </p>
                    </div>
                    <div className="flex justify-between gap-2 text-xs lg:block">
                      <span className="text-slate-500">
                        Cart sessions that purchased
                      </span>
                      <p className="font-black text-white">
                        {formatPercent(product.cartToPurchasePercent)}
                      </p>
                    </div>
                    <div className="flex justify-between gap-2 text-xs lg:block">
                      <span className="text-slate-500">Units added</span>
                      <p className="font-black text-white">
                        {product.unitsAddedToCart.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex justify-between gap-2 text-xs lg:block">
                      <span className="text-slate-500">GMV</span>
                      <p className="font-black text-white">
                        {product.gmv !== null && product.currency !== null
                          ? formatMoney(product.gmv, product.currency)
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
