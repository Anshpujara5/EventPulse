# Phase 0D-3 — Analytics Query Module Decomposition

**Type:** Behavior-preserving refactor. No metric, SQL-semantics, API-shape, endpoint, schema, alias, scope-rule, frontend, or performance changes.
**Assumes:** Phase 0D-2 (Shared Analytics Scope) is merged. This plan was written against the in-flight 0D-2 working tree (`refactor/analytics-shared-scope`); the `AnalyticsScope` API referenced below is the one 0D-2 ships (`scope.sql.{ownedEvent, ownedAliasedEvent, currentEvent, currentAliasedEvent, todayEvent, comparisonCurrentRange, comparisonPreviousRange}` plus range/comparison metadata). If 0D-2's final fragment names differ, adjust mechanically — the decomposition is unaffected.
**Governing docs:** analytics blueprint (metric semantics), engineering standards §5/§6/§9 (thin controllers, domain-owned logic, SQL rules, MIRROR rule).

---

## 1. Current-State Assessment (repository evidence)

- `apps/server/src/controllers/analytics.controller.ts` = **1,722 lines**, one exported handler (`getAnalyticsSummaryController`, L1076).
- **17 raw SQL statements**: 1 conditional sequential query (all-time span, L1110) + a 16-slot `Promise.all` (L1244) containing 15 real queries and 1 conditional (`totalActiveProjects`, skipped when project-scoped).
- Mixed responsibilities in one file: 11 raw-row interfaces (L12–86) · 14+ API/domain types · 6 alias/threshold constant groups · 7 pure builders (`buildComparison`, `buildHealth`, `buildCommerceFunnel`, `buildSessionFunnel`, `buildProductPerformance`, `buildInsights`, plus `roundPct`/`percentOrNull`) · trend-granularity resolution with three query variants · response assembly (L1674) · HTTP concerns.
- **Concrete maintainability risks observed:**
  - Every analytics phase edits this file (0A, 0C-2, 0D-1, 0D-2 all did) — permanent merge-conflict funnel while Codex and humans work in parallel.
  - Alias duplication *inside* the file: `SESSION_FUNNEL_STEPS` and `COMMERCE_STEPS` carry overlapping lists, and the shopper-summary query (L1350) hardcodes the 5 purchase aliases inline rather than referencing the constant — three places to update one alias.
  - Nothing in the file is unit-testable without Express + a live DB, blocking Phase 9's golden tests from targeting builders directly.
  - Server-side response types have no export point, so the web `analytics-types.ts` (230 lines) mirrors shapes with no anchor for the MIRROR rule.
- **What 0D-2 already fixed:** scope/tenant/date filtering is now a single injected `AnalyticsScope` — queries no longer assemble their own `userId`/project/range fragments. That removes the hardest part of extraction: modules can now take one argument and be trivially audited for tenant safety. 0D-3 is the natural next cut.

## 2. Refactor Goals

Success means, precisely:
1. `analytics.controller.ts` shrinks to a **thin HTTP handler (~40 lines)**: auth → scope → delegate → respond → catch.
2. Every query + its row type + its result mapping lives in a **focused domain module** under `apps/server/src/analytics/`, each taking `AnalyticsScope` as its mandatory first argument.
3. Pure builders become importable, Express-free functions (Phase 9 test targets).
4. **Byte-identical API responses** for every scope combination (verified per §11) — same JSON keys, values, array ordering, null-vs-zero behavior, and error responses.
5. Same performance shape: the same 15–16 queries, still parallelized in one `Promise.all`, the span query still sequential and all-time-only.
6. Alias definitions consolidated to one module with **provably identical** SQL parameter lists.

## 3. Non-Goals

No new metrics · no new endpoints · no query optimization or plan changes · no caching · no rollups (Phase 13) · no lazy/deferred loading · no schema changes · **no shared frontend/backend package** (MIRROR rule continues; package creation is a later decision) · no test-framework implementation (Phase 9) · no logging/error-middleware work (Phase 10B) · no changes to `analyticsScope.ts` beyond consuming it.

## 4. Recommended Module Structure

Evaluated and **rejected**: tab-shaped folders (`overview/`, `conversion/`, `products/`…). The data doesn't cut that way — `topEvents`/`eventsByProject` feed the Behavior tab *and* `buildHealth`/`buildInsights`; the summary KPIs feed Overview *and* health. Tab folders would force cross-folder imports that misrepresent real dependencies. Also rejected: deep nesting — one flat directory plus the two files 0D-2 already implies is enough at this size.

**Recommended: flat `apps/server/src/analytics/` (12 files total, 11 new):**

| File | Responsibility | Exports | Moves there | Depends on |
|---|---|---|---|---|
| `analyticsScope.ts` | *(exists, 0D-2)* scope parsing + SQL fragments | unchanged | — | prisma types, timeRange |
| `shared/aliases.ts` | Single alias source | `CommerceStepId`, `COMMERCE_STEPS`, `COMMERCE_FRICTION_ALIASES`, `ALL_COMMERCE_ALIASES`, `SESSION_FUNNEL_STEPS`, `PURCHASE_ALIASES` (new named export = `SESSION_FUNNEL_STEPS[3].aliases`, for shopper summary) | L265–270, L305–373 + the funnel-step alias arrays | none |
| `shared/numbers.ts` | Numeric helpers | `roundPct`, `percentOrNull`, `percentageOfTotal(count,total)` (extracted from the `percentageOf` closure, same math), `toCount(bigint\|null\|undefined)` (the `Number(x ?? 0)` idiom) | L379–385, L1603–1605 | none |
| `eventActivity.ts` | Core volume + activity queries | `fetchEventActivity(scope)` → `{ totals, today, uniqueNames, activeProjects, topEventsRows, eventsByProjectRows, recentActivityRows, propertyKeyRows, totalActiveProjectsRow }`; mappers `mapTopEvents(rows,total)`, `mapEventsByProject(rows,total)`, `mapRecentActivity`, `mapTopProperties`; types `TopEvent`, `ProjectEventCount`, `RecentEvent`, `TopProperty` | Queries 1–8 & 11 (see §5) + their row interfaces + mapping lambdas | scope, prisma, numbers |
| `trend.ts` | Trend granularity + 3-variant bucket query | `resolveTrendGranularity(scope, spanDays)`, `fetchTrendSpanDays(scope)` (the sequential all-time query), `fetchTrend(scope, granularityPlan)` → `TrendPoint[]`; types `TrendGranularity`, `TrendPoint`, `EventTrend`; consts `ALL_TIME_MONTHLY_THRESHOLD_DAYS`, `FIXED_RANGE_SPECS` | L88, L898–910, L1104–1215 (the `buildTrendQuery` closure becomes a scope-taking function; identical SQL) | scope, prisma |
| `comparison.ts` | Previous-period comparison | `fetchPeriodComparison(scope)` → row; `buildComparison(row, label)`; types `PeriodComparison`, `ComparisonDirection` | L48–51, L125–158, L1217–1225 | scope, prisma |
| `commerceFunnel.ts` | Event-count funnel | `fetchCommerceCounts(scope)` → `Map<string,number>`; `buildCommerceFunnel(map)`; all CommerceFunnel* types + thresholds | L271–312, L375–377, L387–537, query 12 | scope, prisma, aliases, numbers |
| `sessionFunnel.ts` | Session-based funnel | `fetchSessionFunnel(scope)` → row; `buildSessionFunnel(row)`; SessionFunnel* types | L539–573, L744–~896, query 14 | scope, prisma, aliases, numbers |
| `shopperSummary.ts` | Shopper/session counts | `fetchShopperSummary(scope)` → `ShopperSummary` (query + `toCount` mapping); type `ShopperSummary` | Query 13 + `ShopperSummaryRow` (small file ~45 lines — kept separate: distinct response key, distinct tab, nothing else shares its row) | scope, prisma, aliases (PURCHASE_ALIASES) |
| `productPerformance.ts` | Product + category CTEs | `fetchProductPerformanceRows(scope)`, `fetchCategoryPerformanceRows(scope)`, `buildProductPerformance({productRows, categoryRows})`; ProductStat/CategoryStat/ProductPerformance types + Decimal→number conversion | L59–86, L575–743, queries 15–16 | scope, prisma, aliases, numbers |
| `healthInsights.ts` | Pure rule engines (no SQL) | `buildInsights(params)`, `buildHealth(params)`; Insight/Health types + all thresholds | L96–123, L165–253, L912–1074 | numbers only (params are plain data — no imports from other domain modules; input shapes declared locally to prevent cycles) |
| `summary.ts` | Orchestration + response composition | `buildAnalyticsSummary(scope)` → the exact `data` object; type `AnalyticsSummaryData` (the response contract, MIRROR anchor) | The `Promise.all`, `avgEventsPerDay`, builder wiring, response-object literal (L1227–1713) | every module above |
| *(controller)* | HTTP only | `getAnalyticsSummaryController` | **Remains:** auth check, `createAnalyticsScope` call + 400 on invalid, `buildAnalyticsSummary(scope)` call, `res.json({success:true,data})`, catch→500 log | scope, summary |

Why `summary.ts` exists instead of orchestrating in the controller: the cross-domain wiring (scopedTotal → percentages; comparison → health; insights → health's spike flag) is domain logic and must be testable without Express (standards §5); the controller stays trivially reviewable.

## 5. Query Inventory (every query, verified against L1110–1599)

| # | Query / metric | Current location | Target module | Inputs | Output row type | Shared deps | Risk |
|---|---|---|---|---|---|---|---|
| 0 | All-time span days (sequential, conditional) | L1110 | `trend.ts` | `scope.sql.ownedEvent` | `SpanRow` | — | Low |
| 1 | Total events | L1246 | `eventActivity.ts` | `currentEvent` | `CountRow` | — | Low |
| 2 | Events today | L1254 | `eventActivity.ts` | `todayEvent` | `CountRow` | — | Low |
| 3 | Unique event names | L1261 | `eventActivity.ts` | `currentEvent` | `CountRow` | — | Low |
| 4 | Active projects w/ events | L1268 | `eventActivity.ts` | `currentEvent` | `CountRow` | — | Low |
| 5 | Top 10 events | L1275 | `eventActivity.ts` | `currentEvent` | `TopEventRow` | `percentageOfTotal` at mapping | Low |
| 6 | Events by project (join) | L1285 | `eventActivity.ts` | `currentAliasedEvent` | `ProjectEventRow` | `percentageOfTotal` | Low |
| 7 | Recent activity (join) | L1296 | `eventActivity.ts` | `currentAliasedEvent` | `RecentEventRow` | — | Low |
| 8 | Top property keys (jsonb) | L1307 | `eventActivity.ts` | `currentAliasedEvent` | `PropertyKeyRow` | — | Low |
| 9 | Trend buckets (3 variants: custom / all-time / preset) | L1134–1215 | `trend.ts` | scope + granularity plan (`currentAliasedEvent` / `ownedAliasedEvent`, custom bounds) | `TrendPointRow` | `FIXED_RANGE_SPECS` | **Medium** — closure→function refactor of variant selection |
| 10 | Period comparison (FILTER pair) | L1217 | `comparison.ts` | `ownedEvent` + both comparison fragments | `PeriodComparisonRow` | — | Low |
| 11 | Total ACTIVE projects (conditional; Project table) | L1324 | `eventActivity.ts` | `scope.userId`, `scope.projectId` gate | `CountRow` | — | Low (keep the `projectId ? resolve([]) : query` gate verbatim) |
| 12 | Commerce alias counts | L1335 | `commerceFunnel.ts` | `currentEvent` + `ALL_COMMERCE_ALIASES` | `TopEventRow` | aliases | Low |
| 13 | Shopper summary | L1346 | `shopperSummary.ts` | `currentEvent` + purchase aliases (**currently inlined**) | `ShopperSummaryRow` | aliases | **Medium** — inline list → `PURCHASE_ALIASES` constant; §12-R2 equivalence proof required |
| 14 | Session funnel (4 FILTER counts) | L1366 | `sessionFunnel.ts` | `currentEvent` + `SESSION_FUNNEL_STEPS` + `sessionId IS NOT NULL` | `SessionFunnelRow` | aliases | Low |
| 15 | Product performance (3-CTE) | L1391 | `productPerformance.ts` | `currentAliasedEvent` + step aliases | `ProductPerformanceRow` (bigint + `Prisma.Decimal`) | aliases | **Medium** — largest SQL block; Decimal mapping moves with it |
| 16 | Category performance (3-CTE) | L1506 | `productPerformance.ts` | same as 15 | `CategoryPerformanceRow` | aliases | **Medium** |

## 6. Type Strategy

- **Raw row types** (`CountRow`, `TrendPointRow`, `ProductPerformanceRow`, …): private, unexported, colocated with the query that produces them, in their target module. They are implementation details.
- **API/domain result types** (`CommerceFunnel`, `SessionFunnel`, `AnalyticsHealth`, `AnalyticsInsight`, `PeriodComparison`, `ShopperSummary`, `ProductPerformance`, `TopEvent`, `EventTrend`, …): exported from the module that builds them; `summary.ts` composes them into an exported `AnalyticsSummaryData`.
- **No giant `types.ts`.** The one aggregation point is `AnalyticsSummaryData` in `summary.ts`, which exists because the response contract needs a single named shape.
- **MIRROR rule:** each exported result type gains a `// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts` comment, and the web file gains the reverse pointers (comment-only edit — the sole permitted frontend change, optional and confined to 0D-3E). Field names/shapes do not change.
- **Aliases/constants:** `shared/aliases.ts` (values, not types, except `CommerceStepId`). **Builders** live beside their types in domain modules; `healthInsights.ts` declares its own param interfaces (plain data in) to avoid importing other domain modules.

## 7. SQL Organization Rules

1. **SQL lives inside its domain module** as tagged `prisma.$queryRaw` templates in the fetch function — no `.sql` files, no query-builder layer, no generic repository. Each module owns query + row type + mapping.
2. **`AnalyticsScope` is the mandatory first parameter** of every `fetch*` function. Modules must use `scope.sql.*` fragments for all ownership/time filtering and are **forbidden** from composing their own `userId`/`projectId`/`createdAt` conditions (single exception, preserved verbatim: query 11 filters the `Project` table by `scope.userId`, which the fragments — built for `Event` — don't cover).
3. **Parameterization:** values only via `${}` binding and `Prisma.join` for lists (status quo); no string-built SQL. Reviewer greps `\$queryRaw` in the diff and confirms every statement contains a `scope.sql.` reference or the documented exception.
4. **Alias handling:** every event-name list in SQL must reference `shared/aliases.ts` exports. Inline name lists in SQL are banned after 0D-3A (this converts the one existing violation, query 13, with an equivalence proof).
5. **Naming:** `fetchXxx(scope, …)` returns raw rows or minimally-mapped results; `buildXxx(...)` is pure and SQL-free; `mapXxx(rows, …)` converts rows to API types. No `getXxx` (reserved for HTTP handlers).
6. **Fragments stay in `analyticsScope.ts`** — modules consume, never construct, scope SQL. Non-scope SQL snippets (e.g. the guarded-numeric `CASE` for `quantity`) stay local to their module until a *third* consumer exists (standards §3.6).

## 8. Controller Target Design

```ts
// analytics.controller.ts (target, ~40 lines)
export async function getAnalyticsSummaryController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const scopeResult = createAnalyticsScope({
      userId: req.user.userId,
      projectId: req.query.projectId,
      range: req.query.range,
      from: req.query.from,
      to: req.query.to,
    });
    if (!scopeResult.valid)
      return res.status(400).json({ success: false, message: scopeResult.message });

    const data = await buildAnalyticsSummary(scopeResult.value);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[getAnalyticsSummary]", error);      // unchanged until Phase 10B
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
```

**Orchestration lives in `summary.ts`**, and **`Promise.all` remains exactly one `Promise.all`** with the same members (the trend span pre-query stays sequential before it, all-time only, as today):

```ts
// summary.ts (shape)
export async function buildAnalyticsSummary(scope: AnalyticsScope): Promise<AnalyticsSummaryData> {
  const spanDays = scope.range.isAllTime ? await fetchTrendSpanDays(scope) : null;
  const plan = resolveTrendGranularity(scope, spanDays);

  const [activity, trendRows, comparisonRow, commerceCounts, sessionRow, shopper, productRows, categoryRows] =
    await Promise.all([
      fetchEventActivity(scope),         // itself a Promise.all of queries 1–8 & 11 → flattened so total parallelism is unchanged
      fetchTrend(scope, plan),
      fetchPeriodComparison(scope),
      fetchCommerceCounts(scope),
      fetchSessionFunnel(scope),
      fetchShopperSummary(scope),
      fetchProductPerformanceRows(scope),
      fetchCategoryPerformanceRows(scope),
    ]);

  // pure composition: percentages, avgEventsPerDay, buildComparison,
  // buildInsights, buildHealth, buildCommerceFunnel, buildSessionFunnel,
  // buildProductPerformance → return the exact current response object
}
```

Note: `fetchEventActivity` groups its 9 fast queries in an internal `Promise.all`, so the 16 statements still run concurrently — nesting `Promise.all` does not serialize anything. Performance shape preserved.

## 9. Shared Definitions

**Centralize now** (already multi-consumer, mechanical): commerce/session alias tables + `PURCHASE_ALIASES` (`shared/aliases.ts`) · `roundPct`, `percentOrNull`, `percentageOfTotal`, `toCount` (`shared/numbers.ts`).
**Keep local** (single consumer — centralizing would be premature): guarded-quantity `CASE` SQL (productPerformance only) · trend `FIXED_RANGE_SPECS`/granularity rules (trend only) · health/insight thresholds (healthInsights only) · comparison flat-threshold (comparison only) · all raw row types.
**Explicitly not created:** shared server↔web types package (MIRROR comments remain the mechanism), generic SQL helpers, a metrics registry — those are later-phase decisions (standards §19; platform roadmap).

## 10. Incremental Branch Strategy

Five branches, dependency-ordered, each independently shippable and verified with the §11 harness. The suggested 0D-3A…E split is accepted with one regrouping: "overview/behavior" would split `percentageOf` from its consumers, so branch B keeps the whole activity+trend+comparison cluster together.

| Branch | Scope (exact) | Files | Validation | Commit message |
|---|---|---|---|---|
| **0D-3A** `refactor/analytics-shared-constants` | Create `shared/aliases.ts` + `shared/numbers.ts`; controller imports them; delete local copies; convert query 13's inline purchase list to `Prisma.join(PURCHASE_ALIASES)` with equivalence note in PR | 2 new + controller | typecheck · build · focused lint · §11 diff (all scopes) · PR includes side-by-side proof the alias arrays are element-identical, same order | `refactor: extract shared analytics aliases and numeric helpers` |
| **0D-3B** `refactor/analytics-activity-trend-modules` | Create `eventActivity.ts`, `trend.ts`, `comparison.ts`; move queries 0–11 + mappers + `buildComparison`; controller calls fetchers (still assembles response itself) | 3 new + controller | same + explicit trend checks: 24h/7d/30d/all/custom-1-day/custom-45-day granularities byte-identical | `refactor: extract activity, trend, and comparison analytics modules` |
| **0D-3C** `refactor/analytics-funnel-modules` | Create `commerceFunnel.ts`, `sessionFunnel.ts`, `shopperSummary.ts`; move queries 12–14 + builders + types | 3 new + controller | same + funnel/shopper keys deep-equal on seeded data | `refactor: extract funnel and shopper analytics modules` |
| **0D-3D** `refactor/analytics-product-module` | Create `productPerformance.ts`; move queries 15–16 + `buildProductPerformance` + Decimal conversion | 1 new + controller | same + explicit Decimal fields (`unitsAddedToCart`) + ordering (top-15/top-8 tiebreakers) checks | `refactor: extract product performance analytics module` |
| **0D-3E** `refactor/analytics-summary-composer` | Create `healthInsights.ts` + `summary.ts`; move `buildInsights`/`buildHealth`/`avgEventsPerDay`/response literal; thin the controller to §8 target; add MIRROR comments (server + optional web comment-only edit) | 2 new + controller (+ web comments) | same, full-matrix; confirm controller <50 lines; `grep -c '\$queryRaw' analytics.controller.ts` = 0 | `refactor: thin analytics controller behind summary composer` |

One-giant-commit is rejected: a ~1,700-line move with 17 queries cannot be honestly reviewed for tenant-filter or ordering regressions in one pass.

## 11. Behavior-Preservation Strategy

Automated tests don't exist yet (Phase 9); use a **temporary response-diff harness** — explicitly *not* a substitute for Phase 9 tests, and kept **uncommitted** (local script; outputs pasted into PR descriptions) to avoid unrelated-file noise in refactor branches:

1. **Scope matrix** (12 requests): {all-projects, one seeded project} × {all, 24h, 7d, 30d, custom single-day, custom multi-day(≥31d for month buckets)}.
2. **Baseline capture** on the pre-branch commit against the seeded dev DB; **candidate capture** on the branch — run both within the same session with no ingestion in between; run pairs back-to-back so `NOW()`-relative buckets can't roll (custom calendar ranges are fully deterministic and serve as the exactness anchor).
3. **Diff:** raw-string JSON compare (`diff <(baseline) <(candidate)`) — no normalization: serialized bigint→`Number` and Decimal→number conversions must already be identical, and array ordering is part of the contract being preserved.
4. **Targeted assertions on top of the diff:** null-vs-zero fields (`changePercent: null`, funnel percentage `null`s, product `gmv: null`), array orders (topEvents, product top-15 with tiebreakers), empty-scope behavior (nonexistent project → inactive/no-data shapes), and the 400 messages for invalid custom ranges.
5. **Error-path checks:** missing auth → 401; invalid range → same 400 message strings.
6. Each branch's PR pastes the matrix result (12× "identical").

## 12. Risk Register

| Risk | Mitigation |
|---|---|
| R1 Dropping a tenant/scope filter while moving a query | SQL moved by copy-paste, never retyped; every `fetch*` reviewed for `scope.sql.` presence (§7.3 grep); diff harness catches value changes |
| R2 Alias-list substitution changes SQL params (query 13) | PR shows constant vs inline list element-by-element; harness compares `shopperSummary` values; order of `Prisma.join` elements kept identical |
| R3 Array ordering drift (topEvents, product/category tiebreakers) | SQL untouched; harness raw-string diff makes any reorder a failure |
| R4 Decimal/BigInt conversion drift (product module) | Conversion code moves verbatim with its query; explicit `unitsAddedToCart` spot-checks in §11.4 |
| R5 Accidental response-field rename/omission during composer move (0D-3E) | Response literal moved verbatim; `AnalyticsSummaryData` typed from the literal; raw diff is byte-level |
| R6 Trend closure→function refactor alters variant selection | The three variants + selection ladder move as one unit into `trend.ts`; §10-B's six-range trend matrix exercises every branch of the ladder |
| R7 Circular imports (healthInsights ↔ comparison/trend types) | `healthInsights.ts` declares its own input param interfaces (plain data), imports nothing from sibling domain modules |
| R8 Duplicated aliases resurrected later | Post-0D-3A rule (§7.4): inline event-name lists in SQL are a review rejection |
| R9 Moving too much at once | Five-branch split; each branch leaves the endpoint fully working; no branch mixes "move" with "improve" |
| R10 Parallel-work collisions (0D-2 still landing) | 0D-3A starts only after 0D-2 merges; plan touches no file 0D-2 owns except the controller |

## 13. Acceptance Criteria

Phase 0D-3 is complete when: controller ≤ ~50 lines with zero `$queryRaw`/builder logic; 11 new modules exist with responsibilities per §4; every fetch takes `AnalyticsScope`; aliases have one source and no inline SQL name lists; the §11 matrix reports **identical** responses across all 12 scopes and error paths at 0D-3E; typecheck/build/focused-lint/`git diff --check` green on every branch; no frontend behavior change (web edits limited to optional MIRROR comments); no schema, endpoint, or response change anywhere in the diff.

## 14. Validation Commands

```
bun run typecheck
bun run build
bunx eslint <touched files>          # focused lint (repo-wide lint has 15 pre-existing failures)
git diff --check && git status       # whitespace + no stray files
# read-only response comparison (uncommitted local harness):
#   capture baseline (pre-branch) → capture candidate → diff per §11 matrix
grep -c '\$queryRaw' apps/server/src/controllers/analytics.controller.ts   # 0 after 0D-3E
```

## 15. Recommended Final Architecture

```
route (analytics.routes.ts)
  → authMiddleware
  → analytics.controller.ts        (HTTP: auth · scope · delegate · respond)
      → analyticsScope.ts          (0D-2: tenant/project/time SQL fragments)
      → summary.ts                 (orchestration: Promise.all + composition)
          → eventActivity.ts ┐
          → trend.ts         │  fetch*(scope) → rows → map* → domain types
          → comparison.ts    │
          → commerceFunnel.ts├──→ shared/aliases.ts, shared/numbers.ts
          → sessionFunnel.ts │
          → shopperSummary.ts│
          → productPerformance.ts ┘
          → healthInsights.ts     (pure; consumes other modules' outputs as plain data)
                → PostgreSQL (via prisma, parameterized only)
API contract: AnalyticsSummaryData (summary.ts)  ⇄ MIRROR ⇄  web analytics-types.ts
```

## 16. Handoff Prompt for Codex (first branch only — 0D-3A)

> You are working in the EventPulse repository. Phase 0D-2 (Shared Analytics Scope) is complete and merged. Implement **Phase 0D-3A only**: extract shared analytics constants. Create and switch to branch `refactor/analytics-shared-constants` from the latest main.
>
> **Read first, edit second.** Inspect `apps/server/src/controllers/analytics.controller.ts` (~1,722 lines), `apps/server/src/analytics/analyticsScope.ts`, and `~/.claude/plans/analytics-query-modules-phase-0d3.md` (§4, §7, §10 row 0D-3A). Also read `~/.claude/plans/eventpulse-engineering-quality-standards.md` §§3–6, 9, 18.
>
> **Scope — exactly this, nothing more:**
> 1. Create `apps/server/src/analytics/shared/aliases.ts` exporting, moved **verbatim** from the controller: `CommerceStepId`, `COMMERCE_STEPS`, `COMMERCE_FRICTION_ALIASES`, `ALL_COMMERCE_ALIASES`, `SESSION_FUNNEL_STEPS`, plus a new `PURCHASE_ALIASES` constant defined as the session-funnel purchase-step alias list (element-for-element identical to `SESSION_FUNNEL_STEPS[3].aliases`, same order).
> 2. Create `apps/server/src/analytics/shared/numbers.ts` exporting `roundPct` and `percentOrNull` moved verbatim, plus `percentageOfTotal(count: number, total: number): number` and `toCount(value: bigint | number | null | undefined): number` implementing the controller's existing `percentageOf` and `Number(x ?? 0)` math exactly.
> 3. Update the controller to import all of these; delete the local copies; replace the `percentageOf` closure body with `percentageOfTotal(count, scopedTotal)`; in the shopper-summary query replace the five inline purchase-alias string literals with `${Prisma.join([...PURCHASE_ALIASES])}` — the parameter list must be identical in content and order.
> 4. Do **not** move any query, builder, row type, or response logic. Do not touch `analyticsScope.ts`, routes, frontend, schema, or any other endpoint. Do not change any metric, SQL semantics, response field, or alias content.
>
> **Validation (all must pass, report actual output):** `bun run typecheck` · `bun run build` · `bunx eslint` on touched files · `git diff --check` · `git status` shows only the intended files. Then verify behavior preservation: with the local dev server and seeded data, capture `GET /api/analytics/summary` for all-projects and one project across ranges `all`, `24h`, `7d`, `30d`, and one custom `from/to` pair, before and after your change (back-to-back), and diff — all responses must be byte-identical. If you cannot run the server, say so explicitly and list what was verified by inspection only.
>
> **Report:** files created/modified, proof of alias-list equivalence (side-by-side), validation results, response-diff results, limitations. **Do not commit** — propose commit message `refactor: extract shared analytics aliases and numeric helpers` and stop.

---
*Prepared read-only against the 0D-2 working tree; no source files or permanent documents were modified.*
