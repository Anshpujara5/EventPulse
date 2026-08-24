import { GlowCard } from "@/components/common/GlowCard";
import type { ShopperTrend } from "../analytics-types";
import {
  formatShopperBucket,
  formatShopperCount,
} from "./shopper-formatters";

const CHART_WIDTH = 920;
const CHART_HEIGHT = 220;
const CHART_TOP = 18;
const CHART_BOTTOM = 34;

export function ShopperTrendCard({ trend }: { trend: ShopperTrend }) {
  if (trend.points.length === 0) {
    return (
      <GlowCard className="min-w-0 p-5">
        <h2 className="text-lg font-black text-white">Active Shoppers Trend</h2>
        <div className="mt-4 flex min-h-52 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/30 px-4 text-center">
          <p className="text-sm text-slate-500">
            No shopper activity is available for this scope.
          </p>
        </div>
      </GlowCard>
    );
  }

  const plotHeight = CHART_HEIGHT - CHART_TOP - CHART_BOTTOM;
  const maxShoppers = Math.max(
    ...trend.points.map((point) => point.shoppers),
    1,
  );
  const xStep =
    trend.points.length > 1 ? CHART_WIDTH / (trend.points.length - 1) : 0;
  const line = trend.points
    .map((point, index) => {
      const x = trend.points.length === 1 ? CHART_WIDTH / 2 : index * xStep;
      const y = CHART_TOP + plotHeight * (1 - point.shoppers / maxShoppers);
      return `${x},${y}`;
    })
    .join(" ");
  const labelStep = Math.max(1, Math.ceil(trend.points.length / 6));

  return (
    <GlowCard className="min-w-0 p-5">
      <div>
        <h2 className="text-lg font-black text-white">Active Shoppers Trend</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Distinct project-scoped shoppers active in each API-provided bucket.
        </p>
      </div>

      <div className="mt-5 max-w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/35 p-3">
        <svg
          aria-label="Active shoppers by time bucket. Straight lines connect the measured bucket values without smoothing."
          className="h-60 min-w-[620px] w-full"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          {[0, 0.33, 0.66, 1].map((ratio) => {
            const y = CHART_TOP + plotHeight * ratio;
            return (
              <line
                key={ratio}
                stroke="rgba(71,85,105,0.35)"
                strokeDasharray="4 6"
                x1="0"
                x2={CHART_WIDTH}
                y1={y}
                y2={y}
              />
            );
          })}

          <polyline
            fill="none"
            points={line}
            stroke="#67e8f9"
            strokeLinejoin="round"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />

          {trend.points.map((point, index) => {
            const x =
              trend.points.length === 1 ? CHART_WIDTH / 2 : index * xStep;
            const y =
              CHART_TOP + plotHeight * (1 - point.shoppers / maxShoppers);
            return (
              <circle
                cx={x}
                cy={y}
                fill="#071426"
                key={point.date}
                r="4"
                stroke="#67e8f9"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              >
                <title>
                  {formatShopperBucket(point.date, trend.granularity)} — {formatShopperCount(point.shoppers)} active shoppers
                </title>
              </circle>
            );
          })}

          {trend.points.map((point, index) => {
            const visible =
              index % labelStep === 0 || index === trend.points.length - 1;
            if (!visible) return null;
            const x =
              trend.points.length === 1 ? CHART_WIDTH / 2 : index * xStep;
            return (
              <text
                fill="#64748b"
                fontSize="12"
                key={`${point.date}-label`}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === trend.points.length - 1
                      ? "end"
                      : "middle"
                }
                x={x}
                y={CHART_HEIGHT - 8}
              >
                {formatShopperBucket(point.date, trend.granularity)}
              </text>
            );
          })}
        </svg>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        A shopper active in multiple buckets can appear in multiple points;
        bucket values are not meant to sum to the selected-range unique shopper
        total.
      </p>
    </GlowCard>
  );
}
