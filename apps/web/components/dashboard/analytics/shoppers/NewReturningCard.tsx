"use client";

import { useId, useState } from "react";
import { GlowCard } from "@/components/common/GlowCard";
import type { ShopperLifecycle } from "../analytics-types";
import {
  formatShopperBucket,
  formatShopperCount,
  formatShopperPercent,
} from "./shopper-formatters";

export function NewReturningCard({
  lifecycle,
}: {
  lifecycle: ShopperLifecycle;
}) {
  const [expanded, setExpanded] = useState(false);
  const breakdownId = useId();
  const summary = lifecycle.summary;

  return (
    <GlowCard className="min-w-0 p-5">
      <h2 className="text-lg font-black text-white">New vs Returning</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        How active shoppers relate to activity before the selected period.
      </p>

      {summary.status === "available" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4">
            <p className="text-xs font-bold text-cyan-200">New shoppers</p>
            <p className="mt-2 text-2xl font-black text-white">
              {formatShopperCount(summary.newShoppers)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {formatShopperPercent(summary.newPercent)} of active shoppers
            </p>
          </div>
          <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="text-xs font-bold text-violet-200">
              Returning shoppers
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {formatShopperCount(summary.returningShoppers)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {formatShopperPercent(summary.returningPercent)} of active shoppers
            </p>
          </div>
          <p className="text-xs text-slate-500 sm:col-span-2">
            {formatShopperCount(summary.activeShoppers)} active shoppers in the
            selected period.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/35 p-4">
          <p className="text-sm font-bold text-slate-200">
            Selected-period split unavailable for all time
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {summary.message} The lifecycle breakdown below still shows each
            shopper&apos;s first observed bucket as New and later active buckets
            as Returning.
          </p>
        </div>
      )}

      <button
        aria-controls={breakdownId}
        aria-expanded={expanded}
        className="mt-4 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        {expanded ? "Hide breakdown" : "View breakdown"}
      </button>

      {expanded && (
        <div className="mt-4" id={breakdownId}>
          <p className="text-xs leading-5 text-slate-500">
            New + Returning equals the API-provided Active value in every
            bucket.
          </p>
          {lifecycle.series.points.length === 0 ? (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-6 text-center text-sm text-slate-500">
              No lifecycle activity is available for this scope.
            </div>
          ) : (
            <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[460px] text-left text-xs">
                <thead className="sticky top-0 bg-[#071426] text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 font-bold" scope="col">
                      Bucket
                    </th>
                    <th className="px-3 py-2.5 text-right font-bold" scope="col">
                      New
                    </th>
                    <th className="px-3 py-2.5 text-right font-bold" scope="col">
                      Returning
                    </th>
                    <th className="px-3 py-2.5 text-right font-bold" scope="col">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {lifecycle.series.points.map((point) => (
                    <tr key={point.date}>
                      <th
                        className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-300"
                        scope="row"
                      >
                        {formatShopperBucket(
                          point.date,
                          lifecycle.series.granularity,
                        )}
                      </th>
                      <td className="px-3 py-2.5 text-right font-bold text-cyan-200">
                        {formatShopperCount(point.newShoppers)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-violet-200">
                        {formatShopperCount(point.returningShoppers)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-white">
                        {formatShopperCount(point.activeShoppers)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </GlowCard>
  );
}
