# Phase 0D-5C Analytics Performance Findings

> Measurement-only findings for the deterministic medium benchmark tier. These numbers are local development evidence, not production SLOs. No query, index, schema, pool, cache, or analytics behavior was changed.

## Baseline Identity

- Baseline: `phase-0d5c-73ee8bc-medium`
- Commit: `73ee8bc0b8c3e90c6de41c45ffcd851cb59d832f` (working tree intentionally dirty with benchmark artifacts)
- Dataset: medium, seed `502`, 90-day spread, 550,089 events
- Manifest: `32cd6fc428fd76105949674b74a3559c41330288c45a37abc87b9475a300e374`
- HTTP method: 1 warm-up plus 10 measured requests per cell
- EXPLAIN method: 1 priming run plus 5 measured `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` runs per target
- Coverage: 50 HTTP cells, 145 EXPLAIN targets, all 19 analytics SQL statements
- Raw evidence: `benchmarks/results/analytics/medium-http-baseline-a.json` and `benchmarks/results/analytics/medium-explain-baseline.json` (gitignored)
- Curated evidence: [phase-0d5c-73ee8bc-medium.json](./phase-0d5c-73ee8bc-medium.json)

## Budget Breaches

The provisional budgets are development hypotheses. A cell is listed when either its median or p95 exceeds the tab hypothesis. Payloads had no breach: the maximum measured p95 payload was 10,201 bytes against the 51,200-byte hypothesis.

| Rank | Cell | Median / budget | Ratio | p95 / budget | Ratio | Verdict |
|---:|---|---:|---:|---:|---:|---|
| 1 | shoppers:all:all | 370.272 / 60 ms | 6.17x | 975.682 / 120 ms | 8.13x | Exceeds both |
| 2 | products:all:all | 1772.624 / 400 ms | 4.43x | 3262.963 / 800 ms | 4.08x | Exceeds both |
| 3 | behavior:all:all | 750.005 / 200 ms | 3.75x | 1040.047 / 400 ms | 2.60x | Exceeds both |
| 4 | conversion:all:all | 408.903 / 120 ms | 3.41x | 417.539 / 250 ms | 1.67x | Exceeds both |
| 5 | shoppers:all:30d | 195.324 / 60 ms | 3.26x | 196.879 / 120 ms | 1.64x | Exceeds both |
| 6 | shoppers:all:custom-long | 189.391 / 60 ms | 3.16x | 379.597 / 120 ms | 3.16x | Exceeds both |
| 7 | behavior:all:custom-long | 377.293 / 200 ms | 1.89x | 506.243 / 400 ms | 1.27x | Exceeds both |
| 8 | overview:all:all | 470.625 / 250 ms | 1.88x | 615.045 / 500 ms | 1.23x | Exceeds both |
| 9 | conversion:all:custom-long | 223.100 / 120 ms | 1.86x | 243.806 / 250 ms | 0.98x | Median only |
| 10 | conversion:all:30d | 219.297 / 120 ms | 1.83x | 229.056 / 250 ms | 0.92x | Median only |
| 11 | behavior:all:30d | 366.667 / 200 ms | 1.83x | 389.877 / 400 ms | 0.97x | Median only |
| 12 | products:all:custom-long | 688.226 / 400 ms | 1.72x | 1041.519 / 800 ms | 1.30x | Exceeds both |
| 13 | shoppers:single:all | 97.323 / 60 ms | 1.62x | 100.182 / 120 ms | 0.83x | Median only |
| 14 | overview:all:30d | 370.518 / 250 ms | 1.48x | 478.773 / 500 ms | 0.96x | Median only |
| 15 | overview:all:7d | 326.742 / 250 ms | 1.31x | 356.554 / 500 ms | 0.71x | Median only |
| 16 | shoppers:all:7d | 76.543 / 60 ms | 1.28x | 93.764 / 120 ms | 0.78x | Median only |
| 17 | overview:all:custom-long | 311.226 / 250 ms | 1.24x | 506.546 / 500 ms | 1.01x | Exceeds both |
| 18 | behavior:all:7d | 236.902 / 200 ms | 1.18x | 262.815 / 400 ms | 0.66x | Median only |
| 19 | products:all:30d | 385.003 / 400 ms | 0.96x | 844.209 / 800 ms | 1.06x | p95 only |

All unlisted medium cells were within their provisional tab hypotheses.

## Highest-Cost Query Per Tab

Standalone EXPLAIN time is not additive request wall time because tab queries execute concurrently. It is still useful for locating work inside each tab.

| Tab | Highest-cost query and cell | Median | p95 | Plan evidence |
|---|---|---:|---:|---|
| Overview | #8 top property keys, all/all | 1048.214 ms | 1115.189 ms | Event seq scan, JSON function scan, two sorts |
| Behavior | #8 top property keys, all/all | 1048.214 ms | 1115.189 ms | Same shared event-activity query |
| Conversion | #16 session funnel, all/all | 525.574 ms | 571.294 ms | Event seq scan, 2,152 temp blocks written |
| Products | #18 product performance, all/all | 1102.243 ms | 1132.358 ms | Two seq scans, external sort, 38,421 temp blocks written |
| Shoppers | #17 shopper summary, all/all | 447.646 ms | 451.643 ms | Event seq scan, 4,172 temp blocks written |

## Detailed Findings

| ID | Surface | Cell(s) | Observation | Evidence | Budget verdict | Hypothesis | Candidate future action | Evidence bar | Recommended phase | Severity | Confidence | Blocker |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-0D5-01 | Products / queries #18 and #19 | medium, all and single, all ranges | Products is the slowest HTTP surface at all/all (1772.624 ms median, 3262.963 ms p95). Query #18 is slower than #19 in all 10 matched cells by 13.03% to 71.59%; at all/all they are 1102.243 ms and 975.186 ms median. | Curated HTTP cells and targets `q18-product-performance:*`, `q19-category-performance:*`; both spill heavily and use seq scans for wide ranges. | Products all/30d, all/custom-long, and all/all breach the tab hypothesis; both all/all queries exceed the 300 ms single-query p95 hypothesis by more than 3x. | Product item expansion and aggregation perform more work than category grouping, while both wide-range CTEs sort beyond `work_mem`. | Evaluate query decomposition or later aggregate design; measure any proposal before accepting it. No change in this phase. | Number and plan pathology confirmed; write-path and before/after evidence still required for a concrete optimization. | Post-0D-5 query branch or Phase 13 rollups | Critical | Confirmed | Performance budget, not correctness |
| F-0D5-02 | Overview and Behavior / query #8 | medium all/30d, all/custom-long, all/all, single/all | Top-property expansion reaches 1048.214 ms median and 1115.189 ms p95 at all/all. The plan invokes `jsonb_object_keys` about 549,112 times, scans Event sequentially, reads 30,005 shared blocks, and does not spill. | Target `q08-top-property-keys:all:all`; Function Scan actual rows 11 across 549,112 loops; top-N and quicksort remain in memory. | The all/all query is 3.72x the 300 ms p95 query hypothesis and is the highest-cost standalone query for both tabs. | Cost follows per-event JSON expansion rather than sort spill. | Evaluate a narrower Behavior/activity query contract or a future aggregate for property keys; do not choose an index without a measured candidate plan. | Cost source confirmed; candidate-specific evidence absent. | Post-0D-5 measurement/query branch; Phase 13 if aggregation is selected | Critical | Confirmed | Performance budget, not correctness |
| F-0D5-03 | All analytics tabs | medium matched all-project vs single-project cells | Wide tenant scope is consistently more expensive for high-cost queries. At all/all, all-project vs single-project median ratios are #8 3.02x, #16 3.71x, #17 3.67x, #18 3.88x, and #19 4.15x. HTTP ratios are Overview 2.80x, Conversion 3.48x, Products 7.27x, Shoppers 3.80x, and Behavior 4.45x. | Matched curated cells and EXPLAIN targets with identical range and query shape. | Every all-project all-time tab cell breaches its tab hypothesis; corresponding single-project all-time cells are lower, though Shoppers single/all still breaches median. | More projects increase rows entering grouping, JSON expansion, distinct aggregation, and disk-backed sorts. | Keep all-project scope in future optimization baselines and evaluate it separately from single-project improvements. | Cross-scope evidence confirmed; no candidate optimization tested. | All future performance branches | High | Confirmed | No |
| F-0D5-04 | Overview / query #14 comparison | medium, both scopes, all ranges | The comparison scan is not bounded by the selected current/previous period. All-project plans scan the same 183,037 rows per worker set and touch about 237k hit blocks for every range; single-project plans remove 133,379 rows and read 32k-34k blocks. Median execution remains 43.368-104.101 ms rather than scaling cleanly with range. | Targets `q14-period-comparison:*`; scan conditions contain ownership/project predicates but no date predicate. | Query p95 remains under 300 ms today, but the scan structure grows with retained tenant history. | CASE expressions classify periods after a broader ownership scan. | In a later behavior-preserving query branch, test a bounded outer WHERE covering current plus previous periods against this baseline. | Current pathology confirmed; candidate plan and semantic-equivalence tests still required. | Post-0D-5 query branch | Informational | Confirmed | No |
| F-0D5-05 | Overview trend / queries #11 and #12 | medium preset ranges and custom-long | Preset all-project trend is 323.219-420.253 ms median with 6,198 temp blocks read and 6,220-6,609 written. Custom 45-day trend is 175.306 ms median with 1,809/1,818 temp blocks. Single-project results show the same direction (82.704 ms for preset 30d vs 47.447 ms custom-long). | Targets `q11-preset-trend:*` and `q12-custom-trend:*`; external merge sorts appear in both. | All-project preset targets exceed the 300 ms single-query p95 hypothesis; custom-long all-project does not. | Bucket generation and query shape may dominate raw date-span length. | Run a matched-duration preset/custom experiment before proposing a rewrite; separately investigate the measured external-sort work. | Strong signal only because 30-day preset and 45-day custom are not identical windows. | Future benchmark/query branch | High | Strong signal | No |
| F-0D5-06 | Overview all-time trend / query #13 | small day granularity vs medium month granularity | Small-tier day/all measured 14.280 ms median and 18.338 ms p95 all-project; medium-tier month/all measured 336.790 ms and 408.369 ms. Temp writes rose from 507 to 10,643 blocks. | Raw small target `q13-all-time-trend:all:all:day`; curated medium target `q13-all-time-trend:all:all:month`. | Medium month/all exceeds the 300 ms single-query p95 hypothesis. | Dataset scale, date spread, and granularity all changed together, so this pair cannot isolate granularity cost. | If granularity becomes an optimization target, benchmark day and month on the same seeded tier and span. | Required variants covered, but causal evidence is insufficient. | Future benchmark refinement only if needed | Informational | Needs more data | No |
| F-0D5-07 | Overview concurrency | medium Overview cells | Code launches 9 event-activity statements plus trend plus comparison for all-project scope (11 SQL statements) against the default pg pool maximum of 10; all-time first performs the span query. Standalone sequential EXPLAIN cannot observe queue wait. | `summary.ts` Promise.all and `eventActivity.ts` Promise.all; `config/prisma.ts` uses default `pg.Pool`; baseline has no per-statement HTTP timestamps. | Several all-project Overview cells breach the tab median hypothesis, but no measured share can be assigned to pool wait. | One statement may wait for a connection during the 11-way fan-out. | Add benchmark-only per-statement timing before changing pool size or concurrency. | Structural precondition exists; required runtime queue evidence is missing. | Future measurement branch | Informational | Needs more data | Blocks a pool recommendation |
| F-0D5-08 | Behavior over-fetch | medium 30d and all-time, both scopes | Behavior executes the full event-activity bundle but discards #2 events today, #3 unique names, #4 active projects, and #9 active-project total in all-project scope. Their summed standalone medians are 269.285 of 775.861 ms (34.70%) for all/30d, 299.685 of 1546.018 ms (19.38%) for all/all, 25.991 of 167.501 ms (15.52%) for single/30d, and 81.140 of 563.803 ms (14.39%) for single/all. Query #1 is retained because it computes percentages. | Curated targets #1-#9 plus `buildBehaviorSummary`; sums are a work proxy, not concurrent wall time. | Behavior breaches at all-project 7d/30d/custom-long/all. | Removing unused statements could reduce database work, but the concurrent request-time gain is unknown. | Capture per-statement HTTP timing, then test a Behavior-specific fetch only if wall-time share justifies it. | Statement waste and standalone cost confirmed; exact wall-time share missing. | Future measurement, then optional query-slicing branch | High | Needs more data | Blocks a slicing ROI claim |
| F-0D5-09 | Index and scan behavior | all modules, medium matrix | Existing selective paths are exercised: `Event_projectId_createdAt_idx` appears in 41 scan nodes, `Event_userId_createdAt_idx` in 35, `Event_projectId_customerId_idx` in 25, and `Project_pkey` in 5. Seventy-one of 145 targets also contain a sequential scan, concentrated in wide all-project/range aggregations and JSON/CTE work. | Curated `representativePlan.scans`; short single-project ranges commonly use index or bitmap paths, while wide ranges switch to sequential scans. | Several seq-scan cells breach budgets, but a seq scan alone is not evidence that an index is wrong. | PostgreSQL is choosing indexes for selective scopes and broad scans when much of the tenant data participates. | Evaluate indexes only alongside a specific slow query, selectivity evidence, ingestion cost, and before/after plans. | Usage is confirmed; no universal missing-index claim is supported. | Per-candidate post-0D-5 branches | Informational | Confirmed | No |
| F-0D5-10 | Sort/hash memory behavior | trend, funnels, shoppers, products | Fifty-one of 145 targets use temp blocks. There are 18 external-merge sort nodes across 15 targets. Largest writes are #18 all/all 38,421 blocks, #19 all/all 35,898, #13 all/all 10,643, and #11 all/30d 6,609. All 33 captured Hash nodes remain at one batch, with no hash spill. | Curated plan summaries, `sorts`, `hashes`, and buffer counters. | The largest spill targets breach their tab or single-query hypotheses. | Sort/aggregate working sets exceed the local 4 MB `work_mem`; hash nodes themselves are not the observed spill source. | Investigate query working-set reduction before considering environment tuning; preserve this baseline for any candidate. | Spill evidence confirmed; no candidate action benchmarked. | Post-0D-5 query branch or Phase 13 | High | Confirmed | No |
| F-0D5-11 | Same-commit variance | medium repeat, same manifest/environment | A second same-commit run had 38 of 50 HTTP cells outside at least one original variance band (33 median, 30 p95). Payload delta stayed within 0.296%. All 145 EXPLAIN targets retained the same plan-shape hash, although 52 execution medians moved by more than 15%. | Gitignored comparison `phase-0d5c-same-commit-comparison.json`; baseline and repeat share manifest/environment. | The provisional ±15% median / ±25% p95 bands are too tight for hard local gating in this run. | Local CPU scheduling, cache state, and a concurrently running benchmark server introduce material timing noise without changing plans or payloads. | Keep comparisons directional, collect more same-machine runs, and use plan/payload stability alongside timing before tightening bands. | Same-commit evidence confirmed; sample count is still one pair of runs. | Future baseline calibration | High | Confirmed | Blocks a hard CI gate |
| F-0D5-12 | Cold/priming behavior | medium HTTP matrix | First-run cost can be materially higher than warm median. Behavior single/24h was 118.564 ms vs 17.843 ms (6.64x); several other cells were about 1.3x-1.5x. | Curated `firstRunDurationMs` and warm latency distributions. | Cold values are informational and excluded from the warm budget verdicts. | Connection, prepared-statement, and cache priming affect first use, with additional local jitter. | Continue recording first-run values separately; do not average them into warm distributions. | Measured and repeatable methodology exists; source of each cold component is not isolated. | Baseline methodology only | Informational | Confirmed | No |

## Known Questions Disposition

1. **Is product performance the slowest module?** Yes at medium scale. See F-0D5-01.
2. **Which product query dominates?** Product query #18 is slower than category query #19 in every matched cell. See F-0D5-01.
3. **Does Overview fan-out create observable pool queuing?** Not observable with the current HTTP schema. The 11-vs-10 structural condition exists, but runtime queue wait needs per-statement timing. See F-0D5-07.
4. **How much Behavior work is discarded?** Four outputs are unused in all-project scope and three in single-project scope. Standalone work proxy is 14.39%-34.70% for the reported 30d/all-time cells; exact request wall share is unavailable. See F-0D5-08.
5. **Does comparison scan more history than required?** Yes. The scan conditions and stable row/block counts across ranges confirm it. See F-0D5-04.
6. **How expensive is JSON property expansion?** It is the second-highest standalone query maximum and exceeds the query hypothesis by 3.72x at all/all p95. See F-0D5-02.
7. **How do all-project and single-project scopes differ?** High-cost all/all queries are about 3.02x-4.15x slower; Products HTTP is 7.27x. See F-0D5-03.
8. **How do preset and custom ranges differ?** The measured custom-long trend is faster and spills less, but windows differ, so this is a strong signal rather than a causal conclusion. See F-0D5-05.
9. **Does all-time granularity materially change cost?** The required day/month variants were measured, but on different tiers; causality remains unresolved. See F-0D5-06.
10. **Are current indexes used as expected?** They are used for selective project/user/date and shopper paths. Broad scopes often choose sequential scans. See F-0D5-09.
11. **Which queries perform sequential scans?** Seventy-one target variants include one; the high-impact cases are #3-#6, #8, #11-#19 on broad ranges, with some harmless Project-table scans also present. See F-0D5-09 and the curated target list.
12. **Which queries spill or use expensive sorts/hashes?** Trend, session/shopper, and product/category targets spill; product/category all-time are largest. No captured Hash node used more than one batch. See F-0D5-10.

## Deferred Candidates, Not Implemented

- Product/category query working-set and aggregation review.
- Top-property JSON expansion strategy review.
- Period-comparison outer-range bounding experiment.
- Behavior-specific fetch experiment after per-statement timing exists.
- Trend external-sort and bucket-shape investigation.
- Session/shopper wide-range working-set investigation.
- Future aggregate/rollup evaluation only after query-level candidates and ingestion costs are measured.

No candidate above is approved by this document. Every change still requires semantic-equivalence tests, a same-manifest before/after run, plan evidence, and ingestion/write-cost review where an index is involved.

## Mutation and Safety Result

HTTP and EXPLAIN runs both recorded identical benchmark-scoped counts before and after: 2 users, 6 projects, 6 API keys, 550,089 events, 0 alerts, and 0 alert triggers. Each EXPLAIN ran in a verified read-only transaction followed by rollback. No production analytics source, schema, index, pool setting, or frontend file was changed.

## Limitations

- Local workstation timings are directional development evidence, not production SLOs.
- HTTP request timing has no per-statement timestamps or pool-wait metric.
- Standalone EXPLAIN targets are sequential and do not reproduce Promise.all contention.
- The day-granularity all-time plan exists only on the small tier in this matrix, so it is not directly comparable to medium month granularity.
- The large tier was not run because this handoff explicitly said not to run it without justification; medium remains the baseline of record.
- No frontend render, cached-tab, or browser DevTools timing is included.

# Phase 2E Sales Benchmark Extension

> Additive findings for the Phase 2 Sales, Overview Sales KPI, and product/category line-item query surface. The Phase 0D-5 baseline and findings above remain the historical reference; the changed deterministic dataset has a new manifest identity and is not compared directly with the old dataset.

## Phase 2 Baseline Identity

- Baseline: `phase-2-514bbd9b-medium`
- Source commit: `514bbd9b3f99aef43935e0bc0c191343a65d9c3f` (working tree intentionally dirty with Phase 2E benchmark changes)
- Dataset: medium, seed `502`, fixed anchor `2026-08-09T08:00:00.000Z`, 90-day spread, 549,864 events
- Dataset revision: `phase-2-sales-line-items-v1`
- Manifest: `8c97632df42fe94439826c8b105c020b9373c9077b33bddf41a6fed8a61199a7`
- HTTP coverage: 60 cells, 600 measured requests, 60 passed, 0 failed
- EXPLAIN coverage: 205 targets across 25 query IDs, 205 completed, 0 failed
- Method: HTTP 1 warm-up + 10 measured requests per cell; EXPLAIN 1 priming + 5 measured executions per target
- Curated evidence: [phase-2-514bbd9b-medium.json](./phase-2-514bbd9b-medium.json) and [phase-2-514bbd9b-medium.md](./phase-2-514bbd9b-medium.md)
- Raw evidence: `benchmarks/results/analytics/phase2-medium-*.{json,md}` (gitignored)

## Deterministic Dataset Coverage

Two guarded medium reseeds produced the same manifest hash, table counts, Phase 2 scenario counts, and full event-content fingerprint (`549864|-1583655645696646047697`). The dataset contains 3,359 successful-purchase profiles, 608 estimate-only purchases, 629 purchases without usable order IDs, 21 payment-only order IDs, 118 mixed-currency orders, 2,753 orders with usable `items[]`, 606 without `items[]`, and 674 multi-line order profiles. Each malformed money and malformed line-item category is deterministic and remains a small minority.

Representative-order fixtures verified all three frozen tie-breaks: `purchase_completed` wins over an earlier lower-priority alias; equal event names choose the earliest timestamp; equal names and timestamps choose the smallest ID. Cross-project order IDs, `ORD1` versus `ord1`, and trimmed order IDs remain distinct or merged according to the production identity contract.

## Sales HTTP Cells

| Cell | Warm median | Warm p95 | Payload |
|---|---:|---:|---:|
| sales:single:24h | 19.187 ms | 21.886 ms | 3,091 B |
| sales:single:7d | 65.808 ms | 69.157 ms | 2,201 B |
| sales:single:30d | 587.086 ms | 610.904 ms | 3,332 B |
| sales:single:custom-long | 961.365 ms | 1,007.015 ms | 4,148 B |
| sales:single:all | 911.216 ms | 932.319 ms | 1,993 B |
| sales:all:24h | 186.740 ms | 201.191 ms | 3,255 B |
| sales:all:7d | 697.831 ms | 716.830 ms | 2,320 B |
| sales:all:30d | 5,703.687 ms | 5,746.216 ms | 3,503 B |
| sales:all:custom-long | 9,102.970 ms | 9,392.352 ms | 4,320 B |
| sales:all:all | 1,098.846 ms | 1,141.868 ms | 2,119 B |

The provisional Sales hypothesis is 400 ms median / 800 ms p95. Single-project 24h and 7d and all-project 24h remain within it; the other seven cells breach at least one bound. Payloads remain far below the 50 KiB hypothesis.

## Phase 2 Query Summary

| Query | Highest-cost measured target | Median | p95 | Plan observation |
|---|---|---:|---:|---|
| #20 Sales headline | all/custom-long | 1,490.947 ms | 1,495.135 ms | Two sequential scans; all/all uses an external merge sort |
| #21 Sales comparison | all/custom-long | 9,557.819 ms | 10,056.116 ms | Merge join, sequential scan, and 1,193,976 temp blocks read |
| #22 Sales trend | all/all/month | 177.903 ms | 179.928 ms | Within query budget; all/all uses an external merge sort |
| #23 Overview Sales KPIs | single/custom-long | 1,598.637 ms | 1,619.684 ms | Merge join; strong range/scope-dependent planner behavior |
| #24 Product line items | all/all | 123.354 ms | 131.093 ms | No temp blocks; one sequential scan at wide range |
| #25 Category line items | all/all | 129.591 ms | 130.794 ms | No temp blocks; one sequential scan at wide range |

Across the 60 new Phase 2 EXPLAIN targets, 38 contain a sequential scan, 7 use temp blocks, and 4 contain an external-merge sort. Product/category line-item targets do not spill in this medium dataset.

## Phase 2 Findings

| ID | Surface | Observation | Evidence | Verdict | Confidence / next evidence |
|---|---|---|---|---|---|
| F-P2E-01 | Sales comparison (#21) | All-project 30d and custom-long dominate the Sales tab at 6,345.335 ms and 9,557.819 ms median. Custom-long reads 1,193,976 temp blocks and removes 191,524 rows by filter in its representative plan. | Targets `q21-sales-comparison:all:30d` and `:all:custom-long`; corresponding HTTP cells are 5,703.687 ms and 9,102.970 ms median. | Critical measured budget breach; measurement only, no rewrite approved. | Confirmed at medium. Any future change needs semantic-equivalence fixtures and same-manifest before/after plans. |
| F-P2E-02 | Sales headline (#20) | Cost grows from 51.818 ms all/24h to 1,490.947 ms all/custom-long. All/all is 1,071.482 ms and spills through an external merge sort (1,500 temp blocks written). | `q20-sales-headline:*` targets. | Wide-range query p95 exceeds the 300 ms hypothesis. | Confirmed at medium; large-tier scaling is not measured here. |
| F-P2E-03 | Sales trend (#22) | The highest p95 is 179.928 ms at all/all/month, below the single-query hypothesis. That plan still uses an external merge sort with 1,499 temp blocks written. | `q22-sales-trend:*` targets. | Within provisional query budget, with a spill signal worth retaining. | Confirmed at medium; no action justified by this baseline alone. |
| F-P2E-04 | Overview Sales KPIs (#23) and pool pressure | Overview now structurally launches 13 statements for all-project scope and 12 for single-project scope against the default pool maximum of 10; all-time adds the span query before that fan-out. Query #23 reaches 1,598.637 ms single/custom-long and 1,443.084 ms all/7d. | `summary.ts` composition plus `q23-overview-sales-kpis:*`; Overview HTTP cells reach 2,107.947 ms single/all and 1,755.985 ms all/7d. | Several Overview cells breach the tab hypothesis. Exact queue wait remains unmeasured. | Structural count confirmed; pool impact needs per-statement request timing before any concurrency or pool recommendation. |
| F-P2E-05 | Product/category line attribution (#24/#25) | Line-item attribution remains below 132 ms p95 in every medium cell. Category is slightly slower than Product at all/all (129.591 vs 123.354 ms median). Neither query spills. | `q24-product-line-items:*` and `q25-category-line-items:*`. | Within provisional single-query budget. | Confirmed at medium; preserve these targets for future dataset/scale changes. |
| F-P2E-06 | Scope and range sensitivity | Sales all-project/single-project median ratios are 9.73x (24h), 10.60x (7d), 9.72x (30d), 9.47x (custom-long), but only 1.21x (all-time). All-time does not execute the same previous-period work, so duration is not monotonic with range width. | Matched Sales HTTP cells and #20-#22 plans. | Scope is a major cost driver; range labels are not interchangeable workloads. | Confirmed directionally; causal attribution across the concurrent Sales statements requires request-level statement timing. |
| F-P2E-07 | Mixed-currency coverage | The all-project scope includes a deterministic mixed-currency project (117 INR and 460 USD confirmed money rows in the runtime fixture) while single-project coverage remains exact-currency. The runner validates available/unavailable money discriminants without combining currencies. | Seeder manifest/runtime fixture and 60/60 HTTP correctness checks. | Contract path is exercised; no FX conversion or silent combination occurred. | Coverage confirmed, isolated latency impact needs a dedicated mixed-project matrix cell and is not claimed here. |
| F-P2E-08 | Plan and timing stability | Immediate same-dataset repeat retained all 60 cells and all 205 targets with zero plan-shape changes. However, 40/60 HTTP cells were outside at least one provisional variance band, and 37/205 EXPLAIN medians moved by more than 15%; maximum payload delta was 0.971%. | Gitignored `phase2-medium-repeat-comparison.{json,md}`. | Timing remains directional and unsuitable for a hard CI gate. | Confirmed for one same-machine pair; collect more repeats before tightening bands. |
| F-P2E-09 | Existing-tab regression coverage | Against the unchanged old manifest, all 50 pre-existing HTTP cells passed correctness. Tooling added 10 Sales cells and 60 Phase 2 EXPLAIN targets, with no removed cells or targets. Overview and Products payload growth reflects their already-merged additive Phase 2 fields. | Gitignored `phase2-step1-comparison.{json,md}` and unchanged-dataset run artifacts. | Existing API correctness remained stable; timing and planner differences are directional. | Runtime verified. Direct timing comparison after the seeder change is invalid because manifest hashes differ. |

## Phase 2 Safety and Mutation Result

Both HTTP runs and both EXPLAIN runs completed with identical benchmark-scoped table counts before and after: 2 users, 6 projects, 6 API keys, 549,864 events, 0 alerts, and 0 alert triggers. EXPLAIN targets ran in read-only transactions followed by rollback. The historical Phase 0D-5 baseline remains unchanged. No production analytics SQL semantics, schema, index, pool setting, or frontend file changed in Phase 2E.

## Phase 2 Remaining Limitations

- This is a medium-tier local workstation baseline, not a production SLO or CI timing gate.
- The benchmark captures tab wall time and standalone EXPLAIN time, not per-statement timing inside concurrent HTTP requests.
- Mixed-currency correctness is exercised in all-project scope, but its isolated latency impact is not measured.
- Large-tier Sales/line-item plans were not run; the matrix and target selection support them, but no large Phase 2 dataset was seeded in this branch.
- The updated manifest intentionally prevents direct timing comparison with the historical baseline; Step 1 provides the only valid unchanged-manifest regression comparison.

# Phase 3F Shopper Benchmark Extension

> Additive findings for the completed Shopper MVP. This phase measured the merged shopper analytics without changing production SQL, metric semantics, indexes, schema, frontend code, or the deterministic benchmark generator.

## Phase 3 Baseline Identity

- Baseline: `phase-3-3e945a6-medium`
- Source commit: `3e945a6619c2a74e807cae5095280594e7a6ff8f` (working tree intentionally dirty with Phase 3F benchmark changes)
- Dataset: medium, seed `502`, fixed run anchor `2026-08-24T22:00:00.000Z`, 90-day spread, 549,864 events
- Dataset revision: `phase-2-sales-line-items-v1` (unchanged by Phase 3F)
- Manifest: `8c97632df42fe94439826c8b105c020b9373c9077b33bddf41a6fed8a61199a7`, matching the Phase 2 baseline
- HTTP coverage: 60 cells, 600 measured requests, 60 passed, 0 failed; the immediate repeat also passed all 60 cells and 600 requests
- EXPLAIN coverage: 223 targets across 28 query IDs; 223 priming and 1,115 measured plans completed
- Curated evidence: [phase-3-3e945a6-medium.json](./phase-3-3e945a6-medium.json) and [phase-3-3e945a6-medium.md](./phase-3-3e945a6-medium.md)
- Raw evidence: `benchmarks/results/analytics/phase3-medium-*.{json,md}` and `phase3-vs-phase2-comparison.{json,md}` (gitignored)

## Shopper Dataset Pre-flight

The read-only pre-flight found 2,455 buyers, 54 repeat buyers, 2,710 confirmed orders, 2,510 attributed confirmed orders, and 200 unattributed confirmed orders. It also found 3,000 customer IDs represented across multiple projects (15,000 project/customer identity pairs), 43,736 event rows with null customer IDs, no blank customer-ID rows, and four shoppers with mixed-currency money evidence. The event span was approximately 90 days, with all 24 trailing hourly buckets and 91 daily buckets represented. The required stop condition did not apply, so the benchmark seeder remained byte-identical.

## Shopper HTTP Cells

| Cell | Warm median | Warm p95 | Payload |
|---|---:|---:|---:|
| shoppers:single:24h | 120.769 ms | 131.284 ms | 5,665 B |
| shoppers:single:7d | 143.266 ms | 148.971 ms | 3,326 B |
| shoppers:single:30d | 178.915 ms | 184.127 ms | 6,545 B |
| shoppers:single:custom-long | 137.961 ms | 165.270 ms | 8,682 B |
| shoppers:single:all | 642.554 ms | 664.888 ms | 2,957 B |
| shoppers:all:24h | 350.908 ms | 402.132 ms | 5,672 B |
| shoppers:all:7d | 436.295 ms | 471.410 ms | 3,355 B |
| shoppers:all:30d | 885.177 ms | 930.343 ms | 6,665 B |
| shoppers:all:custom-long | 903.785 ms | 975.085 ms | 8,828 B |
| shoppers:all:all | 2,003.183 ms | 2,070.032 ms | 2,976 B |

Every Shopper response passed structural checks for legacy counts, B1 trend and coverage, B2 bounded/all-time discriminants and bucket invariants, B3 availability without an estimated fallback, and B4 deterministic ranking and currency-quality fields. All-project `uniqueCustomers` intentionally uses the corrected `(projectId, customerId)` identity and is not treated as a Phase 2 payload regression.

## Phase 3 Query Summary

| Query | Highest-cost measured target | Median | p95 | Plan observation |
|---|---|---:|---:|---|
| #26 Active shoppers trend | all/all/month | 1,265.017 ms | 1,463.849 ms | Event sequential scan; external-merge sorts; 35,099 temp blocks written |
| #27 New/returning lifecycle | all/all/month | 904.016 ms | 945.324 ms | Set-based history classification; no correlated SubPlan; 20,515 temp blocks written |
| #28 Shopper order metrics | all/all | 1,414.347 ms | 1,448.690 ms | Six nested-loop nodes; 1,556 temp blocks written; unused shared order-fact CTEs pruned |

The 18 new targets include 15 with a sequential scan, 13 with temp-buffer activity, and 12 with at least one external-merge sort. Selective single-project variants chose `Event_projectId_createdAt_idx` in seven scan nodes; broad all-project/all-time variants generally chose sequential scans. Across the complete 223-target matrix, 134 targets contain a sequential scan, 74 use temp blocks, and 32 contain an external-merge sort.

## Phase 3 Findings

| ID | Surface | Observation | Evidence | Verdict | Confidence / next evidence |
|---|---|---|---|---|---|
| F-P3F-01 | Completed Shoppers tab | Relative to the same-manifest Phase 2 baseline, Shopper median latency increased by 161.35%-977.69% and payload size by 2,422.03%-7,449.57%. The payload growth is expected because B1-B4 fields were added; all ten cells passed the expanded correctness validator. | `phase3-vs-phase2-comparison` plus both Phase 3 HTTP runs. | Intentional capability growth with a measured latency cost; all ten cells exceed the historical 60 ms median hypothesis. | Confirmed at medium. Timings remain directional local evidence rather than a release gate. |
| F-P3F-02 | B1 active shoppers (#26) | All/all/month is the most expensive B1 target at 1,265.017 ms median and 1,463.849 ms p95. Its representative plan reads 29,989 and writes 35,099 temp blocks. Single-project 30d is 75.927 ms and uses the project/date index through bitmap scans. | `q26-shopper-active-trend:*` targets. | Wide-scope distinct shopper bucketing is a confirmed spill and budget signal; no optimization is approved here. | Confirmed at medium; any candidate needs identical B1 bucket/coverage outputs and same-manifest plans. |
| F-P3F-03 | B2 lifecycle (#27) | The current set-based implementation remains intact: all six plans contain no correlated `SubPlan`; bounded ranges build a distinct prior-shopper set once and left-join it to first-in-range shoppers. All/custom-long is 598.088 ms median, all/all/month is 904.016 ms, and single/custom-long is 107.430 ms. | `q27-shopper-new-returning:*` plan trees and production SQL capture. | The prior correlated-history pathology did not return. Wide plans still spill, peaking at 20,515 temp blocks written for all/all. | Correct plan shape confirmed. Future work may investigate working-set cost only with lifecycle-equivalence fixtures. |
| F-P3F-04 | B3/B4 shopper orders (#28) | All/all is 1,414.347 ms median, all/custom-long 344.347 ms, and single/custom-long 52.200 ms. The all/all plan has six nested-loop nodes; inner CTE/materialize nodes execute up to 2,563 times, while total request SQL remains one statement. | `q28-shopper-order-metrics:*` plans. | Wide all-time cost is material, but the measured plan is not evidence for a semantic rewrite. | Confirmed at medium; capture candidate before/after evidence before changing order-fact composition. |
| F-P3F-05 | Shared order-facts pruning (#28) | Every #28 plan retains the referenced `identity_representatives` and `currency_slices` chain. Unreferenced `session_representatives`, `money_evidence_quality`, and `order_quality` CTEs are absent from all six plan trees. | Recursive plan-node/CTE inspection for all #28 targets. | PostgreSQL prunes the unused shared CTE branches in this query shape. | Confirmed on PostgreSQL 14.18; preserve the check across database-version upgrades. |
| F-P3F-06 | Shopper statement fan-out | The Shoppers composer runs four domain statements concurrently: legacy summary, B1 trend, B2 lifecycle, and B3/B4 orders. All-time performs the existing span-resolution statement first, then launches the same four-way fan-out. | `summary.ts` composition and query registry #10/#17/#26-#28. | Statement count matches the approved Phase 3 architecture; no statement was added by benchmark tooling. | Structurally confirmed. HTTP tooling still cannot isolate pool wait per statement. |
| F-P3F-07 | Existing-tab regression coverage | All 50 Overview, Conversion, Products, Sales, and Behavior cells passed their existing payload validators. The same-manifest comparison removed no HTTP cells or EXPLAIN targets and added only the expected 18 shopper targets. Existing-tab payload-size deltas stayed between -1.118% and +3.170%. | Direct comparison with `phase-2-514bbd9b-medium`. | No correctness regression detected in existing tabs. | Runtime structural validation confirmed; raw response bodies are not retained for byte-level payload hashing. |
| F-P3F-08 | Plan and timing stability | All 223 targets retained one plan-shape hash across their priming plus five measured executions. The HTTP repeat passed all cells with identical Shopper payload sizes, but 52/60 cells fell outside at least one provisional local variance band; Shopper repeat medians were 21.97%-32.80% slower. | Phase 3 EXPLAIN samples and immediate HTTP repeat. | Plans and payloads are stable; local timing remains noisy and unsuitable for a hard CI gate. | Confirmed for one immediate repeat. Collect more controlled runs before tightening timing bands. |

## Phase 3 Deferred Candidates, Not Implemented

- B1 distinct-bucketing working-set investigation for all-project/all-time.
- B2 sort/temp-buffer investigation while preserving the set-based prior-shopper classification.
- B3/B4 all-time order-fact plan investigation, including measured nested-loop work.
- Request-level per-statement timing before attributing Shopper wall time to concurrency or pool wait.

No optimization is approved by these findings. Each candidate requires semantic-equivalence fixtures, a same-manifest before/after run, and plan evidence.

## Phase 3 Safety and Mutation Result

Both HTTP runs and the complete EXPLAIN run recorded identical benchmark-scoped counts before and after: 2 users, 6 projects, 6 API keys, 549,864 events, 0 alerts, and 0 alert triggers. Each EXPLAIN target ran in a read-only transaction followed by rollback. The Phase 0D-5 and Phase 2 baselines remain unchanged. No production analytics source, schema, index, frontend file, or benchmark seed generator changed in Phase 3F.

## Phase 3 Remaining Limitations

- This is a medium-tier local workstation baseline, not a production SLO or CI timing gate.
- HTTP timings include four concurrent Shopper statements but do not expose their individual duration or connection-pool wait.
- Standalone EXPLAIN targets run sequentially and do not reproduce request-level concurrency.
- The direct Phase 2 comparison uses the same manifest and environment classification, but its fixed run anchor differs; timing and small existing-tab payload-size deltas should remain directional.
- The benchmark validates payload structure and cross-metric invariants, but does not retain raw response bodies for byte-for-byte comparison.
- Large-tier Shopper plans and frontend render timings were not measured.
