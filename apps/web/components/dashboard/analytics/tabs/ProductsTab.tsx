import type { ProductPerformance } from "../analytics-types";
import { CategoryPerformanceCard } from "../CategoryPerformanceCard";
import { ProductPerformanceCard } from "../ProductPerformanceCard";

export function ProductsTab({
  performance,
}: {
  performance: ProductPerformance;
}) {
  return (
    <section className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <ProductPerformanceCard performance={performance} />
      <CategoryPerformanceCard categories={performance.categories} />
    </section>
  );
}
