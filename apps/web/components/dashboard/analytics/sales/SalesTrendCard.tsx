import { GlowCard } from "@/components/common/GlowCard";
import type { SalesTrend } from "../analytics-types";
import {
  formatCount,
  formatMoney,
  formatOrderBasis,
  formatTrendLabel,
} from "./sales-formatters";

const CHART_WIDTH = 920;
const CHART_HEIGHT = 240;
const CHART_TOP = 18;
const CHART_BOTTOM = 34;

export function SalesTrendCard({ trend }: { trend: SalesTrend | null }) {
  if (!trend || trend.points.length === 0) {
    return (
      <GlowCard className="min-w-0 p-5">
        <h2 className="text-lg font-black text-white">Sales trend</h2>
        <div className="mt-4 flex min-h-52 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/30 px-4 text-center">
          <p className="text-sm text-slate-500">
            Trend data is unavailable for this scope.
          </p>
        </div>
      </GlowCard>
    );
  }

  const plotHeight = CHART_HEIGHT - CHART_TOP - CHART_BOTTOM;
  const gmvCurrency = trend.gmvCurrency;
  const maxOrders = Math.max(...trend.points.map((point) => point.orders), 1);
  const gmvValues = trend.points.flatMap((point) =>
    point.gmv === null ? [] : [point.gmv],
  );
  const maxGmv = Math.max(...gmvValues, 1);
  const xStep =
    trend.points.length > 1 ? CHART_WIDTH / (trend.points.length - 1) : 0;
  const orderLine = trend.points
    .map((point, index) => {
      const x = trend.points.length === 1 ? CHART_WIDTH / 2 : index * xStep;
      const y = CHART_TOP + plotHeight * (1 - point.orders / maxOrders);
      return `${x},${y}`;
    })
    .join(" ");
  const labelStep = Math.max(1, Math.ceil(trend.points.length / 6));
  const barWidth = Math.max(4, Math.min(22, CHART_WIDTH / trend.points.length / 2));

  return (
    <GlowCard className="min-w-0 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Sales trend</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Orders and GMV use the same time buckets supplied by the API.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-300" />
            Orders · {formatOrderBasis(trend.orderBasis)}
          </span>
          {gmvCurrency && (
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-sm bg-violet-500" />
              GMV · {gmvCurrency}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 max-w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/35 p-3">
        <svg
          aria-label={`Sales trend. Orders are ${formatOrderBasis(trend.orderBasis).toLowerCase()}${gmvCurrency ? `; GMV is shown in ${gmvCurrency}` : "; GMV is unavailable"}.`}
          className="h-64 min-w-[620px] w-full"
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

          {gmvCurrency &&
            trend.points.map((point, index) => {
              if (point.gmv === null) return null;
              const x =
                trend.points.length === 1 ? CHART_WIDTH / 2 : index * xStep;
              const height = Math.max(2, (point.gmv / maxGmv) * plotHeight);
              return (
                <rect
                  fill="rgba(139,92,246,0.42)"
                  height={height}
                  key={point.date}
                  rx="3"
                  width={barWidth}
                  x={x - barWidth / 2}
                  y={CHART_TOP + plotHeight - height}
                >
                  <title>
                    {formatTrendLabel(point.date, trend.granularity)} — {formatMoney(point.gmv, gmvCurrency)} GMV
                  </title>
                </rect>
              );
            })}

          <polyline
            fill="none"
            points={orderLine}
            stroke="#67e8f9"
            strokeLinejoin="round"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
          {trend.points.map((point, index) => {
            const x =
              trend.points.length === 1 ? CHART_WIDTH / 2 : index * xStep;
            const y = CHART_TOP + plotHeight * (1 - point.orders / maxOrders);
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
                  {formatTrendLabel(point.date, trend.granularity)} — {formatCount(point.orders)} orders
                </title>
              </circle>
            );
          })}

          {trend.points.map((point, index) => {
            const isVisible =
              index % labelStep === 0 || index === trend.points.length - 1;
            if (!isVisible) return null;
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
                {formatTrendLabel(point.date, trend.granularity)}
              </text>
            );
          })}
        </svg>
      </div>
    </GlowCard>
  );
}
