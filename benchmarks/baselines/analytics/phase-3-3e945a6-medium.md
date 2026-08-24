# EventPulse Analytics Baseline: phase-3-3e945a6-medium

> Medium-tier baseline of record. Budgets are provisional development hypotheses, not production SLAs.

## Identity

- Git: `3e945a6619c2a74e807cae5095280594e7a6ff8f` (feature/shopper-benchmark-extension), dirty: yes
- Dataset manifest: `8c97632df42fe94439826c8b105c020b9373c9077b33bddf41a6fed8a61199a7`
- Seed: 502; spread: 90 days
- HTTP source: `phase3-medium-http`
- EXPLAIN source: `phase3-medium-explain`
- Counts unchanged: yes
- HTTP counts before/after: `{"users":2,"projects":6,"apiKeys":6,"events":549864,"alerts":0,"alertTriggers":0}` / `{"users":2,"projects":6,"apiKeys":6,"events":549864,"alerts":0,"alertTriggers":0}`
- EXPLAIN counts before/after: `{"users":2,"projects":6,"apiKeys":6,"events":549864,"alerts":0,"alertTriggers":0}` / `{"users":2,"projects":6,"apiKeys":6,"events":549864,"alerts":0,"alertTriggers":0}`

## Slowest HTTP Cells

| Cell | Median ms | p95 ms | Median payload bytes |
|---|---:|---:|---:|
| sales:all:custom-long | 7402.232 | 7466.449 | 4313.000 |
| sales:all:30d | 4525.807 | 4565.617 | 3489.000 |
| products:all:30d | 663.050 | 3124.750 | 30637.000 |
| products:all:all | 2353.202 | 3071.438 | 27666.000 |
| shoppers:all:all | 2003.183 | 2070.032 | 2976.000 |
| products:all:custom-long | 937.683 | 1985.273 | 30329.000 |
| overview:all:7d | 1660.146 | 1710.809 | 3043.000 |
| overview:single:all | 1577.328 | 1617.391 | 2686.000 |
| overview:single:custom-long | 1436.869 | 1458.758 | 4580.000 |
| overview:all:all | 1039.811 | 1117.545 | 2697.000 |
| behavior:all:all | 1011.265 | 1087.144 | 3075.000 |
| shoppers:all:custom-long | 903.785 | 975.085 | 8828.000 |

## Slowest Standalone Queries

| Target | Query | Median ms | p95 ms | Seq scans | Temp written | Dominant node |
|---|---|---:|---:|---:|---:|---|
| q21-sales-comparison:all:custom-long | #21 Sales current and previous period aggregates | 7611.137 | 7686.522 | 1 | 499.000 | Merge Join |
| q21-sales-comparison:all:30d | #21 Sales current and previous period aggregates | 4477.657 | 4578.677 | 1 | 383.000 | Merge Join |
| q26-shopper-active-trend:all:all:month | #26 Distinct active shoppers by time bucket | 1265.017 | 1463.849 | 1 | 35099.000 | Sort |
| q28-shopper-order-metrics:all:all | #28 Repeat purchase and top shopper metrics | 1414.347 | 1448.690 | 2 | 1556.000 | Nested Loop |
| q23-overview-sales-kpis:single:custom-long | #23 Combined Overview Orders, GMV, and AOV aggregates | 1406.557 | 1423.984 | 1 | 0.000 | Merge Join |
| q23-overview-sales-kpis:all:7d | #23 Combined Overview Orders, GMV, and AOV aggregates | 1206.685 | 1221.756 | 2 | 0.000 | Merge Join |
| q23-overview-sales-kpis:single:all | #23 Combined Overview Orders, GMV, and AOV aggregates | 1195.619 | 1201.618 | 1 | 0.000 | Merge Join |
| q18-product-performance:all:all | #18 Product performance CTE | 930.881 | 1047.944 | 2 | 38406.000 | Sort |
| q20-sales-headline:all:custom-long | #20 Sales headline and data-quality aggregates | 989.459 | 996.571 | 2 | 0.000 | Nested Loop |
| q27-shopper-new-returning:all:all:month | #27 New and returning shopper lifecycle | 904.016 | 945.324 | 1 | 20515.000 | Aggregate |
| q19-category-performance:all:all | #19 Category performance CTE | 823.272 | 845.498 | 2 | 35886.000 | Sort |
| q17-shopper-summary:all:all | #17 Distinct shopper and session summary | 805.407 | 815.851 | 1 | 9400.000 | Seq Scan on Event |
| q23-overview-sales-kpis:single:30d | #23 Combined Overview Orders, GMV, and AOV aggregates | 793.050 | 798.139 | 1 | 0.000 | Merge Join |
| q20-sales-headline:all:all | #20 Sales headline and data-quality aggregates | 738.915 | 750.514 | 2 | 1557.000 | Nested Loop |
| q21-sales-comparison:single:custom-long | #21 Sales current and previous period aggregates | 701.366 | 705.454 | 1 | 0.000 | Merge Join |

## Method

- HTTP: 1 warm-up + 10 measured requests per cell, sequential.
- EXPLAIN: 1 priming + 5 measured plans per target.
- EXPLAIN form: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` in read-only rollback transactions.
- Full raw plans remain under the gitignored benchmark results directory.
- Detailed evidence and confidence labels: [findings.md](./findings.md).

## Known Limitations

- Local workstation measurements are relative development baselines, not production SLOs.
- The HTTP runner records tab wall time and payloads but not per-statement timings, so pool wait and statement share cannot be quantified from this baseline.
- Standalone EXPLAIN runs are sequential and cannot reproduce Promise.all connection-pool contention.
- The first HTTP request and priming EXPLAIN are informational; OS page cache and PostgreSQL service state are not reset.
- Large-tier measurements and frontend DevTools render timings are not part of this medium baseline artifact.
