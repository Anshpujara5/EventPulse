# EventPulse Analytics Baseline: phase-0d5c-73ee8bc-medium

> Medium-tier baseline of record. Budgets are provisional development hypotheses, not production SLAs.

## Identity

- Git: `73ee8bc0b8c3e90c6de41c45ffcd851cb59d832f` (feature/benchmark-explain-baseline), dirty: yes
- Dataset manifest: `32cd6fc428fd76105949674b74a3559c41330288c45a37abc87b9475a300e374`
- Seed: 502; spread: 90 days
- HTTP source: `medium-http-baseline-a`
- EXPLAIN source: `medium-explain-baseline`
- Counts unchanged: yes
- HTTP counts before/after: `{"users":2,"projects":6,"apiKeys":6,"events":550089,"alerts":0,"alertTriggers":0}` / `{"users":2,"projects":6,"apiKeys":6,"events":550089,"alerts":0,"alertTriggers":0}`
- EXPLAIN counts before/after: `{"users":2,"projects":6,"apiKeys":6,"events":550089,"alerts":0,"alertTriggers":0}` / `{"users":2,"projects":6,"apiKeys":6,"events":550089,"alerts":0,"alertTriggers":0}`

## Slowest HTTP Cells

| Cell | Median ms | p95 ms | Median payload bytes |
|---|---:|---:|---:|
| products:all:all | 1772.624 | 3262.963 | 9865.000 |
| products:all:custom-long | 688.226 | 1041.519 | 10183.000 |
| behavior:all:all | 750.005 | 1040.047 | 2978.000 |
| shoppers:all:all | 370.272 | 975.682 | 118.000 |
| products:all:30d | 385.003 | 844.209 | 9914.000 |
| products:all:7d | 179.291 | 693.509 | 8222.000 |
| overview:all:all | 470.625 | 615.045 | 785.000 |
| overview:all:custom-long | 311.226 | 506.546 | 2690.000 |
| behavior:all:custom-long | 377.293 | 506.243 | 3031.000 |
| overview:all:30d | 370.518 | 478.773 | 2067.000 |
| conversion:all:all | 408.903 | 417.539 | 2323.000 |
| behavior:all:30d | 366.667 | 389.877 | 2965.000 |

## Slowest Standalone Queries

| Target | Query | Median ms | p95 ms | Seq scans | Temp written | Dominant node |
|---|---|---:|---:|---:|---:|---|
| q18-product-performance:all:all | #18 Product performance CTE | 1102.243 | 1132.358 | 2 | 38421.000 | Sort |
| q08-top-property-keys:all:all | #8 Top JSON property keys | 1048.214 | 1115.189 | 1 | 0.000 | Sort |
| q19-category-performance:all:all | #19 Category performance CTE | 975.186 | 1020.629 | 2 | 35898.000 | Sort |
| q16-session-funnel:all:all | #16 Distinct-session conversion funnel | 525.574 | 571.294 | 1 | 2152.000 | Seq Scan on Event |
| q18-product-performance:all:30d | #18 Product performance CTE | 468.595 | 548.892 | 2 | 11462.000 | Sort |
| q18-product-performance:all:custom-long | #18 Product performance CTE | 507.388 | 545.324 | 2 | 15612.000 | Sort |
| q11-preset-trend:all:24h | #11 Preset-range trend buckets | 420.253 | 526.243 | 1 | 6220.000 | Merge Join |
| q08-top-property-keys:all:custom-long | #8 Top JSON property keys | 466.978 | 520.305 | 1 | 0.000 | Sort |
| q17-shopper-summary:all:all | #17 Distinct shopper and session summary | 447.646 | 451.643 | 1 | 4172.000 | Seq Scan on Event |
| q19-category-performance:all:custom-long | #19 Category performance CTE | 431.916 | 449.749 | 2 | 14838.000 | Sort |
| q16-session-funnel:all:30d | #16 Distinct-session conversion funnel | 360.455 | 418.761 | 1 | 642.000 | Seq Scan on Event |
| q19-category-performance:all:30d | #19 Category performance CTE | 388.652 | 410.901 | 2 | 10756.000 | Sort |
| q13-all-time-trend:all:all:month | #13 All-time trend buckets | 336.790 | 408.369 | 1 | 10643.000 | Merge Join |
| q11-preset-trend:all:30d | #11 Preset-range trend buckets | 323.219 | 388.478 | 1 | 6609.000 | Merge Join |
| q08-top-property-keys:all:30d | #8 Top JSON property keys | 350.422 | 373.309 | 1 | 0.000 | Sort |

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
