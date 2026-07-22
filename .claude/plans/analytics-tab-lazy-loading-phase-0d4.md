# Phase 0D-4 — Analytics Tab-Level Lazy Loading

**Type:** Fetch-architecture change. No metric definitions, scope rules, schema, or visual redesign change.
**Assumes:** Phase 0D-3 complete through 0D-3E (thin controller, `AnalyticsScope`, domain modules `eventActivity` / `trend` / `comparison` / `commerceFunnel` / `sessionFunnel` / `shopperSummary` / `productPerformance` / `healthInsights`, composed by `summary.ts#buildAnalyticsSummary`). Planned against the 0D-3B working tree; module names follow the 0D-3 plan — adjust mechanically if final names differ.
**Governing docs:** analytics blueprint (metric semantics, honest states) · engineering standards (§§5–7, 9, 10, 18) · Phase 0D-3 plan (module layout).

---

## 1. Current-State Assessment (repository evidence)

- **One request feeds six tabs.** `AnalyticsOverview.tsx` makes a single `GET /api/analytics/summary` per scope and slices `AnalyticsData` into panel props: Overview `{summary, comparison, health, insights, trend}` · Conversion `{sessionFunnel, commerceFunnel}` · Sales `{}` (static) · Products `{productPerformance}` · Shoppers `{shopperSummary}` · Behavior `{topEvents, eventsByProject, recentActivity, topProperties}`.
- **Payload:** the full `AnalyticsData` object (~13 top-level keys) regardless of tab.
- **Fetch lifecycle (post 0D-1):** `useCallback` request + `useEffect`; **stale protection** via `latestRequestId` ref and scopeKey-tagged `FetchState` — state whose `scopeKey` doesn't match the current scope renders as loading; effect cleanup bumps the request id. Custom ranges come from URL (`range=custom&from&to`) validated client-side (`validateAnalyticsDateRange`), invalid → error state without retry. Fetching goes through the shared `apiRequest` helper.
- **URL tab handling:** `AnalyticsTabs.tsx` — `?tab=` param (`overview` = param removed), `resolveTab()` falls back to `overview` for unknown values, `router.push(..., {scroll:false})`, full `tablist/tab/tabpanel` semantics with roving tabindex, Arrow/Home/End keys, and focus management. **Only the active panel is mounted** (`panels[activeTab]`), so lazy *rendering* already exists — the waste is purely in fetching.
- **Refresh:** `AnalyticsRefreshBar` → refetches the entire summary.
- **Loading/error:** one page-level spinner, one page-level error+Retry, one page-level empty state (`summary.totalEvents === 0` gates *all* tabs).
- **Backend orchestration:** thin controller → `AnalyticsScope` → one `Promise.all` executing ~15 queries (+1 conditional all-time span, +1 conditional active-projects) on every request.
- **Concrete inefficiency (query counts, verifiable):** opening Overview executes the Conversion funnels (2), Products/Categories CTEs (2 — the heaviest SQL in the codebase), and Shopper summary (1) for nothing; opening the static Sales tab executes all ~16. Every tab switch is free but every scope change re-runs everything for all tabs.

## 2. Goals

1. Only the active tab's queries run; the static Sales tab runs **zero**.
2. Every tab request reuses the identical shared filters (project, preset/custom range) via `AnalyticsScope` — no per-tab scope interpretation.
3. Active tab remains URL-driven (`?tab=`), unchanged semantics and a11y.
4. Refresh reloads the **current tab only**.
5. One tab's failure shows an in-panel error; other tabs' loaded data is untouched.
6. No metric definition, alias, or scope-rule changes; per-tab values byte-equal the corresponding slice of today's full response.
7. Foundation for future per-tab caching/measurement (0D-5) without building either now.

## 3. Non-Goals

No new analytics · no query optimization or SQL changes · no caching beyond in-memory page-session state (no SWR/HTTP caching) · no rollups (Phase 13) · no schema changes · no GraphQL · **no React Query/TanStack Query** (see §8 justification) · no tab redesign · no shared frontend/backend package · no changes to auth, project selection, or date-range behavior · no changes to the Events page or any other endpoint.

## 4. Recommended API Shape

**Recommended: Option A — one endpoint, `tab` query parameter:**

```
GET /api/analytics/summary?tab=overview|conversion|products|shoppers|behavior  (+ existing projectId/range/from/to)
GET /api/analytics/summary                                                     (no tab → full payload; temporary, removed in 0D-4C)
```

`sales` is deliberately **not** in the API union — it is a static, honest unavailable state with no data; the frontend never requests it. Unknown `tab` values → 400 (mirrors the scope-validation 400 pattern).

| Criterion | A: `?tab=` param (chosen) | B: endpoint per domain | C: one endpoint, conditional groups |
|---|---|---|---|
| Routing complexity | Zero new routes; one param validation | 5 new route+controller pairs, auth wiring ×5 | Zero, but "conditional on what?" — C without a param is A |
| Type safety | Literal-union param → discriminated per-tab response types | Same, via per-endpoint types | Same as A |
| Controller size | Thin switch → per-tab composer | 5 thin controllers (boilerplate) | Same as A |
| Backward compat | **Free**: absent param = today's behavior during migration | Old endpoint coexists separately | Same as A |
| Future caching | URL includes tab → fully URL-keyed cacheable | Equally cacheable | Same |
| Testability | Per-tab composers unit-testable; one contract-test surface | Same, spread across files | Same |
| Migration risk | Smallest diff; scope/auth path shared once | More files, more places to drift | — |

A and C are the same family; A is C with an explicit contract. B's only real advantage (per-URL separation) is matched by A's query param at a fifth of the boilerplate. **A wins as the smallest practical design.**

## 5. Domain-to-Tab Data Contract

| Tab | Backend modules called | Response type (`data`) | Loading state | Empty state | Real data today? |
|---|---|---|---|---|---|
| **Overview** | `eventActivity` (all 9 stmts — topEvents/eventsByProject are *server-side inputs* to health/insights, not returned) · `trend` (+span when all-time) · `comparison` · `healthInsights` (pure) | `OverviewTabData { summary, comparison, health, insights, trend }` | In-panel skeleton/spinner | Page-level `AnalyticsEmptyState` when `summary.totalEvents === 0` (Overview is the default tab → new-user journey preserved) | Yes |
| **Conversion** | `commerceFunnel` · `sessionFunnel` | `ConversionTabData { sessionFunnel, commerceFunnel }` | In-panel | Existing card-level honest empties (no-session-data, no commerce events) | Yes |
| **Sales** | **none — no request** | — (static component) | none | The existing "Requires tracking: order_id, amount, currency" unavailable state, unchanged | Unavailable-state-only (honest; GMV is Phase 2) |
| **Products** | `productPerformance` (2 CTE queries) | `ProductsTabData { productPerformance }` | In-panel | Existing `hasProductData=false` card empty | Yes |
| **Shoppers** | `shopperSummary` (1 query) | `ShoppersTabData { shopperSummary }` | In-panel | Existing KPI-row zero/`—` handling | Yes |
| **Behavior** | `eventActivity` (reused as-is; totals needed for percentages — finer slicing deferred to measurement in 0D-5) | `BehaviorTabData { topEvents, eventsByProject, recentActivity, topProperties }` | In-panel | Existing card-level empties | Yes |

Non-Overview tabs deliberately drop the page-level empty gate and rely on their existing per-card honest empties — no response-shape padding with a redundant `totalEvents`.

## 6. Shared Scope Contract

Every tab request goes through the **same single path**: `authMiddleware` → controller → `createAnalyticsScope({userId, projectId, range, from, to})` → per-tab composer receives the `AnalyticsScope` object. Nothing tab-specific touches project, preset/custom dates, `from/to` parsing, timezone convention (database-session), previous-period windows, or ownership — those all live in `analyticsScope.ts` (0D-2) and are consumed unchanged. The frontend sends the identical query params it sends today (`projectId`, `range`, `from`, `to`) plus `tab`. **Rebuilding filters anywhere in 0D-4 code is a review rejection** (standards §7.2 of the 0D-3 plan applies verbatim).

## 7. Frontend State Design

- **Active tab:** unchanged — URL `?tab=` via `AnalyticsTabs`; invalid values already fall back to `overview`.
- **Per-tab state container** (in the new hook): one object `{ scopeKey: string, tabs: Partial<Record<DataTabId, TabState>> }` where `TabState = {status:"loading"} | {status:"error"; message} | {status:"success"; data: TabDataMap[T]}`. `DataTabId` excludes `sales`.
- **In-memory session cache: yes, keep it simple.** A loaded tab's `success` state persists while `scopeKey` is unchanged; switching back renders instantly with no refetch. This is plain React state — no TTL, no storage, dies with the page.
- **Invalidation:** any scope change (project, preset, custom from/to) produces a new `scopeKey` → the entire `tabs` map is discarded and the active tab fetches fresh. No per-tab partial invalidation (filters affect every tab by definition).
- **Stale-request protection:** generalize the existing pattern — a `useRef<Record<DataTabId, number>>` of per-tab request ids; a response commits only if its request id is current *and* its scopeKey matches. Scope change bumps all ids (the map swap makes late responses unmatchable anyway — belt and braces, same as today).
- **Refresh:** sets the active tab to `loading` and refetches **only it**; other cached tabs untouched. (Refresh label/behavior of `AnalyticsRefreshBar` unchanged.)
- **Back/forward:** browser history changes `?tab=` → `AnalyticsTabs` re-resolves; hook sees a new active tab → cache hit renders instantly, miss fetches. Filters in the URL (custom range) participate in history identically to today.
- **Invalid custom range:** unchanged behavior — page-level error without retry, no fetches fire (`customRangeError` short-circuit preserved).

## 8. Data Fetching Strategy

**Existing fetch + React state via one focused hook. No new dependency.** React Query would buy request dedup, cache lifetimes, and background refetch — none of which are requirements here; the app has exactly one data consumer per tab, one invalidation rule (scopeKey), and an established `apiRequest` + requestId pattern that 0D-1 just hardened. Adding a dependency contradicts standards §12 (dependency hygiene) without evidence.

```ts
// useAnalyticsTabData.ts (new, ~120 lines)
function useAnalyticsTabData(params: {
  activeTab: AnalyticsTabId;          // from URL (resolveTab)
  scopeKey: string;                    // existing computed key
  scopeQuery: URLSearchParams | null;  // projectId/range/from/to; null when custom range invalid
}): {
  tabState: TabState | null;           // null for "sales" (no data tab)
  refreshActiveTab: () => void;        // refetch current tab only
}
```

- **Inputs:** active tab + the already-computed scope pieces (the hook does not re-derive scope — single source in `AnalyticsOverview`).
- **Outputs:** the active tab's state + refresh trigger.
- **Cancellation:** request-id guard (same as today); optional `AbortController` piggybacked on the effect cleanup — nice-to-have, not required for correctness given the id guard.
- **Retries:** none automatic; the in-panel Retry button calls `refreshActiveTab` (matches current manual-retry philosophy).
- **Fetch trigger:** effect on `(activeTab, scopeKey)` — fetch only when the active tab is a data tab **and** has no `success` entry for the current scopeKey.
- **Cache invalidation:** scopeKey change swaps the whole container (§7).

## 9. Type Strategy

- **Per-tab response interfaces** on both sides, replacing the monolith: `OverviewTabData`, `ConversionTabData`, `ProductsTabData`, `ShoppersTabData`, `BehaviorTabData`, plus `type TabDataMap = { overview: OverviewTabData; … }` and `DataTabId = keyof TabDataMap`. The hook's `TabState` is the discriminated union above — **no giant all-nullable `AnalyticsData`**.
- Constituent types (`AnalyticsSummary`, `SessionFunnel`, `ProductPerformance`, …) are unchanged and reused — per-tab types are thin compositions, so metric shapes stay byte-compatible.
- **MIRROR rule preserved:** server exports tab payload types from the composition module (`summary.ts` or sibling `tabs.ts` per 0D-3E outcome) with `// MIRROR:` comments; web `analytics-types.ts` mirrors them alongside the existing constituent types.
- **Migration:** 0D-4A adds tab types beside the existing full `AnalyticsData` (both valid); 0D-4B moves the frontend onto tab types; 0D-4C deletes the full `AnalyticsData` composition type on both sides. No generic type framework, no conditional-type gymnastics beyond the one `TabDataMap` lookup.

## 10. Backend Orchestration

Per-tab composers beside `buildAnalyticsSummary` in the 0D-3 composition module — each owns its own `Promise.all`, so **independent queries stay concurrent within a tab**:

```ts
buildOverviewTab(scope):    spanDays? → plan → Promise.all([fetchEventActivity, fetchTrend, fetchPeriodComparison])
                            → buildComparison/buildInsights/buildHealth → { summary, comparison, health, insights, trend }
buildConversionTab(scope):  Promise.all([fetchCommerceCounts, fetchSessionFunnel]) → builders → { sessionFunnel, commerceFunnel }
buildProductsTab(scope):    Promise.all([fetchProductPerformanceRows, fetchCategoryPerformanceRows]) → { productPerformance }
buildShoppersTab(scope):    fetchShopperSummary → { shopperSummary }
buildBehaviorTab(scope):    fetchEventActivity → mapped arrays → { topEvents, eventsByProject, recentActivity, topProperties }
```

Notes: Overview intentionally reuses `fetchEventActivity` wholesale because health/insights consume topEvents/eventsByProject/activeProjects as inputs — identical to today's semantics. Behavior reuses it too (totals drive percentages); slicing `eventActivity` finer is a *measured* optimization for later, not this phase (non-goal: query optimization). The controller becomes: scope → `tab` param validation → `switch` to composer (absent → `buildAnalyticsSummary` until 0D-4C). Nothing is serialized that runs in parallel today.

## 11. Backward Compatibility Strategy

The full endpoint's **only consumer is our own frontend** (verified: one call site, `AnalyticsOverview.tsx`). Safest migration:
1. **0D-4A:** full no-`tab` path remains **byte-identical** (untouched `buildAnalyticsSummary`); tab param is additive. Instant rollback = frontend ignores the param.
2. **0D-4B:** frontend switches to per-tab requests; full path still exists as a safety net (unused).
3. **0D-4C:** remove the no-param full path (400 with "tab is required" or explicit list), delete `buildAnalyticsSummary` and the full `AnalyticsData` type on both sides.
Not chosen: keeping the full path indefinitely (dead code + drift risk) or removing it immediately (no rollback during frontend migration). Internal reuse is already maximal — tab composers and the full builder share the same fetchers.

## 12. Loading, Error, and Empty States

| Situation | Behavior |
|---|---|
| First load (default tab) | Page header + tabs render immediately; Overview panel shows in-panel loading (page-level spinner retires in 0D-4B) |
| Switch to unloaded tab | That panel shows loading; tab bar stays interactive |
| Switch back to loaded tab (same scope) | Instant render from session cache, no request |
| Per-tab API failure | In-panel error + Retry (retries that tab only); other tabs' cached data intact — **a failed tab never erases sibling data** |
| Global auth failure (401) | Existing `apiRequest`/dashboard-layout auth handling unchanged; not a per-tab state |
| Invalid project / invalid custom range | Existing page-level 400/validation error behavior preserved (no tab fetches fire) |
| Empty results | Overview: page-level `AnalyticsEmptyState` (totalEvents=0); other tabs: existing per-card honest empties |
| Retry | Per-tab button → `refreshActiveTab` |
| Refresh bar | Refreshes current tab only; loading indicator reflects the active tab's state |

## 13. URL and Filter Preservation

Confirmed against current code: tab lives in `?tab=` (overview = absent) — unchanged; custom range lives in `?range=custom&from&to` — unchanged; project lives in header context (localStorage-backed, not URL) — unchanged; tab switching uses `router.push` preserving all other params (existing `URLSearchParams` copy) — filters survive tab changes; any filter change → new `scopeKey` → all cached tabs invalidated (§7); back/forward re-resolves both tab and range from the URL and hits cache or fetches. No URL schema changes in this phase.

## 14. Accessibility and UX

- Tablist semantics, roving tabindex, Arrow/Home/End navigation, and focus behavior in `AnalyticsTabs` are already correct — **unchanged**.
- In-panel loading regions: spinner + visible text ("Loading overview…"), container marked `aria-busy="true"`; panel keeps `role="tabpanel"` labeling.
- Errors: `role="alert"` on the message (existing pattern), Retry is a real `<button>` with visible focus ring.
- Layout: loading/error/empty placeholders get a sensible `min-h` (existing `h-64` convention) so tab switches don't collapse the page; no cross-tab layout jumps since panels already mount exclusively.
- Focus is not stolen on data arrival; tab focus management stays keyboard-driven as today.
- Copy stays merchant-honest; no spinner-only states.

## 15. Branch Strategy

Accepted split 0D-4A/B/C (evaluated alternative — merging B+C — rejected: the temporary full-path safety net during frontend migration is exactly what makes B low-risk):

| Branch | Scope | Files (expected) | Validation | Commit message |
|---|---|---|---|---|
| **0D-4A** `feature/analytics-tab-endpoint` | Backend only: `tab` param validation; 5 per-tab composers reusing 0D-3 fetchers; per-tab payload types + MIRROR comments; no-param path untouched | composition module (`summary.ts`/sibling), `analytics.controller.ts`, web `analytics-types.ts` (mirror types only, unused yet) | typecheck · build · focused lint · `git diff --check` · **slice-equivalence check**: for each scope in the matrix, `?tab=X` response deep-equals the corresponding key-subset of the no-param response (same run, back-to-back); no-param response byte-identical to pre-branch baseline | `feat: add per-tab analytics endpoint sections` |
| **0D-4B** `feature/analytics-tab-lazy-fetch` | Frontend only: `useAnalyticsTabData` hook; `AnalyticsOverview` becomes shell (header/scope/empty-gate for overview) + per-panel states; panels receive per-tab data; in-panel loading/error/retry; refresh = active tab | `useAnalyticsTabData.ts` (new), `AnalyticsOverview.tsx`, small panel-boundary component, `analytics-types.ts` | typecheck · build · focused lint · full §17 manual matrix in browser · network panel shows exactly one tab request per tab/scope, zero for Sales | `feat: load analytics tabs lazily per tab` |
| **0D-4C** `refactor/remove-full-analytics-fetch` | Remove no-param full path (explicit 400), delete `buildAnalyticsSummary` + full `AnalyticsData` type both sides, dead-code sweep | controller, composition module, `analytics-types.ts` | typecheck · build · lint · grep proves no consumer of removed type/path · smoke matrix re-run | `refactor: remove full analytics summary fetch path` |

## 16. Migration Plan (app works after every step)

1. Land 0D-4A → API gains tab sections; frontend still uses the full path; **zero user-visible change** (verified by baseline diff).
2. Land 0D-4B → frontend fetches per tab; full path idle but present (rollback = revert one frontend branch).
3. Soak: run the §17 matrix against seeded data; compare per-tab values with pre-0D-4 full-response captures (slice equality).
4. Land 0D-4C → dead path removed; contract is per-tab only.
5. Update the local response-diff harness (from 0D-3) to capture per-tab URLs — it remains the regression net until Phase 9 contract tests exist.

## 17. Validation Matrix

For **each tab** (Overview, Conversion, Sales, Products, Shoppers, Behavior): × {preset 24h/7d/30d/all, custom single-day, custom multi-day} × {all projects, one project} — verify: correct data renders (equal to full-response slice) · Sales makes **no request** · refresh refetches only the active tab · back/forward restores tab + filters with cache hits · filter change invalidates every cached tab (switching after a project change refetches) · loaded-tab cache gives instant no-request re-render · failed tab shows in-panel error, Retry recovers it, sibling cached tabs unaffected (simulate via stopped backend mid-session) · empty scope shows the honest empty states per §12 · **cross-tenant check**: second test account sees only its own data on every tab URL incl. hand-edited `?tab=` params · invalid `tab` param → 400 (API) and unknown tab in URL → overview fallback (UI) · no console errors.

## 18. Performance Expectations

Statement counts are verifiable facts; latency/payload gains are **not claimed without measurement**:
- Default load (Overview): ~16 statements → **~12** (activity 9 + trend + comparison + all-time span when applicable).
- Conversion: 2 · Products: 2 (the heaviest CTEs now run *only* when that tab opens) · Shoppers: 1 · Behavior: 9 · **Sales: 0** (from ~16).
- Payload per request shrinks from full `AnalyticsData` to one tab's slice.
- Eliminated outright: funnel/product/shopper queries on Overview loads; *all* queries on Sales views.
**Phase 0D-5 measures:** before/after per-tab response times (p50/p95), statement counts from Postgres logs, payload bytes, and time-to-first-usable-tab — using the seeded dataset and, later, the Phase 13 benchmark harness. Any further slicing (e.g. splitting `eventActivity` for Behavior) waits for those numbers.

## 19. Risks

| Risk | Mitigation |
|---|---|
| Stale cached tab after data changes server-side | Session-only cache + explicit per-tab Refresh; scope change always invalidates; acceptable staleness window is a deliberate, documented choice (no background refetch by design) |
| Filter change failing to invalidate all tabs | Single `scopeKey` guards the whole container — one code path, one test in §17 |
| Response-type drift between tab payloads and full payload (during A/B window) | Slice-equivalence check in 0D-4A validation; types composed from the same constituent interfaces |
| Duplicated fetch logic per tab | One hook, one request function parameterized by tab — no per-tab fetch copies |
| One tab using different scope | Scope built once in the controller from the same params; hook passes one shared `scopeQuery`; review grep: no scope parsing outside `analyticsScope.ts` |
| Accidental API break for the in-flight window | No-param path byte-identical until 0D-4C; baseline diff enforced in 0D-4A |
| Overcomplicated state management | One state object + one ref; no reducers/libraries; hook ≤ ~120 lines or it gets re-reviewed |
| Lost concurrency | Each composer keeps its own `Promise.all`; §17 spot-check that Overview issues its statements concurrently (single round-trip burst in logs) |
| Sales accidentally gaining a fetch | `DataTabId` excludes `sales` at the type level; hook returns `null` for it |

## 20. Acceptance Criteria

Complete when: each data tab loads via `?tab=` requests executing only its §5 modules; Sales issues zero requests; per-tab values equal the pre-0D-4 full-response slices across the §17 matrix; refresh is tab-scoped; per-tab loading/error/retry work with sibling-tab data preserved; URL tab + custom-range + history behavior unchanged; a11y semantics unchanged (tablist keyboard nav intact, `role="alert"` errors, `aria-busy` loading); the full-fetch path and monolith `AnalyticsData` type are deleted (0D-4C) with no remaining references; typecheck/build/focused-lint/`git diff --check` green on all three branches; no schema, metric, alias, or scope-rule diffs anywhere.

## 21. Handoff Prompt for Codex (first branch only — 0D-4A)

> You are working in the EventPulse repository. Phases 0D-1 through 0D-3E are complete: analytics uses `AnalyticsScope` (`apps/server/src/analytics/analyticsScope.ts`) and decomposed domain modules composed by a summary builder, behind a thin `analytics.controller.ts`. Implement **Phase 0D-4A only**: the backend per-tab endpoint contract. Create and switch to branch `feature/analytics-tab-endpoint` from the latest main.
>
> **Read first, edit second:** `~/.claude/plans/analytics-tab-lazy-loading-phase-0d4.md` (§4, §5, §10, §11, §15 row 0D-4A), `~/.claude/plans/analytics-query-modules-phase-0d3.md` (module layout), `~/.claude/plans/eventpulse-engineering-quality-standards.md` (§§4–6, 9, 10, 18). Inspect the current composition module, `analytics.controller.ts`, `analyticsScope.ts`, and `apps/web/components/dashboard/analytics/analytics-types.ts` before writing anything.
>
> **Scope — exactly this, nothing more:**
> 1. In the server analytics composition module, add five exported per-tab composers reusing the existing fetchers/builders with **zero metric or SQL changes**: `buildOverviewTab`, `buildConversionTab`, `buildProductsTab`, `buildShoppersTab`, `buildBehaviorTab`, per §10 of the 0D-4 plan (each with its own `Promise.all`; Overview reuses the full activity fetch because health/insights consume it; Behavior reuses it for percentage totals).
> 2. Export per-tab payload types (`OverviewTabData`, `ConversionTabData`, `ProductsTabData`, `ShoppersTabData`, `BehaviorTabData`) composed from existing constituent types, each with a `// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts` comment; add the mirrored types (unused for now) to the web types file with reverse comments. There is deliberately no `sales` payload.
> 3. In `analytics.controller.ts`: read `req.query.tab`; absent → existing full `buildAnalyticsSummary` path **byte-identical** (do not touch it); one of the five valid ids → respond `{ success: true, data: <tab payload> }`; any other value → 400 `{ success: false, message: "Unknown analytics tab" }`. Scope building, auth, and error handling stay exactly as they are.
> 4. Touch nothing else: no frontend behavior changes (types file comment/type additions only), no routes, no schema, no scope logic, no metric/alias edits, no other endpoints.
>
> **Validation (run and report actual results):** `bun run typecheck` · `bun run build` · `bunx eslint` on touched files · `git diff --check` · `git status` (only intended files). Behavior preservation with the local server + seeded data, captured back-to-back: (a) no-`tab` responses for the scope matrix {all-projects, one project} × {all, 24h, 7d, 30d, one custom from/to} are byte-identical before vs after your change; (b) for each of the five tab ids in the same scopes, the tab response's `data` deep-equals the corresponding key-subset of the no-`tab` response; (c) `?tab=bogus` → 400 with the exact message; (d) unauthenticated → 401. If the server cannot be run, state so explicitly and list what was verified by inspection only.
>
> **Report:** files created/modified, composer-to-module mapping, validation outputs, slice-equivalence results per scope, limitations. **Do not commit** — propose commit message `feat: add per-tab analytics endpoint sections` and stop.

---
*Prepared read-only against the 0D-3B working tree (`refactor/analytics-activity-trend-comparison`); no source files or permanent documents were modified.*
