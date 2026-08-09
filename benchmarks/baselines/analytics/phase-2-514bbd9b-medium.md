# EventPulse Analytics Baseline: phase-2-514bbd9b-medium

> Medium-tier baseline of record. Budgets are provisional development hypotheses, not production SLAs.

## Identity

- Git: `514bbd9b3f99aef43935e0bc0c191343a65d9c3f` (feature/sales-benchmark-extension), dirty: yes
- Dataset manifest: `8c97632df42fe94439826c8b105c020b9373c9077b33bddf41a6fed8a61199a7`
- Seed: 502; spread: 90 days
- HTTP source: `phase2-medium-http`
- EXPLAIN source: `phase2-medium-explain`
- Counts unchanged: yes
- HTTP counts before/after: `{"users":2,"projects":6,"apiKeys":6,"events":549864,"alerts":0,"alertTriggers":0}` / `{"users":2,"projects":6,"apiKeys":6,"events":549864,"alerts":0,"alertTriggers":0}`
- EXPLAIN counts before/after: `{"users":2,"projects":6,"apiKeys":6,"events":549864,"alerts":0,"alertTriggers":0}` / `{"users":2,"projects":6,"apiKeys":6,"events":549864,"alerts":0,"alertTriggers":0}`

## Slowest HTTP Cells

| Cell | Median ms | p95 ms | Median payload bytes |
|---|---:|---:|---:|
| sales:all:custom-long | 9102.970 | 9392.352 | 4320.000 |
| sales:all:30d | 5703.687 | 5746.216 | 3503.000 |
| products:all:all | 2528.641 | 2720.290 | 27666.000 |
| overview:single:all | 2107.947 | 2213.671 | 2690.000 |
| overview:all:7d | 1755.985 | 1888.170 | 3024.000 |
| overview:single:custom-long | 1825.105 | 1863.448 | 4579.000 |
| overview:all:all | 1476.621 | 1645.298 | 2700.000 |
| behavior:all:all | 1008.893 | 1303.820 | 2981.000 |
| overview:all:30d | 1174.158 | 1297.177 | 3964.000 |
| products:all:custom-long | 1132.264 | 1264.748 | 30387.000 |
| overview:all:custom-long | 1132.680 | 1180.460 | 4616.000 |
| overview:single:30d | 1145.716 | 1170.473 | 3925.000 |

## Slowest Standalone Queries

| Target | Query | Median ms | p95 ms | Seq scans | Temp written | Dominant node |
|---|---|---:|---:|---:|---:|---|
| q21-sales-comparison:all:custom-long | #21 Sales current and previous period aggregates | 9557.819 | 10056.116 | 1 | 504.000 | Merge Join |
| q21-sales-comparison:all:30d | #21 Sales current and previous period aggregates | 6345.335 | 6442.854 | 1 | 383.000 | Merge Join |
| q23-overview-sales-kpis:single:custom-long | #23 Combined Overview Orders, GMV, and AOV aggregates | 1598.637 | 1619.684 | 1 | 0.000 | Merge Join |
| q20-sales-headline:all:custom-long | #20 Sales headline and data-quality aggregates | 1490.947 | 1495.135 | 2 | 0.000 | Nested Loop |
| q18-product-performance:all:all | #18 Product performance CTE | 1439.764 | 1485.459 | 2 | 38405.000 | Sort |
| q23-overview-sales-kpis:all:7d | #23 Combined Overview Orders, GMV, and AOV aggregates | 1443.084 | 1477.311 | 2 | 0.000 | Merge Join |
| q19-category-performance:all:all | #19 Category performance CTE | 1317.420 | 1434.414 | 2 | 35885.000 | Sort |
| q23-overview-sales-kpis:single:all | #23 Combined Overview Orders, GMV, and AOV aggregates | 1332.002 | 1344.095 | 1 | 0.000 | Merge Join |
| q20-sales-headline:all:all | #20 Sales headline and data-quality aggregates | 1071.482 | 1096.404 | 2 | 1500.000 | Nested Loop |
| q23-overview-sales-kpis:single:30d | #23 Combined Overview Orders, GMV, and AOV aggregates | 908.430 | 944.014 | 1 | 0.000 | Merge Join |
| q20-sales-headline:single:all | #20 Sales headline and data-quality aggregates | 930.755 | 936.791 | 2 | 0.000 | Nested Loop |
| q08-top-property-keys:all:all | #8 Top JSON property keys | 826.273 | 932.258 | 1 | 0.000 | Sort |
| q21-sales-comparison:single:custom-long | #21 Sales current and previous period aggregates | 870.498 | 917.470 | 1 | 0.000 | Merge Join |
| q20-sales-headline:all:30d | #20 Sales headline and data-quality aggregates | 767.595 | 843.287 | 2 | 0.000 | Nested Loop |
| q18-product-performance:all:custom-long | #18 Product performance CTE | 665.438 | 767.103 | 2 | 16013.000 | Sort |

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

