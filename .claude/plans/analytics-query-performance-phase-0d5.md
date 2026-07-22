# Phase 0D-5 — Analytics Query Performance Baselines

**Type:** Measurement-only phase. No query rewrites, no indexes, no caching, no schema changes, no feature work.
**Assumes:** Phases 0A–0C and 0D-1 through 0D-4C are complete and merged (verified at commit `5d2faa7`): analytics runs behind a thin tab-required controller (`apps/server/src/controllers/analytics.controller.ts`, 87 lines), one shared `AnalyticsScope`, decomposed query modules under `apps/server/src/analytics/`, and per-tab lazy loading via `useAnalyticsTabData`.
**Governing docs:** analytics blueprint (metric semantics) · engineering standards (§3.1 "measure before optimizing", §9 EXPLAIN rule, §16 "Performance work" Definition of Done, §18 agent rules) · 0D-3 plan (module layout) · 0D-4 plan (§18 explicitly hands per-tab measurement to this phase).

This document also contains the design for **Phase 0M — Codebase Maintainability Sweep** (second half), a separate phase that executes after 0D-5 and before Phase 1.

---

## 1. Purpose

**Why this phase exists.** Phase 0 changed the analytics fetch architecture twice (0D-3 decomposition, 0D-4 lazy loading) while deliberately claiming *no* latency numbers — 0D-4 §18 states plainly that statement counts are verifiable facts but "latency/payload gains are not claimed without measurement." The engineering standards make the same demand twice: Principle 3.1 ("No performance work without a number showing the problem") and §16 ("No measurement → not performance work"). Phase 0D-5 produces those numbers: a reproducible, per-tab, per-query performance baseline for the analytics surface.

**Why after modularization (0D-3).** Before 0D-3, all analytics SQL lived in a 1,722-line controller; a query could only be timed as part of the whole request. Now every query lives in a focused module with a `fetch*(scope)` signature — each of the 19 statements can be invoked, timed, and EXPLAINed in isolation, with tenant scoping injected through one auditable object. Measuring before the decomposition would have produced numbers that no longer map to today's code.

**Why after lazy loading (0D-4).** 0D-4 changed *what runs when*: Overview no longer executes the product CTEs; Sales executes nothing. A baseline captured before 0D-4 would describe a request shape that no longer exists. The unit of user-visible latency is now the **tab request**, and that is the right unit to baseline. 0D-4 also created the open question this phase must answer with data: is further slicing (e.g., splitting `eventActivity` for Behavior) worth anything?

**Why optimization without measurement is dangerous.** Concretely, for this codebase:
- **Wrong target.** Intuition says the product 3-CTE queries are the slow ones; but `fetchPeriodComparison` scans the user's *entire* event history on every Overview load (its `WHERE` is unbounded ownership; ranges live in `FILTER` clauses). Without numbers we might index the wrong query.
- **Invisible regressions.** Adding an index to `Event` taxes the ingestion hot path (already carrying synchronous alert evaluation). Without a write-path baseline the cost is unmeasurable.
- **Unfalsifiable claims.** 0D-4's "the heaviest CTEs now run only when that tab opens" is a statement-count fact; "products tab is fast enough" is not a fact until measured against a stated budget.
- **Roadmap gating.** Platform Phase 13 (rollups) is explicitly benchmark-gated in the roadmap. Skipping baselines now means Phase 13 gets decided on vibes later.

## 2. Goals

1. **Per-tab latency baseline:** cold and warm response-time distributions (min / median / p95 / max) for each of the five data-tab requests (`overview`, `conversion`, `products`, `shoppers`, `behavior`) across scopes, ranges, and dataset sizes. The static Sales tab issues no request and is measured only as a frontend render (§8).
2. **Per-query latency baseline:** execution time, row counts, and share-of-tab-time for each of the 19 raw SQL statements in `apps/server/src/analytics/` (§11 inventory).
3. **Execution plans captured:** `EXPLAIN (ANALYZE, BUFFERS)` output for every inventory query at medium and large tiers, archived alongside timings (§13).
4. **Scope comparison:** single-project vs all-projects cost for the same data volume, quantifying what the `(userId, createdAt)` vs `(projectId, createdAt)` index paths actually deliver.
5. **Date-range comparison:** 24h / 7d / 30d / custom / all-time cost curves per tab, isolating which queries scale with range and which (comparison, all-time trend, span) always scan history.
6. **Reproducible baseline:** deterministic synthetic datasets (§6), pinned environment recording (§5), and a documented rerun procedure such that a future commit can be compared against today's numbers with known variance (§18).
7. **Optimization justification:** a findings table (§21) that ranks candidate optimizations by evidence, so the *next* performance phase (index additions, and eventually Phase 13 rollups) starts from ranked facts, not intuition.

## 3. Non-Goals

Explicitly out of scope — proposing any of these inside 0D-5 branches is a review rejection:

- **No query rewrites** — not even "obviously safe" ones. SQL is frozen; 0D-5 observes it.
- **No indexes** — §14 defines when a future branch may add one; this phase only gathers the evidence.
- **No caching** of any kind (HTTP, in-process, SWR) beyond the existing 0D-4 in-memory tab cache, which is *measured*, not modified.
- **No Redis** or any new infrastructure dependency.
- **No materialized views, no rollups** — Phase 13 territory; this phase produces the numbers Phase 13 is gated on.
- **No warehouse / external analytics store.**
- **No schema changes** — no new tables, columns, or Prisma migrations. The benchmark dataset uses the existing schema; run metadata lives in output files, not the database.
- **No production observability** — no pino, no request IDs, no metrics endpoints (Phase 10B). Instrumentation here is benchmark-only and off by default (§9).
- **No feature work** — no new metrics, endpoints, tabs, or UI changes.
- **No load/stress testing** — this is single-user latency baselining, not concurrency soak testing (that arrives with Phase 10A/11 work when the async pipeline exists).
- **No CI integration** — benchmarks run manually; automating them in CI is a Phase 9+ decision.

## 4. Current Repository Assessment (verified at commit `5d2faa7`)

*Cross-checked 2026-07-15 against an independent read-only Codex performance inventory; no material discrepancies. Codex additions folded in below: the Behavior over-fetch quantification (§21), the no-abort frontend note (§8), and the trend-threshold dataset gap (§6).*

**Analytics modules** (`apps/server/src/analytics/`, 12 files, ~2,297 lines):

| File | Lines | Raw SQL statements |
|---|---|---|
| `analyticsScope.ts` | 338 | 0 (SQL fragments only) |
| `summary.ts` (per-tab composers) | 229 | 0 |
| `eventActivity.ts` | 197 | 9 (8 unconditional + 1 all-projects-only) |
| `trend.ts` | 170 | 4 (span + 3 mutually exclusive variants) |
| `comparison.ts` | 73 | 1 |
| `commerceFunnel.ts` | 225 | 1 |
| `sessionFunnel.ts` | 218 | 1 |
| `shopperSummary.ts` | 41 | 1 |
| `productPerformance.ts` | 378 | 2 (3-CTE each) |
| `healthInsights.ts` | 291 | 0 (pure) |
| `shared/aliases.ts` / `shared/numbers.ts` | 119 / 18 | 0 |

**Raw SQL count:** 19 statements total in the analytics directory. (Elsewhere in the server: `event.controller.ts` 7, `alertEvaluation.ts` 2, `project.controller.ts` 1, `alert.controller.ts` 1 — out of scope for this baseline except as write-path context.)

**Tab mapping** (from `summary.ts` composers; a tab request executes exactly these):

| Tab | Composer | Statements executed |
|---|---|---|
| overview | `buildOverviewSummary` | 9 activity (8 when project-scoped) + 1 trend + 1 comparison, plus 1 sequential span query when range=all → **11–12** (10–11 project-scoped) |
| conversion | `buildConversionSummary` | commerce counts + session funnel → **2** |
| products | `buildProductsSummary` | product CTE + category CTE → **2** |
| shoppers | `buildShoppersSummary` | **1** |
| behavior | `buildBehaviorSummary` | same `fetchEventActivity` as overview → **9** (8 project-scoped) |
| sales | none | **0** |

**Current concurrency:** each composer runs one `Promise.all`; `fetchEventActivity` nests its own 9-slot `Promise.all`. For an all-projects Overview request this means **11 simultaneous `$queryRaw` calls** — but `config/prisma.ts` creates `new Pool({ connectionString })` with the `pg` default of **max 10 connections**. One statement necessarily waits for a free connection on every all-projects Overview load; project-scoped Overview issues exactly 10. This is a real, verifiable serialization point that the benchmark must observe (§17) and this phase must **not** fix.

**Current indexes** (from `prisma/schema.prisma`, confirmed against migrations):
- `Event`: `(userId, createdAt DESC)`, `(projectId, createdAt DESC)`, `(projectId, customerId)`, `(projectId, sessionId)`, `(projectId, sessionId, createdAt)`, unique `(apiKeyId, idempotencyKey)`
- **Not indexed:** `name` in any form (all funnel/alias filters use `LOWER(name) IN (...)` — an expression no index covers), `properties` (no GIN), `customerId`/`sessionId` without a projectId prefix (relevant to all-projects shopper queries).
- `Project`: pk only + FK patterns — no `(userId, status)` index (relevant to inventory query #9; immaterial at Project-table cardinality, but the baseline should confirm rather than assume). `Alert`/`AlertTrigger` indexed but out of scope.

**Current instrumentation:** effectively none.
- Prisma client created with **no `log` option** → no query timing available anywhere.
- HTTP logging is one `console.log` request line in `server.ts` (method + URL, no duration, no status).
- No timers, no request IDs, no `EXPLAIN` tooling, no benchmark scripts.
- Frontend has zero timing code; `useAnalyticsTabData` (177 lines) tracks request staleness but not duration.

**Package scripts:** root `dev/build/lint/typecheck` via Turborepo; server adds `prisma:*` and `seed:commerce-demo` (tsx). **No `bench:*` scripts exist.** Server dev runs under `tsx watch`; production entry is `node dist/server.js` after `tsc`.

**Environment configuration:** `config/env.ts` reads `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`; `config/prisma.ts` requires `DATABASE_URL` and builds a `@prisma/adapter-pg` Pool. There is **no separate benchmark database URL** concept yet — the seeder and scripts must introduce one as an env-only convention (§10), not as code in `env.ts` beyond reading it.

**Existing seed (`scripts/seedCommerceDemoData.ts`, 866 lines):** deterministic *draws* via `createRng(20260709)` (LCG), three demo projects, journey-weighted sessions — but timestamps anchor to `Date.now()` at run time, volumes are demo-scale, and it targets the developer's own account with delete-and-reseed semantics (guarded by `NODE_ENV`, `SEED_USER_EMAIL`, `CONFIRM_RESET_COMMERCE_DEMO=true`). **It is a good pattern library but not a benchmark seeder:** not tiered, not reproducible across days, and pointed at the dev database.

**Frontend (verified):** `AnalyticsOverview.tsx` (228 lines) computes `scopeKey`/`scopeQuery` and remounts per scope; `useAnalyticsTabData` fetches only the active data tab, caches per `scopeKey`, refreshes only the active tab; Sales is excluded at the type level (`AnalyticsDataTabId`). Loading is per-panel. All 0D-4 acceptance behavior is present. One measurement-relevant detail: stale responses are *ignored* via per-tab request IDs but in-flight requests are **not aborted** (no `AbortController`), so rapid tab switching can briefly overlap two tab requests server-side — which also means overlapping `Promise.all` fan-outs contending for the 10-connection pool. 0D-5 measures single-flight only (§3); the manual frontend protocol must account for this (§8).

**Current limitations this phase must work around:**
1. No per-query timing exists → benchmark-only instrumentation needed (§9).
2. Preset ranges are `NOW()`-relative in SQL → dataset must be seeded relative to a recorded anchor (§6).
3. Node version is not pinned anywhere (no `.nvmrc`, no `engines` field) → environment recording must capture actual runtime versions per run (§5).
4. Zero tests (Phase 9 pending) → benchmark scripts must be read-only against the app and self-verifying (row-count manifests, §6).

## 5. Benchmark Environment

Design principle: **record everything that could move a number; pin what can be pinned cheaply; never trust a measurement whose environment wasn't captured.**

| Dimension | Specification |
|---|---|
| Machine | Developer's macOS workstation (Darwin 25.x, Apple Silicon assumed — record `sysctl -n machdep.cpu.brand_string`, core count, memory). Benchmarks are **relative** baselines on this machine class, not absolute SLOs. AC power, no thermal-throttling workloads running; note anything unusual in the run record. |
| PostgreSQL | Local Homebrew PostgreSQL **14.18** (record `SELECT version()` per run). Record `shared_buffers`, `work_mem`, `effective_cache_size`, `jit` (`SHOW ALL` filtered) into the run output. Settings are **not** tuned for the baseline — measure the defaults developers actually run. |
| Benchmark database | A dedicated database, e.g. `eventpulse_bench` (URL via `BENCHMARK_DATABASE_URL`). Never the dev DB, never anything without `bench` in its name (§20). Schema applied via `prisma migrate deploy` against that URL. |
| Runtime | Server benchmarked as the compiled production entry: `bun run build` then `node dist/server.js` with `DATABASE_URL` pointed at the bench DB — not `tsx watch` (watch-mode and transpile overhead would pollute numbers). Record `node --version`, `bun --version` (1.3.14 today), commit hash, and dirty/clean tree state per run. |
| Timezone | Analytics use the **database session timezone** convention (naive `timestamp` columns; documented in `trend.ts` and `analyticsScope.ts`). Record `SHOW timezone` and the OS timezone per run. Do not change either between baseline and comparison runs. |
| Cold state | Defined as: server process freshly started + `SELECT pg_stat_reset()` + first request per matrix cell. True OS-page-cache cold (reboot/purge) is deliberately out of scope — unreproducible on a shared dev machine. Cold numbers are reported separately and expected to be noisy. |
| Warm state | Requests 2..N+1 of a cell, after the cold request primed connection pool, Prisma prepared statements, and PG buffers. Warm is the primary baseline statistic. |
| Statistics | Per cell: N = **10** warm repetitions (§13 for EXPLAIN repeats). Report min / median / p95 / max; median is the headline, p95 the budget metric. No mean (outlier-fragile at N=10). |
| Database statistics | `ANALYZE` (the SQL command) runs once after seeding, before any measurement, so the planner has fresh statistics; autovacuum left at defaults but the seeder's manifest records `pg_stat_user_tables.n_dead_tup` at measurement start. |
| Pool | The `pg` default pool (max 10) is part of the measured system — record it, do not change it (§17). |
| Deterministic timestamps | All seeded `createdAt` values are **deterministic offsets from a recorded anchor** (§6). Preset ranges (`NOW() - interval`) are then reproducible *within a run window*; the runner records anchor→run-start drift and fails if it exceeds 6 hours (a 24h-range cell would otherwise measure a different data slice). |

**What must be recorded per run** (into the §12 JSON): commit hash + branch + dirty flag, node/bun/postgres versions, PG settings snapshot, machine descriptor, OS + DB timezone, dataset tier + seed + anchor + manifest hash, pool max, run timestamps, and the anchor-drift value.

## 6. Synthetic Dataset Design

**Requirements:** deterministic (same seed → same rows, same counts, same offsets), tiered, isolated to the bench DB, realistic in shape (journey-weighted funnels, alias variety, missing optional fields), and honest to the Tracking Contract (pseudonymous IDs, no PII, decimal-major-unit money in properties).

**Determinism model.** Reuse the proven `createRng(seed)` LCG pattern from `seedCommerceDemoData.ts`, but fix its one nondeterminism: timestamps become `anchor − deterministicOffset(rng)` where **anchor** = seed-run start truncated to the hour, recorded in a manifest file (`benchmarks/dataset-manifest.json`, gitignored) together with tier, seed, per-table row counts, and per-event-name counts. Two seed runs with the same tier+seed produce identical row sets except for the anchor shift — meaning identical query cardinalities for every matrix cell. The manifest hash is the dataset's identity in all outputs.

**Benchmark account:** the seeder creates (or reuses) a dedicated local user `bench@eventpulse.local` with a password taken from `BENCHMARK_USER_PASSWORD` (no default committed; dev-only). All benchmark data belongs to that user — cleanup can never touch real dev data (§20). A second tiny account with ~1k events is also seeded to verify tenant isolation doesn't distort plans (and as a scope sanity check).

**Recommended tiers:**

| Parameter | Small | Medium | Large |
|---|---|---|---|
| Purpose | smoke / fast iteration on the harness itself | **primary baseline tier** | stress tier; exposes seq-scan and sort-spill behavior |
| Projects | 3 | 5 | 8 |
| Products per project | 40 | 200 | 600 |
| Categories per project | 8 | 15 | 25 |
| Customers (total) | 2,000 | 30,000 | 250,000 |
| Sessions (total) | 6,000 | 110,000 | 950,000 |
| Events (total, approx.) | ~30,000 | ~550,000 | ~5,000,000 |
| Date spread | 45 days | 90 days | 400 days |
| Seed | 501 | 502 | 503 |
| Approx. seed time (createMany batches of 10k) | seconds | ~1–2 min | ~10–20 min |

Date spreads are chosen to land on **both sides of the all-time trend threshold** (`ALL_TIME_MONTHLY_THRESHOLD_DAYS = 60` in `trend.ts`): small's 45-day spread makes the all-time trend resolve to **day** granularity — the only tier exercising that branch of query #13 — while medium (90d) and large (400d) resolve to **month**. Without this, the day-granularity all-time SQL path would never be measured.

**Shape rules (all tiers):**
- **Journey mix** per session, reusing the demo seeder's journey taxonomy: browse_only ~55%, product_interest ~20%, cart_abandonment ~10%, checkout_abandonment ~6%, payment_failure ~2%, successful_purchase ~3%, friction ~4% — so funnels have realistic drop-offs and `purchase` rows are rare (as in production commerce).
- **Alias variety:** event names drawn across the alias tables in `shared/aliases.ts` (e.g., sessions randomly emit `product_viewed` vs `product_view` vs `product_detail_viewed`) so `LOWER(name) IN (...)` filters match realistically, not on one literal. Purchase journeys emit both `purchase_completed` and `payment_completed` per the blueprint's known double-emission — the baseline must reflect real ingested shapes.
- **Cart/checkout/purchase properties** per the Tracking Contract: `product_id`, `product_name`, `category`, `quantity`, `cart_value`, `order_id`, `amount`, `currency` — decimal major units, mandatory currency on money.
- **Missing optional fields** (exercises COALESCE/NULL paths and honest-degradation behavior): 5% of events have `sessionId = NULL` and 8% `customerId = NULL` (simulating pre-column legacy rows); 20% of product events lack `product_name`; 30% lack `quantity`; 12% of view/cart events lack `category`; 10% of purchases use `productId` camelCase instead of `product_id` (both are read by the CTEs).
- **Multi-project customer IDs:** 10% of customer IDs are reused verbatim across projects — verifying the `(projectId, customerId)` identity rule has measurable data and that all-projects counts differ from naive sums.
- **Date spread:** daily volume follows a weekly seasonality curve plus 3 deterministic spike days (feeds the insight/spike code paths); 30% of volume in the trailing 30 days, 10% in the trailing 24 hours — so each preset range selects a meaningfully different row count.
- **Property-key variety:** ~25 distinct top-level property keys across event types, with per-event object width varying from 2 to ~20 keys, so `jsonb_object_keys` (topProperties) has realistic expansion width and detoasting behavior.
- **Name-case variety:** a small share (~3%) of event names arrive mixed-case (e.g. `Product_Viewed`) — ingestion stores names as sent, and every funnel/alias filter pays for `LOWER(name)` per row; the dataset must make that cost real rather than letting all-lowercase data flatter it.

## 7. Benchmark Matrix

Dimensions: **Tabs** {overview, conversion, products, shoppers, behavior} × **Scopes** {single project (the largest seeded project), all projects} × **Ranges** {24h, 7d, 30d, custom (45-day calendar window ending 5 days before anchor — deterministic, exercises the custom SQL path with day buckets), all} × **Tiers** {small, medium, large}.

Full cross product = 5×2×5 = **50 cells per tier**. Practical execution:

| Tier | Cells | Rationale |
|---|---|---|
| Small | 50 (full matrix, N=5 warm) | cheap; validates the harness and catches gross scaling surprises |
| Medium | 50 (full matrix, N=10 warm) | **the baseline of record** |
| Large | 20 (all tabs × all-projects × {7d, 30d, all}, plus products/overview × single-project × {30d, all}) | targets the cells where size changes plan shape; keeps the run under ~30 min |

Per cell: 1 cold + N warm requests, sequential (no artificial concurrency — §3 excludes load testing). Total ≈ 50×6 + 50×11 + 20×11 ≈ 1,070 requests per full run. The runner also fires one `?tab=bogus` (expect 400) and one unauthenticated request (expect 401) per run as contract canaries.

Frontend cells (§8, manual): default-load Overview, tab-switch to Products, cached revisit to Overview — medium tier only.

## 8. Metrics To Capture

**API level (per request, from the runner):**
- wall-clock response time (ms, high-resolution timer around `fetch`)
- HTTP status (anything non-200 marks the cell failed; failures are recorded, never discarded silently)
- payload size: `Content-Length` (or byte length of body) — per tab/scope/range
- query count executed for the request (from the instrumentation stream, §9; cross-checked against the §4 expected counts — a mismatch is a finding, not noise)

**Module / query level (per statement, from Prisma query events + EXPLAIN):**
- execution time per statement (Prisma event `duration`)
- rows returned
- from `EXPLAIN (ANALYZE, BUFFERS)`: planning time, execution time, shared buffers hit vs read (cache behavior), temp buffers (spill signal), sort method (quicksort vs external merge), hash batches (>1 = memory pressure), node types (Seq Scan / Index Scan / Bitmap) per inventory query
- share of tab wall time per statement (identifies the dominant query per tab)

**Frontend (manual procedure, medium tier, documented in the report — no frontend code changes):**
- time to first useful render of a tab panel (DevTools Performance panel: navigation → first panel content paint, 3 samples, median)
- tab-switch latency, uncached (click → panel data rendered)
- cached revisit (click → render; must show **zero network requests** — verified in the Network panel)
- payload bytes per tab as delivered (Network panel; should match API-level capture)
- **Protocol constraint:** because the hook ignores stale responses but does not abort in-flight requests (§4), each manual measurement waits for the previous tab's request to settle before the next switch. Rapid-switch overlap behavior is *noted* if observed (overlapping fan-outs contending for the pool) but not systematically measured — that is concurrency/load territory, excluded by §3.

## 9. Instrumentation Design

Evaluated options:

| Option | Verdict |
|---|---|
| Temporary timers hand-inserted in composers/fetchers | **Rejected.** Touches every module, guaranteed leftover-debris risk, violates "no unrelated changes," and duplicates what Prisma events provide. |
| Structured logging framework (pino etc.) | **Rejected.** That is Phase 10B production observability — explicit non-goal. |
| Request IDs | **Rejected** for 0D-5 (Phase 10B). The benchmark runner is single-flight sequential, so responses correlate to requests by ordering; no ID needed. |
| `EXPLAIN ANALYZE` harness (script-side) | **Accepted** — §13. Lives entirely in scripts; zero app changes. |
| Postgres-side `pg_stat_statements` / `auto_explain` | **Accepted as optional corroboration.** Requires superuser/config on the local instance; the design treats it as a bonus, not a dependency, so the harness works on any dev machine. |
| Benchmark scripts timing HTTP calls | **Accepted** — primary API-level source; zero app changes. |
| Prisma query-event logging | **Accepted with one minimal, env-gated source change** (below) — the only way to get per-statement timings inside a real tab request without touching any query module. |

**The single permitted source change (0D-5B):** `config/prisma.ts` gains an env-gated log option — when `BENCHMARK_QUERY_LOG=true`, the client is constructed with `log: [{ emit: "event", level: "query" }]` and a listener that writes `{sql-hash, duration, timestamp}` lines to the file named by `BENCHMARK_QUERY_LOG_FILE`. Absent the env var, the constructed client is **bit-identical to today's** (no log option, no listener registered). This is ~15 lines, additive, off by default, in one file. Rationale for allowing it: every alternative (module timers, global prisma injection hacks) is strictly more invasive or more fragile. Review gate: the diff must show the default path unchanged and no other file touched.

**Everything else lives under `apps/server/scripts/benchmark/`** and is invoked manually. Nothing runs in production paths; nothing changes response bodies; the analytics modules, controller, scope, and frontend are not edited in this phase (frontend timing is a manual DevTools procedure by design).

## 10. Benchmark Scripts (design only — implemented in 0D-5A/B/C)

All scripts live in `apps/server/scripts/benchmark/`, run with `tsx`, read `BENCHMARK_DATABASE_URL` (and refuse to run without it), and share a guard module that (a) requires the database name to contain `bench`, (b) refuses when `NODE_ENV=production`, (c) prints the resolved target before acting.

| Script | `seed-benchmark-data.ts` |
|---|---|
| Purpose | Create/refresh one deterministic dataset tier in the bench DB |
| Inputs | `--tier=small\|medium\|large` (required) · `BENCHMARK_DATABASE_URL` · `BENCHMARK_USER_PASSWORD` · `--append-tier-user` (optional second-tenant toggle, default on) |
| Outputs | Seeded rows; `benchmarks/dataset-manifest.json` (tier, seed, anchor, row counts per table and per event name, manifest hash); console summary |
| Command | `bun run bench:seed -- --tier=medium` |
| Safety | Guard module; deletes **only** rows owned by `bench@eventpulse.local` (and the secondary bench tenant), and only after `CONFIRM_RESET_BENCHMARK=true`; runs `ANALYZE` afterward |

| Script | `run-benchmarks.ts` |
|---|---|
| Purpose | Execute the §7 matrix over HTTP against a running server; produce the §12 outputs |
| Inputs | `--tier=…` (must match manifest) · `--cells=…` (optional filter, e.g. `products:*:30d`) · `--warm=N` · server URL · bench credentials (signs in via the real auth endpoint) |
| Outputs | `benchmarks/results/<timestamp>-<commit>-<tier>.json` + `.md` summary (§12); nonzero exit if any cell errored or anchor drift exceeded 6h |
| Command | `bun run bench:run -- --tier=medium` |
| Safety | Read-only traffic (GETs + one signin); refuses if the server's `/health` DB doesn't match `BENCHMARK_DATABASE_URL` hint — practical check: a `bench-canary` project name seeded by 0D-5A must be visible to the bench user, else abort |

| Script | `collect-explain.ts` |
|---|---|
| Purpose | Run `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` for each §11 inventory query directly (importing the analytics modules' SQL via a thin re-export or reconstructing scope with `createAnalyticsScope`), per §13 protocol |
| Inputs | `--tier=…` · `--queries=…` (optional subset) · scope/range parameters mirroring the matrix |
| Outputs | `benchmarks/results/<timestamp>-explain-<tier>.json` (plan JSON per query/cell) + condensed plan-summary rows merged into the `.md` |
| Command | `bun run bench:explain -- --tier=medium` |
| Safety | SELECT-only by construction (all 19 inventory statements are SELECTs); guard module; wraps each EXPLAIN in a `READ ONLY` transaction |

| Script | `cleanup-benchmark-data.ts` |
|---|---|
| Purpose | Remove bench-tenant data (or print what it would remove) |
| Inputs | `--dry-run` (default true; must pass `--execute` plus `CONFIRM_BENCHMARK_CLEANUP=true`) |
| Outputs | Deletion counts; refuses to touch any user other than the two bench accounts |
| Command | `bun run bench:cleanup -- --execute` |
| Safety | Guard module; tenant-filtered deletes only; never `DROP`/`TRUNCATE`; never targets a non-bench URL |

Plus four `bench:*` script entries in `apps/server/package.json` and a `.gitignore` entry for `benchmarks/results/` and `benchmarks/dataset-manifest.json` (§12 decides what is committed).

## 11. Query Inventory (all 19 statements, verified in source)

Risk = expected cost driver at large tier, judged from SQL shape + index coverage (to be confirmed/refuted by measurement — that's the point).

| # | Module | Query | Tab(s) | Risk | Joins | Grouping | Ordering | Expected EXPLAIN focus | Index coverage today |
|---|---|---|---|---|---|---|---|---|---|
| 1 | eventActivity | total events COUNT | overview, behavior | Low | — | — | — | index vs seq scan on range width | `(userId, createdAt)` / `(projectId, createdAt)` |
| 2 | eventActivity | events today COUNT | overview, behavior | Low | — | — | — | same, `>= CURRENT_DATE` | same |
| 3 | eventActivity | COUNT(DISTINCT name) | overview, behavior | Medium | — | implicit distinct | — | agg strategy over scoped rows; `name` uncovered | scope index only; `name` fetched from heap |
| 4 | eventActivity | COUNT(DISTINCT projectId) | overview, behavior | Low | — | implicit distinct | — | trivial | covered by either scope index |
| 5 | eventActivity | top 10 events | overview, behavior | Medium | — | GROUP BY name | count DESC LIMIT 10 | HashAggregate size; sort | `name` uncovered |
| 6 | eventActivity | events by project | overview, behavior | Medium | JOIN Project | GROUP BY projectId, p.name | count DESC LIMIT 10 | join order; agg | scope index; Project pk |
| 7 | eventActivity | recent 10 events | overview, behavior | Low | JOIN Project | — | createdAt DESC LIMIT 10 | should be a pure index scan + nested loop | `(userId, createdAt DESC)` ideal |
| 8 | eventActivity | top property keys | overview, behavior | **High** | lateral `jsonb_object_keys` | GROUP BY key | count DESC LIMIT 10 | per-row jsonb expansion; detoasting; agg width | none possible today |
| 9 | eventActivity | total ACTIVE projects (all-projects only) | overview, behavior | Low | — | — | — | trivial (Project table) | small table |
| 10 | trend | all-time span (MIN createdAt) | overview (all only) | Low | — | — | — | index min lookup | `(userId, createdAt)` |
| 11 | trend | preset buckets (24h/7d/30d) | overview | Medium | LEFT JOIN Event ON `date_trunc(createdAt)=bucket` | GROUP BY bucket | bucket ASC | join strategy on expression equality (hash vs nested-loop re-scan) | expression uncovered; scope filter helps |
| 12 | trend | custom buckets | overview (custom) | Medium | same | same | same | same | same |
| 13 | trend | all-time buckets | overview (all) | **High** | same, over **entire history** | same | same | full-history scan + expression join | `(userId, createdAt)` start only |
| 14 | comparison | FILTER pair current/previous | overview | **High** | — | — | — | **WHERE is unbounded ownership** — scans all user events regardless of range; FILTER selectivity | `(userId, createdAt)` unusable for the range (range lives in FILTER) |
| 15 | commerceFunnel | alias counts | conversion | Medium | — | GROUP BY LOWER(name) | — | `LOWER(name) IN` = heap filter over scoped rows | expression uncovered |
| 16 | sessionFunnel | 5× COUNT(DISTINCT sessionId) FILTER | conversion | **High** | — | — | — | distinct-agg memory; one pass over scoped rows with 5 filtered distincts | `(projectId, sessionId)` may help agg, not the name filters |
| 17 | shopperSummary | 3× COUNT DISTINCT | shoppers | Medium | — | — | — | same family as 16, fewer aggs | same |
| 18 | productPerformance | product 3-CTE | products | **Highest** | Event⋈Project, self-join via CTEs | 2 GROUP BY layers | composite score DESC LIMIT 15 | CTE materialization; jsonb extraction per row; ARRAY_AGG ordering; hash join product×purchase sessions; sort spill | scope index for outer filter only; everything inside is heap work |
| 19 | productPerformance | category 3-CTE | products | **Highest** | same | same | LIMIT 8 | same | same |

**Highest-risk module:** `productPerformance.ts` — two triple-CTE statements per Products request, each extracting/BTRIMming jsonb per row, aggregating per (project, product/category, session), then re-aggregating with ordered `ARRAY_AGG` and five `COUNT FILTER`s. **Highest-risk single Overview statement:** the comparison query (#14), whose cost never shrinks with the selected range.

## 12. Output Format

Two artifacts per run, one directory convention:

**JSON (machine-readable, `benchmarks/results/<runstamp>-<commit>-<tier>.json`):**

```jsonc
{
  "run": { "timestamp": "...", "commit": "5d2faa7", "branch": "main", "dirty": false },
  "environment": { "node": "...", "bun": "1.3.14", "postgres": "14.18",
                   "pgSettings": { "shared_buffers": "...", "work_mem": "..." },
                   "machine": "...", "dbTimezone": "...", "poolMax": 10 },
  "dataset": { "tier": "medium", "seed": 502, "anchor": "...",
               "manifestHash": "...", "anchorDriftMinutes": 12 },
  "cells": [
    { "tab": "products", "scope": "all", "range": "30d",
      "cold": { "ms": 412, "status": 200 },
      "warm": { "n": 10, "minMs": 180, "medianMs": 195, "p95Ms": 240, "maxMs": 260 },
      "payloadBytes": 8123, "queryCount": 2,
      "queries": [ { "id": 18, "medianMs": 130, "rows": 15, "shareOfTab": 0.67 }, ... ],
      "errors": [] }
  ],
  "explain": [ { "queryId": 18, "scope": "all", "range": "30d",
                 "planningMs": 1.2, "executionMs": 128.4,
                 "buffers": { "hit": 10234, "read": 210, "tempWritten": 0 },
                 "sortMethod": "quicksort", "hashBatches": 1,
                 "dominantNode": "Seq Scan on Event", "planJson": { } } ],
  "contractCanaries": { "unknownTab400": true, "unauthenticated401": true }
}
```

**Markdown summary (human-readable, same basename `.md`):** environment block; one table per tab (rows = scope×range, columns = cold / warm median / p95 / payload / dominant query); a plan-summary table for the §11 high-risk queries; an anomalies section (failed cells, count mismatches, pool-wait observations).

**Committed vs ignored — decision:** raw per-run outputs under `benchmarks/results/` are **gitignored** (large, frequent, machine-specific). When a run is designated the **baseline of record**, its `.md` summary and a pruned JSON (cells + explain summaries, no full plan JSON) are copied to `benchmarks/baselines/<phase>-<commit>-<tier>.{md,json}` and **committed** in the 0D-5C branch. Rationale: regression comparison (§18) needs a durable, reviewable anchor in-repo; full raw dumps would be noise. The dataset manifest is gitignored (reproducible from seed+tier) but its hash is embedded in every committed baseline.

## 13. EXPLAIN Strategy

- **Form:** `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` — never plain estimate-only EXPLAIN for baselines (estimates are the thing we're auditing).
- **Safety:** all 19 inventory statements are SELECTs; `collect-explain.ts` additionally wraps every run in `BEGIN READ ONLY … ROLLBACK` so a future mistake cannot write. EXPLAIN ANALYZE **executes** the query — acceptable because they are read-only and bench-DB-only.
- **Repeat count:** 6 executions per query/cell — first discarded as cache-priming ("cold plan" is still recorded separately once per query at run start), median and p95 of the remaining 5 reported.
- **Cold vs warm:** the run-start cold pass happens immediately after server start + `pg_stat_reset()`; warm passes follow consecutively. Buffers hit/read ratios are the honest signal distinguishing the two.
- **Read-only only:** EXPLAIN is never attached to any INSERT/UPDATE path; the ingestion write path is *not* EXPLAINed in this phase (its baseline is out of scope; noted for the future index-cost work in §14).
- **Benchmark database only:** the guard module refuses any URL whose database name lacks `bench`. EXPLAIN ANALYZE against the dev DB or any production-like DB is prohibited — it consumes real resources and could skew autovacuum/stats.
- **Scope:** full inventory at medium tier; high-risk subset (#8, 13, 14, 16, 18, 19) additionally at large tier; small tier skipped (plans at toy sizes mislead) **except** query #13's day-granularity all-time variant, which only exists at small tier (§6 date spreads) and is EXPLAINed there.
- **Params:** each EXPLAIN uses the same `AnalyticsScope`-generated fragments as the real request (constructed via `createAnalyticsScope` with the matrix cell's parameters) so plans reflect production parameterization, not hand-typed literals.

## 14. Index Review Rules

**No index is added in 0D-5.** This section defines the evidence bar a *future* branch must clear:

1. **A number first:** the query exceeds its §15 budget (or dominates a tab that does) at the medium tier, in the committed baseline — not in an ad-hoc run.
2. **A plan second:** the baseline EXPLAIN shows the specific pathology the index would fix (seq scan with low selectivity filter, external-merge sort, hash batches > 1), attributable to the missing index — not generic "seq scan exists" (seq scans over small scoped sets are often correct).
3. **Selectivity justification:** the proposed index's leading columns must be shown (from manifest counts) to select a small fraction of scoped rows. An index on `LOWER(name)` is plausible for funnel queries (alias lists match a minority of events); it must be argued with the actual ratio.
4. **Write-path cost acknowledged:** every `Event` index taxes ingestion (which still runs synchronous alert evaluation). The proposal must state the added index-maintenance cost and, once an ingestion baseline exists, measure it.
5. **Before/after on the bench tier:** the change lands with baseline-vs-candidate numbers from the same tier/seed/procedure (standards §16, "Performance work").
6. **Standards §9 still applies** to *new query shapes* in future features (index accompanies the new access pattern) — that rule is about new code, not about retrofitting the frozen 0D queries, which go through rules 1–5.

Expected candidates the baseline will confirm or kill (hypotheses, not commitments): expression index on `LOWER(name)` (or a generated column) for funnel/alias filters; `(userId, name)`-family coverage for top-events; a comparison-query rewrite candidate (bounding the WHERE) — which is a **query change**, hence explicitly deferred past 0D-5 with the same evidence bar.

## 15. Performance Budgets (provisional — hypotheses, not commitments)

These are **starting hypotheses to make the baseline falsifiable**, chosen from UX reasoning (tab switch should feel instant-ish; first load under a second on dev hardware) — not from measurement, because none exists yet. The baseline run either validates them or replaces them with evidence-based numbers in the findings report. They are *not* SLOs and must be re-derived before any production claim.

| Surface (medium tier, warm, local) | Budget hypothesis (median / p95) |
|---|---|
| shoppers tab API | 60 ms / 120 ms |
| conversion tab API | 120 ms / 250 ms |
| behavior tab API | 200 ms / 400 ms |
| overview tab API | 250 ms / 500 ms |
| products tab API | 400 ms / 800 ms |
| any single query | 300 ms p95 |
| payload per tab | ≤ 50 KB |
| frontend uncached tab switch (medium) | ≤ 1.0 s to useful render |
| frontend cached revisit | ≤ 100 ms, zero requests |

Large-tier budgets are deliberately not set — large exists to expose scaling shape, not to pass gates.

## 16. Cold vs Warm Methodology

- **Cold (per run, once per cell):** fresh `node dist/server.js` process → `pg_stat_reset()` → first request of the cell. Captures pool creation, Prisma prepared-statement compilation, and PG buffer misses. Reported separately; expected variance is high and that's fine — cold exists to bound the worst first-paint, not to gate.
- **Warm (the baseline):** the next N requests of the same cell, back-to-back. Reported as min/median/p95/max.
- **Order effects:** cells execute in a fixed, recorded order (tabs grouped, ranges ascending) so cross-cell buffer warming is at least consistent between runs; the order is part of the procedure, documented in the runner.
- **OS page cache:** not controlled (no purge/reboot); acknowledged as a bounded source of run-to-run variance covered by §18's variance allowance.
- **What "cold" does *not* include:** database restart, OS cache purge, connection-pool tuning. Documented so nobody mistakes these numbers for cold-start SLOs.
- **Buffers as the honesty check:** EXPLAIN `shared read` vs `shared hit` counts are recorded so a "warm" number secretly reading from disk is visible instead of silently averaged.

## 17. Concurrency Review (verify, do not modify)

What the benchmark must verify and record:

1. **`Promise.all` shape:** confirm by code inspection (already done, §4) and by observation that per-tab statements run concurrently: with `BENCHMARK_QUERY_LOG` timestamps, concurrent statements' start times cluster within a few ms; serialized ones stagger by full durations. Sum(query durations) ≫ tab wall time is the concurrency fingerprint.
2. **The pool-11-vs-10 finding:** all-projects Overview issues 11 concurrent statements against `pg` default `max: 10`. Expected observable: one statement's start timestamp lags by roughly the duration of the fastest earlier statement. The runner's report must state whether this wait is measurable and how large it is (it may be trivially small — that's a legitimate finding too).
3. **Pool sizing recorded, not changed:** `poolMax: 10` goes in the environment block. If the wait proves material, the *finding* recommends a follow-up branch (post-0D-5) with before/after measurement — 0D-5 itself does not touch `config/prisma.ts` pool config.
4. **Sequential span query:** confirm the all-time Overview path really is span → parallel batch (one extra serial round-trip) and quantify its cost share.
5. **Serialization audit:** for each tab, report expected-vs-observed statement count and a concurrency ratio (wall time ÷ sum of statement times). A tab whose ratio is ~1.0 despite multiple statements indicates accidental serialization — a finding, not a fix.
6. **No cross-request concurrency testing** — the matrix is single-flight by design (§3).

## 18. Regression Baseline

How future work compares against this baseline:

- **Committed anchor:** the 0D-5C baseline files (`benchmarks/baselines/…`) are the comparison target. Every future performance-relevant branch reruns the matrix (same tier, same seed, fresh dataset from the same seeder version) and diffs against them.
- **Dataset consistency:** comparisons are valid only when manifest hashes match (same seeder logic + seed + tier). If the seeder itself changes, a new baseline must be cut and both are kept — never compare across manifest hashes.
- **Acceptable variance (local dev hardware):** warm median ±15%, warm p95 ±25%, cold informational-only. Movements inside the band are noise; outside it, the branch must explain (intentional improvement with credit, or regression with justification/rollback). These bands are themselves hypotheses to be tightened after the first few reruns establish real run-to-run variance (the 0D-5C validation includes a same-commit double run to measure it).
- **Commit comparison discipline:** a comparison report names both commits, both run files, the variance band, and per-cell deltas exceeding it. The runner gets a `--compare=<baseline file>` convenience mode (designed in 0D-5C) that emits exactly this.
- **What triggers a rerun:** any change to analytics SQL, scope fragments, composers, Prisma/pg versions, or Postgres major version; plus Phase 13's gate decision. Routine frontend or unrelated-backend branches do not rerun.
- **Environment drift:** if node/bun/PG versions differ from the baseline's environment block, the report must say so; version-drifted comparisons are directional, not gating.

## 19. Branch Strategy

The suggested split (0D-5A dataset / 0D-5B explain harness / 0D-5C baseline reporting) is **accepted with one re-ordering challenge**: the HTTP benchmark runner should land *before* the EXPLAIN harness, because (a) API-level timings are the phase's primary deliverable and are useful immediately with zero source changes beyond scripts, (b) the runner's per-query stream (the one env-gated Prisma change) tells us *which* queries deserve EXPLAIN attention, making the EXPLAIN branch better targeted, and (c) EXPLAIN without timing context invites premature plan-reading. Revised split:

| Branch | Scope (exact) | Validation | Commit message |
|---|---|---|---|
| **0D-5A** `feature/benchmark-dataset` | `scripts/benchmark/` guard module + `seed-benchmark-data.ts` + `cleanup-benchmark-data.ts`; tiered deterministic generator per §6 (anchor-offset timestamps, manifest emission, bench tenant, ANALYZE); `bench:seed`/`bench:cleanup` package scripts; `.gitignore` entries for `benchmarks/` outputs. **No app-code changes.** | typecheck · build · seed small tier twice → identical manifest counts (only anchor differs) · seed medium tier → spot-check tab responses return plausible data for the bench user via curl · cleanup dry-run lists only bench-tenant rows · guard refuses a non-`bench` URL and refuses without confirmations | `feat: add deterministic benchmark dataset seeder` |
| **0D-5B** `feature/benchmark-runner` | `run-benchmarks.ts` (matrix, cold/warm, stats, JSON+MD outputs, contract canaries, `--compare` stub); the single env-gated query-log change in `config/prisma.ts` (§9); `bench:run` script | typecheck · build · **diff proof that `config/prisma.ts` default path is unchanged** (env var unset → constructor options identical) · full small-tier run completes with 0 errors · query counts per cell match §4 expected counts · payload/status recorded · runner exits nonzero on an induced failure (server stopped mid-run) | `feat: add analytics benchmark runner and query timing capture` |
| **0D-5C** `feature/benchmark-explain-baseline` | `collect-explain.ts` (§13 protocol) + `bench:explain` script; `--compare` completion; run the full §7 matrix at all three tiers on the designated baseline commit; commit curated baselines to `benchmarks/baselines/`; findings report per §21 filed as the phase output (in the PR description and baseline `.md`, not in the permanent plan docs) | typecheck · build · explain outputs are read-only (READ ONLY txn present) · medium-tier explain covers all 19 queries · baseline files committed with manifest hash + environment block · same-commit double run recorded to establish real variance (§18) | `feat: capture analytics performance baselines and explain plans` |

Each branch is independently shippable; none touches analytics modules, controller, scope, schema, or frontend. Human owner creates/switches branches and commits, per standards §14.

## 20. Safety Rules

1. **Never benchmark production.** Guard module requirements: `NODE_ENV !== "production"`, `BENCHMARK_DATABASE_URL` set, database name contains `bench`. All four scripts share the guard; a script without it fails review.
2. **No secrets in code or outputs:** bench credentials come from env; run outputs record versions/settings, never connection strings, tokens, or `JWT_SECRET`. The bench user's JWT is held in memory only.
3. **No PII:** dataset uses pseudonymous generated IDs (`bench_customer_00042`), fake product catalogs, no names/emails/addresses in properties — Tracking Contract conformant.
4. **No destructive cleanup:** cleanup is tenant-scoped `deleteMany` on the two bench accounts only, dry-run by default, double-confirmed (`--execute` + `CONFIRM_BENCHMARK_CLEANUP=true`), never `DROP TABLE`/`TRUNCATE`/`DROP DATABASE`. The seeder's reset requires `CONFIRM_RESET_BENCHMARK=true`.
5. **Benchmark data isolated:** dedicated database + dedicated tenant, so even a guard failure has a second wall; the dev database's demo data is never read or written by any bench script.
6. **Read-only measurement:** runner sends GETs (plus one signin POST); EXPLAIN runs inside `READ ONLY` transactions; the instrumentation change cannot alter query behavior (log listener only).
7. **No commit of raw results or manifests** — only curated baselines (§12); `git add` explicit paths only (standards §14).

## 21. Findings Template

Each finding produced by the baseline run uses this row shape (table lives in the baseline `.md` and the 0D-5C PR):

| Field | Content |
|---|---|
| ID | `F-0D5-nn` |
| Surface | tab / query # (§11) / frontend |
| Cell(s) | tier × scope × range where observed |
| Observation | the number (e.g., "products all/30d warm p95 = 1,240 ms; query #18 = 78% of tab time") |
| Evidence | result-file pointer + EXPLAIN summary (dominant node, buffers, spill) |
| Budget verdict | within / exceeds §15 hypothesis (by how much) |
| Hypothesis | suspected cause, stated falsifiably |
| Candidate action | index / query change / pool / defer to Phase 13 / none |
| Evidence bar met? | which §14 rules are already satisfied, which need more data |
| Recommended phase | post-0D-5 index branch / Phase 13 / Phase 9 test target / no action |
| Severity | Critical (budget ×2+ at medium) / High / Informational |

Plus a standing findings section for: pool-wait observation (§17.2), statement-count mismatches, cold/warm anomalies, variance-band measurement (§18), and the **Behavior over-fetch share**: Behavior executes the full `fetchEventActivity` bundle but returns only four of its outputs — statements #2 (events today), #3 (unique names), #4 (active projects), and #9 (total active projects, all-projects scope) are executed and discarded (#1's total *is* used, server-side, for percentages). The baseline must state what share of Behavior tab time these unused statements cost, directly answering 0D-4 §18's open question of whether slicing `eventActivity` is worth a future branch.

## 22. Acceptance Criteria

Phase 0D-5 is complete when **all** of the following hold:

1. The three branches (§19) are merged with their validations reported honestly (runtime-verified vs inspected, per standards §18.7).
2. `bun run bench:seed/run/explain/cleanup` work end-to-end on a fresh bench database, documented in the scripts' header comments.
3. Small, medium, and large tiers seed deterministically: same tier+seed → identical manifest counts; manifest hash embedded in outputs.
4. The full §7 matrix has executed at all three tiers on one designated baseline commit with zero errored cells; contract canaries (400/401) pass.
5. Per-tab cold/warm distributions, per-query timings, payload sizes, and query counts exist for every cell; per-query counts reconcile with §4's expected statement counts (or the discrepancy is a filed finding).
6. EXPLAIN (ANALYZE, BUFFERS) captured for all 19 inventory queries at medium tier and the high-risk subset at large tier, via read-only transactions.
7. Committed baselines exist under `benchmarks/baselines/` with environment blocks and manifest hashes; raw results are gitignored.
8. The concurrency review (§17) is answered with data: per-tab concurrency ratios, the pool-11-vs-10 observation quantified, span-query cost share stated.
9. A findings table (§21) ranks every budget breach and names the highest-cost query per tab; §15 budgets are each confirmed or replaced with measured values.
10. Same-commit double run recorded; real run-to-run variance stated and §18 bands adjusted if needed.
11. **Zero diffs** outside `scripts/benchmark/`, `package.json` script entries, `.gitignore`, `benchmarks/baselines/`, and the single env-gated block in `config/prisma.ts`; analytics modules, controller, scope, schema, migrations, and all frontend files are byte-identical.
12. Frontend manual measurements (first useful render, uncached switch, cached revisit with zero requests) documented for medium tier.

## 23. Codex Handoff — first implementation branch only (0D-5A)

> You are working in the EventPulse repository (Bun + Turborepo; server = Express + Prisma 7 + PostgreSQL under `apps/server`). Phases 0A–0D-4C are complete: analytics is served per-tab from `apps/server/src/analytics/` modules behind a thin controller. Implement **Phase 0D-5A only**: the deterministic benchmark dataset seeder and cleanup. Confirm you are on a clean tree; the human owner will create branch `feature/benchmark-dataset` — do not create or switch branches yourself.
>
> **Read first, edit second:** `~/.claude/plans/analytics-query-performance-phase-0d5.md` (§5, §6, §10, §19 row 0D-5A, §20), `~/.claude/plans/eventpulse-engineering-quality-standards.md` (§§9, 12, 14, 18), `apps/server/scripts/seedCommerceDemoData.ts` (reuse its RNG, journey, and guard patterns), `apps/server/src/analytics/shared/aliases.ts` (event-name variety must draw from these), `apps/server/prisma/schema.prisma`, and `~/.claude/plans/commerce-tracking-contract.md` (property shapes). Note the repo's `AGENTS.md`: this Next.js version differs from your training data — irrelevant here since 0D-5A is server-scripts-only; touch nothing under `apps/web`.
>
> **Scope — exactly this, nothing more:**
> 1. Create `apps/server/scripts/benchmark/guard.ts`: exported assertion requiring `NODE_ENV !== "production"`, `BENCHMARK_DATABASE_URL` set, and the database name in that URL to contain `bench`; prints the resolved target database and tier before any write. All benchmark scripts import it.
> 2. Create `apps/server/scripts/benchmark/seed-benchmark-data.ts` implementing plan §6 exactly: tiers small/medium/large (projects 3/5/8; customers 2k/30k/250k; sessions 6k/110k/950k; ~30k/~550k/~5M events; seeds 501/502/503; date spread 45/90/400 days — small must stay ≤ 60 days so all-time trend resolves to day granularity there, per §6); deterministic LCG (reuse the `createRng` pattern); **all timestamps are deterministic offsets from an anchor = run start truncated to the hour**; journey-weighted sessions with alias variety from `shared/aliases.ts`; missing-optional-field percentages per §6; 10% cross-project customer IDs; Tracking-Contract-shaped properties (snake_case, decimal major units + currency, pseudonymous IDs, no PII). Data belongs to a dedicated user `bench@eventpulse.local` (password from `BENCHMARK_USER_PASSWORD`, created if absent) plus a small secondary tenant (~1k events). Reseeding deletes only these tenants' rows and requires `CONFIRM_RESET_BENCHMARK=true`. Insert via `createMany` batches (~10k). After seeding: run `ANALYZE`, then write `benchmarks/dataset-manifest.json` (tier, seed, anchor ISO, per-table row counts, per-event-name counts, a stable hash of those counts) and print a summary. Also seed one project named exactly `bench-canary` (used by later phases to verify the server points at the bench DB).
> 3. Create `apps/server/scripts/benchmark/cleanup-benchmark-data.ts`: dry-run by default (prints per-table counts it would delete, filtered to the two bench tenants); executes only with `--execute` **and** `CONFIRM_BENCHMARK_CLEANUP=true`; tenant-scoped `deleteMany` only — no TRUNCATE/DROP anywhere.
> 4. Add package scripts to `apps/server/package.json`: `"bench:seed": "tsx scripts/benchmark/seed-benchmark-data.ts"`, `"bench:cleanup": "tsx scripts/benchmark/cleanup-benchmark-data.ts"`. Add `.gitignore` entries for `benchmarks/results/` and `benchmarks/dataset-manifest.json`.
> 5. Both scripts must construct their own `PrismaClient` from `BENCHMARK_DATABASE_URL` (mirroring `config/prisma.ts`'s adapter setup) — do **not** modify `config/prisma.ts`, `config/env.ts`, or any file under `src/`. No schema changes, no migrations, no frontend changes, no changes to the existing demo seeder.
>
> **Validation (run and report actual results):** `bun run typecheck` · `bun run build` · `git diff --check` · `git status` shows only intended files. Then, against a locally created `eventpulse_bench` database with migrations applied: (a) guard refuses when `BENCHMARK_DATABASE_URL` names a non-bench DB, is unset, or confirmations are missing; (b) seed the **small** tier twice and diff the two manifests — all counts identical, only `anchor` differs; (c) seed **medium**; report duration and final row counts; (d) start the server with `DATABASE_URL` pointed at the bench DB, sign in as the bench user, and curl `GET /api/analytics/summary?tab=overview` and `?tab=products` for all-projects/30d — confirm 200s with plausible non-empty data and paste trimmed responses; (e) cleanup dry-run lists only bench-tenant rows; executed cleanup empties them; reseed succeeds. If any step cannot be run, state so explicitly and list what was verified by inspection only.
>
> **Report:** files created/modified, tier row counts, manifest excerpt, determinism proof (the double-seed diff), validation outputs, limitations. **Do not commit** — propose commit message `feat: add deterministic benchmark dataset seeder` and stop.

---
---

# Phase 0M — Codebase Maintainability Sweep

**Position in the roadmap:** a separate, bounded phase that runs **after 0D-5 completes Phase 0's engineering work and before Phase 1 (Commerce Tracking Contract implementation)**. Execution order is now: **0D-5 → 0M → Phase 1.** 0M is deliberately *not* part of 0D (0D is the analytics fetch-architecture arc, now finished) and does not reopen any completed Phase 0 work.

## 0M.1 Purpose

Phase 1 begins the longest-lived code in the product: the Tracking Contract implementation that every SDK and ingestion decision builds on. Phase 0M clears the specific, *verified* maintainability debt that would otherwise tax Phase 1 — lint that can't gate, duplicated fetch plumbing that every new page copies, dead demo code that pollutes searches, and an ingestion controller that Phase 1 must edit but can barely be reviewed. It is a sweep with a checklist and stop conditions, not a beautification project.

**Philosophy (binding):** the objective is **not** making every file shorter. Line count is only a review signal. Never split code only because of line count. Review files that: have multiple responsibilities · duplicate logic · mix unrelated concerns · contain dead code · are difficult to test · are difficult to extend. Suggested review *triggers* only — React component 250–300+, backend controller 300–400+, utility/module 400–500+, function 60–100+ — and every trigger means **"Review for extraction. Do not split automatically."** A 580-line file with one coherent responsibility passes review; a 200-line file mixing fetch, validation, and rendering may not.

## 0M.2 Why after Phase 0 (and 0D-5)

- Phase 0's refactors (0D-2/3/4) already *were* the analytics maintainability program — running a sweep in parallel would have collided with five refactor branches in the same files. That arc is finished; the analytics directory is now clean and explicitly out of 0M scope.
- 0D-5 must run first because its baseline pins today's behavior; 0M's behavior-preserving refactors then have a regression net (rerun the benchmark matrix cheaply if any 0M branch brushes server code).
- Phase 1 must come after because ingestion work will edit `event.controller.ts` — extracting its logic into testable modules *before* Phase 1 makes that work reviewable, exactly as 0D-3 did for analytics before 0D-4.
- Scheduled platform phases stay scheduled (standards §19.3): tests/CI (9), error middleware/logging (10B), async alerts (10A), durable rate limiting (11) are **not** pulled into 0M.

## 0M.3 Non-Goals

No new features · no visual redesigns · no test-framework introduction (Phase 9) · no logging/error-middleware work (10B) · no async/queue work (10A) · no dependency additions · no repo-wide reformatting · no renaming sweeps · no shared server↔web types package (MIRROR rule stands until its dedicated decision) · no performance work (0D-5 owns measurement; changes with performance intent need its evidence bar) · no schema changes · no touching `apps/server/src/analytics/` (just cleaned by 0D-3/4) beyond boy-scout comment fixes.

## 0M.4 Repository Audit Method

1. **Mechanical signals first** (already gathered, §0M.6): lint output, line counts against the review triggers, duplicate-declaration greps (`API_BASE`, `authHeaders`, mirrored types), import-reachability for dead files, `console.*` inventory.
2. **Responsibility read** of every trigger hit: does the file mix fetch+render, HTTP+domain, validation+persistence? Only mixed-concern or duplicated files become candidates.
3. **Modification-frequency weighting:** `git log --format= --name-only | sort | uniq -c` over recent history — debt in frequently-edited files outranks debt in stable ones.
4. **Classification** (§0M.5) with evidence per candidate: file, observation, and the concrete cost it imposes.
5. **Register reconciliation:** candidates merge into / update the standards §17 debt register; items already scheduled to later phases are marked Defer, not re-litigated.

## 0M.5 Candidate Classification

Priority is decided by **correctness → security → future modification frequency → duplication → testability → roadmap dependency** — explicitly *not* file size.

- **Critical** — blocks a gate or risks correctness now.
- **High Value** — directly reduces Phase 1+ cost or removes active duplication.
- **Opportunistic** — worth doing only if adjacent work touches the file (boy-scout rule).
- **Defer** — belongs to a scheduled later phase; record and leave.

## 0M.6 Verified Repository Candidates (evidence gathered at commit `5d2faa7`)

**Critical (2):**

| # | Candidate | Evidence |
|---|---|---|
| C1 | **Lint cannot gate: 14 problems (13 errors, 1 warning)** | `bunx eslint .` in `apps/web`: `react-hooks/set-state-in-effect` in `WorkspaceSettingsCard.tsx:77`, `ProjectsOverview.tsx:115`, and settings/overview siblings; `react/no-unescaped-entities` in `TeamMembersCard.tsx:35` et al. Several are *real* effect misuse (cascading-render class), not cosmetics. Until zero, lint gates nothing (debt register #7). |
| C2 | **`event.controller.ts` mixes ingestion domain logic with HTTP** | 522 lines; `ingestEventController` spans ~327 lines (L104–430): envelope validation, shopper-ID validation, idempotency handling, rate limiting, metadata capture, synchronous alert side-effect, and response shaping in one function (function trigger 60–100+ exceeded ×3). Phase 1 (contract) and Phase 10A (outbox) both must edit it; Phase 9 cannot test its validation without Express. Review for extraction — the 0D-3 playbook (pure validators/builders out, thin handler stays) applies. **Do not split automatically**; extraction must be behavior-preserving (§0M.8). |

**High Value (3):**

| # | Candidate | Evidence |
|---|---|---|
| H1 | **Frontend fetch/auth plumbing duplicated** | `lib/api.ts` (`apiRequest`, 27 lines) exists and 11 files use it — but **7 files still re-declare `API_BASE`** (`WorkspaceSettingsCard`, `ProfileSettingsCard`, `ProjectSettings`, `DocsOverview`, `ProjectView`, `EventsOverview`, `DashboardOverview`) and **5 re-declare `authHeaders`** (`ProjectSettings`, `ProjectView`, `HeaderAlertButton`, `AlertFormModal`, `AlertsOverview`); token reads via `localStorage.getItem("eventpulse_token")` are scattered. Consolidate onto `lib/api.ts` + one shared auth-header helper. (Caveat found in audit: `DocsOverview` may *display* the base URL in docs snippets — verify each usage; displaying is legitimate.) Debt register #6. |
| H2 | **Dead demo scaffolding** | 12 components import the two dead data files and are themselves imported by nothing rendered: `LiveEventTable`, `EventMetricCard`, `EventThroughputChart`, `EventDetailsPanel` (events); `SystemHealthCard`, `EventCategoriesCard`, `RecentActivityTable`, `ApiTrafficCard`, `ProjectSummaryCard`, `ApiKeyUsageCard`, `LiveEventStream`, `EventVolumeChart` (overview); plus `events-data.ts`, `dashboard-data.ts`. False grep hits and contributor confusion (register #10). Each deletion requires a usage search first (standards §16 "old components deleted only after usage search"); note `MetricCard` (2 importers), `DashboardStats`, `EmptyDashboard`, `RecentApiKeysCard`, `RecentProjectsCard`, `EventsComingSoonCard` are **live** — the sweep must verify per file, not per directory. |
| H3 | **Server env config not validated at boot** | `config/env.ts` collects vars without validation; `DATABASE_URL` fails fast only via `config/prisma.ts`; `JWT_SECRET` only in `utils/jwt.ts`. One small change: fail fast in `env.ts` for required vars (standards §5 already mandates the pattern "when next touching config" — 0M is that touch). Register #11. |

**Opportunistic (4):** O1 `ProjectView.tsx` (580) and O2 `ApiKeysOverview.tsx` (541) mix fetching with nontrivial rendering — review for extraction only if H1's consolidation already forces edits there; otherwise leave (they are coherent and stable). O3 duplicated non-analytics API types (`alert-types.ts`, `api-key-types.ts`, `event-types.ts` mirror server-inline shapes without `// MIRROR:` markers) — add markers when touched. O4 `console.*` context prefixes: any handler found without the `[handlerName]` prefix while editing gets one (no sweep).

**Defer (5):** tests/CI (Phase 9) · error middleware/request IDs/structured logging (10B) · synchronous alert evaluation in ingest (10A) · in-memory rate limiter (11) · shared types package (later decision). Recorded, untouched.

**Verified candidate count: 9** (2 Critical + 3 High Value + 4 Opportunistic), with 5 Defers recorded.

## 0M.7 Branch Strategy (small branches only, dependency-light, from actual findings)

| Order | Branch | Scope | Validation | Commit message |
|---|---|---|---|---|
| 1 | `chore/lint-zero` | Fix exactly the 14 lint problems (C1); for `set-state-in-effect` cases, restructure per the React guidance (derive state / move to event handlers / `useSyncExternalStore` where storage-sync is the real need) — behavior identical | `bunx eslint .` → 0 problems · typecheck · build · manual smoke of settings/projects/overview pages | `chore: fix all pre-existing lint errors so lint can gate` |
| 2 | `chore/remove-dead-demo` | Delete the 12 verified-unrendered demo components + `events-data.ts` + `dashboard-data.ts` (H2); per-file usage search pasted in PR | typecheck · build · grep proves zero remaining imports · live pages render unchanged | `chore: remove unrendered demo components and dead data files` |
| 3 | `refactor/frontend-fetch` | H1: all fetch call sites use `apiRequest`; one shared auth-header/token helper in `lib/api.ts`; delete the 7 `API_BASE` + 5 `authHeaders` copies (keeping legitimate display-only usages, documented) | typecheck · build · lint (now gating!) · manual matrix: signin, projects CRUD, keys, alerts, settings, events, analytics · network panel shows identical requests | `refactor: consolidate frontend fetch and auth plumbing` |
| 4 | `refactor/ingestion-module` | C2: extract pure ingestion logic from `event.controller.ts` into `apps/server/src/ingestion/` modules (envelope validation, shopper-ID rules, idempotency helpers, metadata capture) with the controller thinned to HTTP; **zero behavior change** — same statuses, same messages, same duplicate semantics, alert side-effect contract untouched | typecheck · build · manual ingest matrix (valid, invalid envelope, duplicate idempotency key, revoked key, rate limit, alert trigger) before/after with identical responses; 0D-5 bench smoke optional | `refactor: extract ingestion domain modules from event controller` |
| 5 | `chore/env-fail-fast` | H3: required-var validation in `config/env.ts` (extend the JWT pattern); boot fails with a clear message listing missing vars | typecheck · build · boot with/without each required var | `chore: fail fast on missing required environment variables` |

Branches 1, 2, 3, 5 are independent; 4 stands alone but lands last because it's the largest review. One logical concern per branch; no branch mixes categories. Opportunistic items ride along only inside these branches' files, per the boy-scout rule.

## 0M.8 Behaviour Preservation

- Every 0M branch is behavior-preserving by definition; any branch that wants to *change* behavior is out of scope and returns to the roadmap.
- Backend: the `refactor/ingestion-module` branch uses the 0D-3 discipline — SQL and validation logic move by copy, never retype; response envelopes/status codes/messages byte-identical; a manual before/after ingest matrix is pasted in the PR (Phase 9 tests don't exist yet; report honestly what was runtime-verified).
- Frontend: `refactor/frontend-fetch` must produce identical network requests (URL, headers, body) — verified in the network panel; error/loading states unchanged per the FetchState pattern.
- Analytics surface: untouched by 0M; if any server-shared file is edited, rerun a small-tier 0D-5 benchmark as a smoke (cheap, already built).
- Lint fixes: `set-state-in-effect` restructurings are the one place behavior *could* shift (render timing); each fix documents why the new structure is equivalent, and the affected page is manually exercised.

## 0M.9 Acceptance Criteria

1. `bunx eslint .` reports **0 problems** in `apps/web`, and lint is thereby eligible to gate future branches.
2. Zero unrendered demo components/data files remain (grep-proof in PR).
3. `API_BASE`/`authHeaders`/token-read duplication is gone: one definition each in `lib/api.ts` (documented display-only exceptions allowed); no fetch call site bypasses `apiRequest`.
4. `event.controller.ts` contains HTTP concerns only (target ≲150 lines); extracted ingestion modules are importable without Express; ingest behavior matrix verified identical.
5. `config/env.ts` fails fast on missing required vars.
6. All five branches merged with typecheck/build/lint/`git diff --check` green and honest verification reports.
7. The standards §17 debt register is updated: fixed items marked with their fixing branch; Defers annotated with their phase.
8. No analytics module, schema, API contract, or visual change anywhere in the 0M diff set.

## 0M.10 Stop Conditions (this phase must end)

Phase 0M stops — and Phase 1 starts — when **any** of these holds:

1. The five branches above are merged (critical + high-value work complete).
2. Remaining candidates are all Opportunistic/Defer — cosmetic work never blocks Phase 1.
3. Any additional cleanup would delay Phase 1's start beyond the sweep's budget (guideline: 0M should cost days, not weeks; if branch 4 balloons, it ships smaller and the remainder goes to the register).
4. A discovered item belongs to a scheduled platform phase (9/10A/10B/11/13) — it is recorded and deferred, never absorbed.

There is explicitly **no** "while we're at it" clause: new findings during 0M go to the debt register, not into the running branch. An endless cleanup phase is a failure mode of this design, and these conditions exist to prevent it.

## 0M.11 Codex Handoff Prompts

**Prompt 1 — first 0M branch (`chore/lint-zero`):**

> You are working in the EventPulse repository (Turborepo; `apps/web` = Next.js + React + TypeScript + Tailwind — **read `AGENTS.md` first: this Next.js version has breaking changes vs your training data; consult `node_modules/next/dist/docs/` before writing any code**). Phases 0A–0D-5 are complete. Implement **Phase 0M branch 1 only**: `chore/lint-zero`. Confirm a clean tree; the human owner creates/switches branches — do not do it yourself.
>
> **Read first:** `~/.claude/plans/analytics-query-performance-phase-0d5.md` (Phase 0M sections, esp. 0M.7 row 1 and 0M.8), `~/.claude/plans/eventpulse-engineering-quality-standards.md` (§§4, 7, 14, 18). Run `bunx eslint .` in `apps/web` yourself to enumerate the current failures (14 problems at last audit: `react-hooks/set-state-in-effect` in `WorkspaceSettingsCard.tsx`, `ProjectsOverview.tsx` and settings/overview siblings; `react/no-unescaped-entities` in `TeamMembersCard.tsx` et al.).
>
> **Scope — exactly this:** fix every reported problem, nothing else. For unescaped entities, use the suggested HTML entities. For `set-state-in-effect`, do not suppress or disable rules: restructure per React guidance — compute derived values during render or `useMemo`; move storage/API-seeded initialization into lazy `useState` initializers or event handlers; keep genuine external-system sync in effects with correct structure. Behavior must be identical: same rendered output, same fetch calls, same persistence. No renames, no formatting sweeps, no other files, no dependency or config changes, no `eslint-disable` anywhere.
>
> **Validation (report actual output):** `bunx eslint .` → 0 problems · `bun run typecheck` · `bun run build` · `git diff --check` · `git status` (only intended files). Manually exercise every touched page (settings cards save/load, projects list/filter, dashboard overview) and state what was runtime-verified vs inspected. **Report:** per-file list of rule → fix → why behavior is unchanged. **Do not commit** — propose commit message `chore: fix all pre-existing lint errors so lint can gate` and stop.

**Prompt 2 — second 0M branch (`chore/remove-dead-demo`):**

> You are working in the EventPulse repository (`apps/web` = Next.js — read `AGENTS.md`; this Next.js differs from your training data). Branch `chore/lint-zero` is merged. Implement **Phase 0M branch 2 only**: `chore/remove-dead-demo`. Clean tree confirmed; human owner handles branching.
>
> **Read first:** `~/.claude/plans/analytics-query-performance-phase-0d5.md` (0M.6 H2, 0M.7 row 2), standards §16 (delete only after usage search), §18.
>
> **Scope — exactly this:** delete dead demo scaffolding under `apps/web/components/dashboard/events/` and `apps/web/components/dashboard/overview/`. Candidates verified unrendered at the last audit: `LiveEventTable`, `EventMetricCard`, `EventThroughputChart`, `EventDetailsPanel`, `SystemHealthCard`, `EventCategoriesCard`, `RecentActivityTable`, `ApiTrafficCard`, `ProjectSummaryCard`, `ApiKeyUsageCard`, `LiveEventStream`, `EventVolumeChart`, plus data files `events-data.ts` and `dashboard-data.ts`. **You must re-verify each file yourself** with a repo-wide import/usage search before deleting; deletion order: leaf components first, then the data files, checking after each that nothing still imports them. Files that turn out to be reachable from a rendered page (known live: `MetricCard`, `DashboardStats`, `EmptyDashboard`, `RecentApiKeysCard`, `RecentProjectsCard`, `EventsComingSoonCard`) are **kept** and listed in your report; if a "dead" file is actually imported by a live one, keep it and report the finding instead of forcing the deletion. If removing the data files strands a type that a live file imports, move that type into the live consumer rather than keeping the dead file.
>
> **Validation (report actual output):** `bun run typecheck` · `bun run build` · `bunx eslint .` (must stay at 0) · grep proof that no deleted filename or its exports are referenced anywhere · `git status` shows only deletions (plus any single type-relocation) · manually load the dashboard overview and events pages and confirm they render unchanged. **Report:** per-file verdict (deleted / kept-live / kept-with-finding) with the usage-search evidence, validation results, limitations. **Do not commit** — propose commit message `chore: remove unrendered demo components and dead data files` and stop.

---
*Prepared read-only at commit `5d2faa7` (main, clean tree). No source files were modified; no permanent planning documents were modified; this file is the only artifact created.*
