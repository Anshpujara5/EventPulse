import type { ShopperSummary } from "../analytics-types";
import { ShopperSummaryCard } from "../ShopperSummaryCard";

export function ShoppersTab({ summary }: { summary: ShopperSummary }) {
  return (
    <section className="mt-5">
      <ShopperSummaryCard summary={summary} />
    </section>
  );
}
