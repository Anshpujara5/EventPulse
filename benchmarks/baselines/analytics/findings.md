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
