import type { ShoppersTabData } from "../analytics-types";
import { ShopperKpiRow } from "../ShopperKpiRow";
import { NewReturningCard } from "../shoppers/NewReturningCard";
import { RepeatPurchaseCard } from "../shoppers/RepeatPurchaseCard";
import { ShopperCoverageNotice } from "../shoppers/ShopperCoverageNotice";
import { ShopperTrendCard } from "../shoppers/ShopperTrendCard";
import { TopShoppersCard } from "../shoppers/TopShoppersCard";

export function ShoppersTab({ data }: { data: ShoppersTabData }) {
  return (
    <div className="mt-5 min-w-0 space-y-4">
      <ShopperKpiRow summary={data.shopperSummary} />
      <ShopperTrendCard trend={data.shopperTrend} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <NewReturningCard lifecycle={data.shopperLifecycle} />
        <RepeatPurchaseCard repeatPurchase={data.repeatPurchase} />
      </div>
      <TopShoppersCard topShoppers={data.topShoppers} />
      <ShopperCoverageNotice
        coverage={data.shopperCoverage}
        topShoppers={data.topShoppers}
      />
    </div>
  );
}
