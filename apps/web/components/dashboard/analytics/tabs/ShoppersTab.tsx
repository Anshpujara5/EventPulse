import type { ShopperSummary } from "../analytics-types";
import { ShopperKpiRow } from "../ShopperKpiRow";

export function ShoppersTab({ summary }: { summary: ShopperSummary }) {
  return (
    <div className="mt-5">
      <ShopperKpiRow summary={summary} />
    </div>
  );
}
