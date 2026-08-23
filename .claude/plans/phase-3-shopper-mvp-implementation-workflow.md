# EventPulse Phase 3 — Shopper MVP Implementation Workflow

**Type:** Feature phase (analytics read-side). No schema change, no migration, no new dependency.
**Assumes:** Phases 0D-5, 0M, 1A–1F, and 2A–2E are implemented and merged. Verified against the repository at `main` / `1c29cc6`, clean tree.
**Authority:** analytics blueprint §B (B1–B4) and Part 7 row 3 for metric semantics · Commerce Tracking Contract for order identity · `eventpulse-engineering-quality-standards.md` for practice · `eventpulse-system-architecture-book.md` ADRs 9/13/14/17 for structure. This document operationalizes those sources and redefines nothing in them.
**Decision status:** all product and architecture decisions are **locked** (see below). There are no remaining implementation blockers.

---

## Verification findings that shaped this plan

Four repository facts, verified directly against the post-Phase-2 tree, drive the branch design:

1. **`salesFactsCtes` reuse is cheap.** It builds a CTE chain in which `scoped_sales_events` feeds `order_fact_events` → `identity_ranked` → `identity_representatives` via `SELECT *`. Adding `"customerId"` to the base CTE's select list propagates automatically to every representative CTE, while the downstream aggregate CTEs (`money_evidence_quality`, `order_quality`, `currency_slices`) name their columns explicitly and are unaffected. **P3-A1 is a one-column addition plus a file move — not a rewrite.**
2. **`AnalyticsScopeSql` has no range-start fragment.** Its eight members are `ownedProject`, `ownedEvent`, `ownedAliasedEvent`, `currentEvent`, `currentAliasedEvent`, `todayEvent`, `comparisonCurrentRange`, `comparisonPreviousRange`; `boundarySql`/`periodCondition` are private. B2 needs a "before range start, same ownership and project" fragment, and ADR 9 forbids a feature module from constructing one. **B2 therefore requires one additive fragment in `analyticsScope.ts`.**
3. **Trend bucketing is already duplicated.** `trend.ts` holds one implementation and `sales.ts:trendBucketsCtes` a second. B1 would be the third — standards §3.6's refactor trigger. Handled as filed debt, deliberately *not* inside a feature branch (see Stop Conditions).
4. **The benchmark dataset most likely needs no change.** Bench customers cycle via `customerPool[sessionIndex % customerPool.length]`, so medium's ~30k customers across ~110k sessions average 3–4 sessions each; order IDs are minted per session, so a customer with ≥2 successful-purchase sessions yields ≥2 distinct confirmed orders. With 3,359 purchase profiles spread over ~30k customers (λ≈0.11), roughly 150–200 customers should hold ≥2 confirmed orders. Cross-project shared customer IDs and ~8% null-`customerId` rows are already seeded. **This is confirmed empirically by a read-only pre-flight in branch 3A before anything depends on it.** If confirmed, the seeder stays untouched, manifest identity is preserved, and direct timing comparison against `phase-2-514bbd9b-medium` remains valid.

---

# Phase 3 Architecture Decisions

All decisions below are **locked**. Implementers must not re-litigate them; deviations require owner approval and a plan update.

## Product decisions

**P3-P1 — Purchasing-shopper basis. LOCKED.** All new B3/B4 confirmed-order logic uses `ORDER_FACT_EVENT_NAMES` from `contract/orderIdentity.ts`. `PURCHASE_ALIASES` is never used for a new confirmed-order metric. The legacy `purchasingSessions` KPI keeps its current query, basis, and value; branch 3E labels its basis explicitly so the two "purchase" notions cannot be confused on one tab. **Changing the `purchasingSessions` basis requires separate approval and is out of scope for Phase 3.**

**P3-P2 — GMV ranking under mixed currency. LOCKED.** B4's GMV mode ranks in the **dominant tracked currency only** (most money-bearing confirmed orders; ties broken by currency code ASC, the Phase 2 precedent). Other-currency money is excluded from the ranking, never converted and never summed across currencies. The payload carries the excluded-order count and the UI discloses it alongside the currency label.

**P3-P3 — Cross-project shopper identity. LOCKED.** All-projects mode keys on `(projectId, customerId)`. Identical customer IDs are never merged across projects; a person may be new in one project and returning in another, and this is disclosed honestly in UI copy.

**P3-P4 — Performance sequencing. LOCKED.** No optimization phase precedes Phase 3. Every branch that adds a statement benchmarks it; regressions are filed as findings, not fixed. No index, rollup, cache, or materialized state is added in this phase.

**P3-P5 — Legacy `uniqueCustomers` identity. LOCKED — approved as a Principle-5 conformance correction.**
`shopperSummary.ts` currently computes `COUNT(DISTINCT "customerId")`, which merges identical customer IDs across projects in all-projects mode — contradicting blueprint Principle 5 ("never merge identical customerIds across projects"). Phase 3 corrects it to `COUNT(DISTINCT ("projectId", "customerId"))`.

Binding implementation requirements:
- The value change is implemented **only in branch 3E**. Branches 3A–3D must not touch `shopperSummary.ts`.
- The **response field name `uniqueCustomers` is preserved** — this is a value correction, not a new or renamed metric.
- Before/after values are **recorded for every scope in the 3E validation matrix** and pasted into the PR.
- The visible metric correction is **documented explicitly** in the PR body and in the tab's copy, framed as a conformance fix to the project-scoped identity rule.
- The legacy `purchasingSessions` basis is **not** changed (P3-P1).

**P3-P6 — B2 scope. LOCKED — one lifecycle statement ships both summary and series.**
Phase 3C ships the selected-period New vs Returning **split summary** and the blueprint's **per-bucket lifecycle series** from one statement. Bounded ranges normalize pre-range identities once into a distinct shopper set and left join it to active shoppers; the rejected correlated historical `EXISTS` caused pathological repeated range scans. `MIN(createdAt)` over rows already constrained to the selected range identifies the first bucket for shoppers without prior history. A shopper is New only in that first bucket and Returning in every later active bucket, so `new + returning = B1 active` in every bucket. All-time performs no historical scan: its summary is not-applicable, while the first observed bucket is New and later active buckets are Returning. No index, schema change, lazy-loading infrastructure, or details endpoint is added. Progressive disclosure of the two views lands later in 3E and is presentation only, not lazy loading.

## Architecture decisions

**P3-A1 — Order-dedup reuse. LOCKED: extract to a shared module and add the customer dimension there.** Move the CTE builder out of `sales.ts` into `apps/server/src/analytics/shared/orderFacts.ts`, exporting `orderFactsCtes(eventScope)`, and add `"customerId"` to `scoped_sales_events`. `sales.ts` imports it; shopper modules import the same builder.
*Rationale:* exporting `salesFactsCtes` from `sales.ts` would make the shoppers module depend on a sibling feature module (wrong dependency direction); a shopper-only copy would fork order identity, which blueprint Part 5 and ADR 17 exist to prevent. Extraction yields one definition, a clean direction (both features depend on shared), and a mechanical, provable diff.
*Constraint:* shopper queries reference only `identity_representatives` (and `money_representatives` for B4 GMV). Branch 3D must **verify by EXPLAIN** whether unreferenced CTEs from the chain appear in the shopper plan. If they carry measurable cost, the remedy is to split the builder into `orderIdentityCtes()` and `orderMoneyCtes()` — reported, not applied unilaterally.

**P3-A2 — B2 first-seen model. LOCKED: pre-range distinct shopper set plus range-scoped `MIN(createdAt)`.**
*Justification:* B2 needs one historical boolean — does an event for this `(projectId, customerId)` exist before the range start? Bounded ranges derive it by normalizing retained history once into a distinct shopper set and left joining that set to active shoppers. The correlated `EXISTS` formulation was rejected after medium-tier plans exceeded 60–180 seconds through repeated historical scans. For shoppers without pre-range history, `MIN(createdAt)` is computed only over their already range-scoped rows to identify the first lifecycle bucket. No global historical first-seen aggregation is allowed.
*Tenant safety:* the pre-range read is bounded by the new scope fragment carrying ownership and project; the shopper module never composes its own boundary (ADR 9).
*Range semantics:* when the range has no lower bound (all-time), there is no "before" — the selected-period summary is honestly not-applicable, while the series treats each shopper's first observed bucket as New and later active buckets as Returning.
*Planner expectation:* one scoped pre-range scan/normalization followed by a set join; no per-shopper historical SubPlan loop.
*Statement count:* 1.
*Index:* none added. The measured replacement passed without a new index, so the standards §9 index evidence bar is not satisfied.

**P3-A3 — Module boundaries. LOCKED.** `shopperSummary.ts` remains the legacy KPI module (touched only in 3E, for P3-P5). New siblings: `shopperTrend.ts` (B1), `shopperLifecycle.ts` (B2), `shopperOrders.ts` (B3+B4). Each holds one query plus pure builders — coherent and independently reviewable, matching the 0D-3 module pattern.

**P3-A4 — Statement budget. LOCKED: target 4 concurrent statements** on the Shoppers tab (legacy summary + B1 + B2 + B3/B4 combined), plus **1 sequential span pre-query on all-time only** for trend granularity resolution — the same shape Overview already uses. B3 and B4 deliberately **share one statement**: both derive from the same orders-per-customer aggregation, so B3's totals come from window aggregates (`COUNT(*) OVER ()`, `SUM(...) OVER ()`) evaluated before `LIMIT`, while B4's top-N comes from the same scan. Four statements sits well inside the pool of 10 and adds nothing to Overview.

**P3-A5 — Confirmed vs estimated basis. LOCKED.** B3 and B4 require confirmed `order_id` evidence. When a scope has purchasing activity but zero confirmed orders, B3 and B4 render **unavailable** with unlock guidance naming `order_id` (reusing rung-4 copy from `trackingReadiness.ts`). Session estimates never feed repeat-purchase rate or order ranking — fabricating repeat behavior from sessions would violate Principle 11. B1, B2, and the legacy KPIs remain available regardless, since they do not depend on order identity.

**P3-A6 — Null-`customerId` disclosure. LOCKED.** Every shopper payload carries a coverage object: events in scope, events with a usable `customerId`, and the derived excluded count/percentage. The UI states coverage whenever it is below 100%. Separately, confirmed orders whose **identity representative** carries no usable `customerId` are unattributable: they still count in Sales but are excluded from B3/B4 and reported in a dedicated counter.

---

# Phase 3 Dependency Graph

```
Phase 2 (merged)
   │
   ▼
3A shared order facts (+customerId)  ── behavior-preserving; unblocks B3/B4
   │
   ├────────────► 3B  B1 Active Shoppers Trend        (independent of 3A)
   │
   ├────────────► 3C  B2 New vs Returning lifecycle   (adds scope fragment)
   │
   └────────────► 3D  B3 Repeat Purchase + B4 Top Shoppers   (requires 3A)
                          │
   3B + 3C + 3D ──────────┴──► 3E  Shoppers tab UI (+ P3-P5 correction)
                                     │
                                     ▼
                               3F  Benchmark + EXPLAIN + baseline
```

3B is technically independent of 3A and may run in parallel with a second implementer; the linear order below is the single-implementer default.

# Phase 3 Branch Sequence

**3A → 3B → 3C → 3D → 3E → 3F** — six branches. Backend metric branches land before UI (Phase 2's proven sequencing); benchmarking lands last so it measures the finished tab.

---

## Branch 3A — `refactor/shared-order-facts`

**1. Branch name:** `refactor/shared-order-facts`

**2. Goal:** Establish one reusable order-identity SQL definition carrying a customer dimension, so B3/B4 cannot fork Phase 2's semantics. Behavior-preserving: zero user-visible change.

**3. Dependencies:** Phase 2 merged. No decisions pending.

**4. Files expected to change:** `apps/server/src/analytics/shared/orderFacts.ts` (new) · `apps/server/src/analytics/sales.ts` (imports the extracted builder; local definitions deleted).

**5. Files that must not change:** `contract/*` · `analyticsScope.ts` · `lineItems.ts` · `productPerformance.ts` · `summary.ts` · `analytics.controller.ts` · `shopperSummary.ts` · any `apps/web/**` · `prisma/**` · `scripts/**`.

**6. Data/API/schema impact:** None. No migration, no payload field, no endpoint change. Sales responses must be byte-identical.

**7. Step-by-step:**
1. Read `sales.ts` fully; inventory every consumer of `salesFactsCtes`, `orderFactNamesSql`, and `allMoneyEvidenceNamesSql`.
2. Create `shared/orderFacts.ts` and move those three functions **verbatim** (copy the SQL, never retype it), plus any money/currency SQL pattern constants they close over.
3. Add exactly one column — `"customerId"` — to the `scoped_sales_events` SELECT list.
4. Grep the moved SQL for `SELECT DISTINCT *`, `UNION`, or any `GROUP BY` over all columns whose meaning a new column would change; confirm none exist (expected: none — every aggregate CTE names its columns).
5. Update `sales.ts` to import from the shared module and delete the local copies. Make no other edit to `sales.ts`.
6. Run the Sales response byte-diff and the pre-flight dataset check below.

**8. Metric semantics:** Unchanged. Order identity remains distinct `(projectId, BTRIM(order_id))`; representative ordering remains name-priority → `createdAt` ASC → `id` ASC; money-representative rules, currency slices, and quality flags are untouched.

**9. SQL design:** Identical to today plus one column. `customerId` propagates through `order_fact_events`, `identity_ranked`, `identity_representatives`, the `session_*` CTEs, and the money-evidence chain via their existing `SELECT *`. Explicit-column CTEs downstream are unaffected.

**10. Scope/tenant rules:** The builder continues to take an injected `eventScope` fragment and never constructs ownership SQL. No new tenant surface.

**11. Edge cases:** Orders whose events carry mixed or null `customerId` — 3A only *carries* the column; attribution rules belong to 3D. A column addition must not alter row counts anywhere, which the byte-diff proves.

**12. Payload types:** None changed.

**13. Frontend behavior:** None.

**14. Empty/unavailable/partial states:** Unchanged.

**15. Performance budget and expected statement count:** No statement added anywhere. Sales cells must stay within the same variance band as `phase-2-514bbd9b-medium`; plan-shape stability is the harder gate, since timing bands are directional (F-P2E-08).

**16. Fixture matrix:** Sales responses for {all-projects, one project} × {24h, 7d, 30d, custom-long, all}, captured before and after on the same database and diffed byte-for-byte. Expected: empty diff on all ten cells.

**17. Benchmark/EXPLAIN requirements:** Run `bench:explain` for the Phase 2 sales targets (#20–#25) and confirm **plan-shape hashes are unchanged**. Additionally run the **Phase 3 pre-flight dataset check** (read-only, against the benchmark database) and record results in the PR: (a) buyers with ≥2 distinct confirmed orders, (b) customer IDs appearing in more than one project, (c) rows with NULL `customerId`. **If (a) is zero, stop and report** — 3D and 3F must then be re-planned around a seeder change following the Phase 2E two-step pattern.

**18. Validation commands:**
```bash
bun run typecheck
bun run build
bun run lint
cd apps/server && bun run bench:typecheck
git diff --check
git status
```
plus the §16 byte-diff and the `bench:explain` plan-hash comparison.

**19. Acceptance criteria:** One order-identity definition exists in `shared/orderFacts.ts`; `sales.ts` contains no local dedup SQL; `customerId` is available on `identity_representatives`; all ten Sales cells byte-identical; sales EXPLAIN plan hashes unchanged; pre-flight dataset results recorded.

**20. Risks:** R1 a mistyped SQL character silently changing dedup → mitigated by verbatim move plus byte-diff. R2 the added column perturbs the planner → detected by plan-hash comparison; a shape change is a finding to report, not to fix here. R3 unreferenced CTEs costing work in later shopper queries → measured in 3D, with a defined remedy.

**21. Recommended commit message:** `refactor: extract shared order facts with customer dimension`

---

## Branch 3B — `feature/shopper-active-trend`

**1. Branch name:** `feature/shopper-active-trend`

**2. Goal:** B1 — distinct active shoppers per time bucket, with granularity following the selected range.

**3. Dependencies:** None hard (independent of 3A); sequenced after 3A by default.

**4. Files expected to change:** `apps/server/src/analytics/shopperTrend.ts` (new) · `apps/server/src/analytics/summary.ts` (Shoppers composer and `ShoppersTabData`) · `apps/web/components/dashboard/analytics/analytics-types.ts` (MIRROR types only).

**5. Files that must not change:** `shopperSummary.ts` · `sales.ts` · `shared/orderFacts.ts` · `trend.ts` · `analyticsScope.ts` · `contract/*` · any UI component (types file only) · `prisma/**` · `scripts/**`.

**6. Data/API/schema impact:** Additive field on the Shoppers tab payload. No schema change.

**7. Step-by-step:**
1. Reuse `resolveTrendGranularity` and `fetchTrendSpanDays` from `trend.ts` (imported, unmodified) for granularity resolution; all-time performs the span pre-query sequentially, exactly as Overview does.
2. Write `fetchShopperTrend(scope, granularity)` implementing §9.
3. Add a `// DEBT:` comment noting this is the third bucket-generation implementation and pointing at the register entry (see Stop Conditions).
4. Wire into `buildShoppersSummary`'s `Promise.all`; extend `ShoppersTabData`; mirror the types both ways.

**8. Metric semantics:** Per bucket, the count of distinct `(projectId, customerId)` pairs having at least one event in that bucket within scope. Rows with a null or blank `customerId` are excluded and reported through coverage (P3-A6). Bucket values deliberately do **not** sum to the range total — a shopper active in two buckets counts in both — and the UI must not imply otherwise.

**9. SQL design:** One statement.
```
buckets AS (generate_series over the resolved granularity;
            all-time bounds derived inline from the scoped shopper rows)
shopper_points AS (
  SELECT date_trunc(<granularity>, "createdAt") AS bucket,
         "projectId",
         NULLIF(BTRIM("customerId"), '') AS customer_id
  FROM "Event"
  WHERE ${scope.sql.currentEvent}
    AND NULLIF(BTRIM("customerId"), '') IS NOT NULL
)
SELECT b.bucket,
       COUNT(DISTINCT (p."projectId", p.customer_id)) AS shoppers
FROM buckets b
LEFT JOIN shopper_points p ON p.bucket = b.bucket
GROUP BY b.bucket
ORDER BY b.bucket ASC
```
Composite distinctness uses a row constructor, never string concatenation (no delimiter-collision risk). Empty buckets are real zeros via the LEFT JOIN, matching the established trend contract.

**10. Scope/tenant rules:** `scope.sql.currentEvent` only; no locally composed ownership or date predicate. Timezone follows the database-session convention (ADR 16) — no `AT TIME ZONE`.

**11. Edge cases:** Empty scope → all buckets zero, honest empty state. All-time with zero shopper rows → empty bucket list (no derivable bounds), rendered as unavailable rather than a flat zero line. Single-day custom range → hour granularity. Cross-project shoppers counted once per project (P3-P3). A scope where every row lacks `customerId` → zero series plus coverage disclosure.

**12. Payload types:**
```ts
// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts
export interface ShopperTrendPoint { date: string; shoppers: number; }
export interface ShopperTrend {
  granularity: TrendGranularity;
  points: ShopperTrendPoint[];
}
export interface ShopperCoverage {
  eventsInScope: number;
  eventsWithCustomerId: number;
  excludedPercent: number | null;  // null when eventsInScope = 0
}
```

**13. Frontend behavior:** None in this branch (types only; rendering lands in 3E).

**14. Empty/unavailable/partial states:** Zero-activity scope → empty state. No usable `customerId` anywhere → unavailable, naming `customerId`/`sessionId` via rung-2 copy from `trackingReadiness.ts`. Partial coverage → available with disclosure.

**15. Performance budget and expected statement count:** +1 concurrent statement (Shoppers 1 → 2), plus the existing all-time span pre-query. The measured anchor to beat-or-explain is `shoppers:all:all` at 370 ms median / 976 ms p95.

**16. Fixture matrix:** {all-projects, one project} × {24h, 7d, 30d, custom-long, all}. Verify granularity per range (hour/day/month), bucket count and continuity, zero-filled gaps, composite counting via an independent hand-written `COUNT(DISTINCT (projectId, customerId))` cross-check on at least two buckets, and a cross-project shared customer appearing in both projects' counts.

**17. Benchmark/EXPLAIN requirements:** Register query ID **#26 `shopper-active-trend`** in `explain-query-registry.ts`, extending `ANALYTICS_QUERY_IDS` in `explain-types.ts`. Targets at all/all, all/custom-long, single/all, 30d, plus **day and month granularity variants** (closing the gap F-0D5-06 left unresolved).

**18. Validation commands:** typecheck · build · lint · `bench:typecheck` · `git diff --check` · `git status` · Shoppers payload capture for the §16 matrix · confirm the other four tab payloads are byte-identical.

**19. Acceptance criteria:** B1 returns the correct distinct-shopper series for every matrix cell, verified against independent SQL on at least two buckets; bucket gaps are zeros; coverage reported; no other tab's payload changes; statement count is exactly +1.

**20. Risks:** R1 composite distinctness accidentally written as plain `COUNT(DISTINCT "customerId")` → caught by the cross-project fixture. R2 all-time bounds derived from unscoped rows → caught by the tenant fixture. R3 a third bucket implementation drifting from the other two → mitigated by copying the established pattern verbatim and filing the debt entry.

**21. Recommended commit message:** `feat: add active shoppers trend to shoppers analytics`

---

## Branch 3C — `feature/shopper-new-returning`

**1. Branch name:** `feature/shopper-new-returning`

**2. Goal:** B2 — return a selected-period New vs Returning split and a per-bucket lifecycle series from one statement, subject to the P3-P6 EXPLAIN gate.

**3. Dependencies:** None hard. P3-P6 is locked, so this branch's scope is fixed.

**4. Files expected to change:** `apps/server/src/analytics/analyticsScope.ts` (one additive fragment) · `apps/server/src/analytics/shopperLifecycle.ts` (new) · `summary.ts` · web `analytics-types.ts` (MIRROR types only).

**5. Files that must not change:** `shopperSummary.ts` · `shopperTrend.ts` · `sales.ts` · `shared/orderFacts.ts` · `contract/*` · UI components · `prisma/**` · `scripts/**`. Existing scope fragments must be untouched — the scope change is purely additive.

**6. Data/API/schema impact:** Additive payload field; one additive `AnalyticsScopeSql` member. No schema change.

**7. Step-by-step:**
1. Add `priorToRangeEvent: Prisma.Sql | null` to `AnalyticsScopeSql`, built with the file's existing private boundary helpers as ownership + project + `createdAt <` range start, expressed for the correlation alias `prior`. It is **null when the range has no lower bound** (all-time). Change no existing fragment.
2. Write `fetchShopperLifecycle(scope, granularity)` per §9. It must reuse the granularity already resolved for B1 and return both summary and series from one statement. For all-time, the summary is not-applicable but the query still builds the lifecycle series.
3. Wire it into the existing Shoppers `Promise.all`, extend the types additively, and mirror them. Do not add another all-time span lookup.

**8. Metric semantics:** Among shoppers active in range (distinct `(projectId, customerId)`, non-null id): selected-period **returning** = at least one event exists for that same identity strictly before the range start within the same ownership scope; selected-period **new** = active − returning. For each bucket, a shopper with pre-range history is Returning whenever active; a shopper without pre-range history is New only in the bucket containing their range-scoped `MIN(createdAt)` and Returning in every later active bucket. First-seen is evaluated per project (P3-P3). Percentages are computed only when active > 0, otherwise null.

**9. SQL design:** One statement containing range-scoped shopper rows, distinct active bucket membership, range-scoped first-in-range timestamps, one scoped pre-range distinct shopper set for bounded ranges, selected-period summary aggregates, and the same complete bucket skeleton used by B1. The historical set is normalized once and left joined to active shoppers; `MIN(createdAt)` is restricted to current-range rows. For each bucket, membership is classified as New or Returning and must satisfy `new + returning = B1 active`. All-time omits the historical CTE entirely. No separate lifecycle query and no historical global `MIN(createdAt)`.
```
range_scoped_shopper_events
  -> active_bucket_membership
  -> first_in_range
  -> prior_shoppers (scoped distinct set when bounded)
  -> active_shopper_classification (LEFT JOIN when bounded; FALSE when all-time)
  -> selected_period_summary + zero-filled lifecycle buckets
```
The rejected correlated `EXISTS` repeatedly scanned historical ranges because normalization wrapped the indexed identity column. The selected set-based shape scans/normalizes pre-range history once. The range-scoped `MIN(createdAt)` never scans retained history outside the selected range (P3-A2).

**10. Scope/tenant rules:** **This is Phase 3's only query reading outside the selected range — the highest tenant-risk surface in the phase.** The pre-range read is bounded exclusively by `scope.sql.priorToRangeEvent`, which carries ownership and project; the correlation predicates add identity only. The module composes no ownership or date SQL itself. A cross-tenant fixture check is mandatory (§16).

**11. Edge cases:** **All-time range → no lower bound**; the selected-period summary is not-applicable and never reports 100% New, while the series marks the first observed bucket New and later active buckets Returning. A customer whose earliest event falls exactly at range start is New (the boundary is strictly `<`). A customer active in range whose prior events exist only in another project is New here (P3-P3). Null-`customerId` rows are excluded consistently with B1 coverage. Zero active shoppers → active 0 with null percentages and zero-filled bounded buckets.

**12. Payload types:**
```ts
// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts
export interface ShopperLifecycle {
  summary:
    | { status: "available"; activeShoppers: number; newShoppers: number;
        returningShoppers: number; newPercent: number | null;
        returningPercent: number | null; }
    | { status: "not-applicable"; reason: "unbounded-range"; message: string };
  series: {
    granularity: TrendGranularity;
    points: Array<{ date: string; activeShoppers: number;
      newShoppers: number; returningShoppers: number }>;
  };
}
```

**13. Frontend behavior:** None in this branch (rendering lands in 3E).

**14. Empty/unavailable/partial states:** Bounded empty scopes return measured zero counts with null percentages and zero-filled buckets. All-time summary uses the explicit not-applicable discriminant while its series remains available. Coverage continues to come from B1. Percentages are null rather than zero whenever the denominator is absent (ADR 5).

**15. Performance budget and expected statement count:** +1 concurrent statement (Shoppers 2 → 3), plus the existing sequential all-time span lookup. B2 remains one combined statement. The correlated historical formulation was rejected after pathological timeouts; the measured set-based replacement removed repeated probes without an index or schema change. The mandatory rerun gate must still pass before 3E builds UI on it.

**16. Fixture matrix:** {all-projects, one project} × {24h, 7d, 30d, custom-long, all}. Targeted cases: a customer first seen exactly at range start (summary/first bucket New); a customer with an event one second earlier (summary and every active bucket Returning); a no-history customer active in buckets 1, 2, and 4 (New, Returning, absent, Returning); repeated events in one bucket count once; a shared customer is classified independently across projects; **a second tenant with the same ID has zero influence**; null/blank IDs are excluded; empty scopes have null percentages; all-time summary is not-applicable while first and later active buckets are New then Returning. Automate `B2.new + B2.returning = B1.shoppers` across at least all-project 24h/30d/custom-long/all and single-project 30d/all.

**17. Benchmark/EXPLAIN requirements:** Benchmark registry changes remain deferred to 3F. Capture direct `EXPLAIN (ANALYZE, BUFFERS)` evidence for the combined statement at all-project/all-time, all-project/custom-long, single-project/all-time, and single-project/custom-long. Record execution time, scans, joins, loops, index/heap access, sorts, temp blocks/spill, and rows. The accepted plan must contain no repeated historical per-shopper SubPlan. Compare directionally with `shoppers:all:all` (~370 ms median/~976 ms p95) and the known multi-second Sales comparison. Ship summary+series when the set-based rerun is healthy; block Phase 3C if serious pathology remains. Do not add an index.

**18. Validation commands:** typecheck · build · lint · `bench:typecheck` · `git diff --check` · `git status` · §16 fixture captures · confirm the four other tab payloads are byte-identical (the scope-fragment addition must not perturb them).

**19. Acceptance criteria:** Classification is correct on every §16 case; cross-tenant isolation is demonstrated; all-time summary is not-applicable while the lifecycle series remains meaningful; every tested bucket satisfies `new + returning = B1 active`; the new scope fragment is additive with every existing fragment unchanged; one combined lifecycle statement is used; EXPLAIN is captured and passes the P3-P6 gate; statement count is exactly +1.

**20. Risks:** R1 a pre-range scan degenerating like the Sales comparison → the correlated probe was rejected and replaced by one scoped distinct-set scan plus join, with mandatory pre-UI EXPLAIN. R2 a tenant leak through the pre-range read → mitigated by scope-fragment-only construction and the mandatory cross-tenant fixture. R3 an off-by-one at the range boundary → pinned by two adjacent fixtures. R4 a later contributor reintroducing per-shopper historical probes → preserve the set-based CTE and the comment explaining why the boundary lives in `analyticsScope.ts`.

**21. Recommended commit message:** `feat: add new versus returning shopper analytics`

---

## Branch 3D — `feature/shopper-order-metrics`

**1. Branch name:** `feature/shopper-order-metrics`

**2. Goal:** B3 repeat purchase rate and average orders per buyer, plus B4 top shoppers ranked by confirmed orders → sessions → deterministic tiebreak, with a dominant-currency GMV mode.

**3. Dependencies:** 3A (shared order facts carrying `customerId`).

**4. Files expected to change:** `apps/server/src/analytics/shopperOrders.ts` (new) · `summary.ts` · web `analytics-types.ts` (MIRROR types only).

**5. Files that must not change:** `shared/orderFacts.ts` (consumed, not edited) · `sales.ts` · `lineItems.ts` · `shopperSummary.ts` · `shopperTrend.ts` · `shopperLifecycle.ts` · `contract/*` · `analyticsScope.ts` · UI components · `prisma/**` · `scripts/**`.

**6. Data/API/schema impact:** Additive payload fields. No schema change.

**7. Step-by-step:**
1. Import `orderFactsCtes` from `shared/orderFacts.ts` and build one statement per §9.
2. Attribute each confirmed order to the `customerId` on its **identity representative** (a deterministic, single answer per order); count unattributed orders separately.
3. Compute B3 via window aggregates over the full buyer set and B4 via `ORDER BY … LIMIT` in the same statement.
4. Derive the dominant currency from the existing `currency_slices` CTE and compute per-customer GMV in that currency only.
5. Build the discriminated payloads, wire into the composer, and mirror the types.

**8. Metric semantics:**
- **Buyer** = a `(projectId, customerId)` with ≥1 confirmed order attributed to it in range.
- **B3 repeat rate** = buyers with ≥2 distinct confirmed orders ÷ buyers; null when buyers = 0.
- **Average orders per buyer** = total attributed confirmed orders ÷ buyers; null when buyers = 0.
- **B4 ranking** = confirmed orders DESC, then distinct sessions DESC, then `customerId` ASC (a total order → deterministic, standards §3.10). Top 10.
- **B4 GMV mode** = per-customer sum of money-representative amounts **in the dominant currency only** (P3-P2), with excluded other-currency orders counted and disclosed.
- **Basis (P3-A5):** B3 and B4 require confirmed orders; session estimates never substitute.

**9. SQL design:** One statement.
```
WITH ${orderFactsCtes(scope.sql.currentAliasedEvent)},
orders_per_customer AS (
  SELECT "projectId",
         NULLIF(BTRIM("customerId"), '') AS customer_id,
         COUNT(*) AS confirmed_orders,
         COUNT(DISTINCT NULLIF(BTRIM("sessionId"), '')) AS sessions
  FROM identity_representatives
  WHERE NULLIF(BTRIM("customerId"), '') IS NOT NULL
  GROUP BY "projectId", customer_id
),
dominant AS (
  SELECT currency FROM currency_slices
  ORDER BY money_bearing_orders DESC, currency ASC LIMIT 1
),
gmv_per_customer AS (
  SELECT m."projectId", NULLIF(BTRIM(m."customerId"), '') AS customer_id,
         SUM(m.amount_value) AS gmv
  FROM money_representatives m, dominant d
  WHERE m.normalized_currency = d.currency
    AND NULLIF(BTRIM(m."customerId"), '') IS NOT NULL
  GROUP BY 1, 2
)
SELECT o.*, g.gmv,
       COUNT(*) OVER ()                                       AS buyers,
       COUNT(*) FILTER (WHERE o.confirmed_orders >= 2) OVER () AS repeat_buyers,
       SUM(o.confirmed_orders) OVER ()                         AS total_orders
FROM orders_per_customer o
LEFT JOIN gmv_per_customer g USING ("projectId", customer_id)
ORDER BY o.confirmed_orders DESC, o.sessions DESC, o.customer_id ASC
LIMIT 10
```
Window functions are evaluated over the full buyer set **before** `LIMIT`, so B3's totals are exact while B4 returns only the top 10 — one scan, one statement (P3-A4).

**10. Scope/tenant rules:** The injected `scope.sql.currentAliasedEvent` is the sole ownership and range filter, inherited by the shared builder. No local scope construction. `(projectId, customerId)` identity is preserved throughout and never collapsed (P3-P3).

**11. Edge cases:** An order whose identity representative has a null `customerId` → unattributed, excluded from B3/B4, counted in `unattributedOrders`. Conflicting `customerId` values across one order's events → the representative wins (deterministic, documented). Zero buyers → `buyers = 0` with repeat rate and average null, B4 list empty. Purchasing activity present but zero confirmed `order_id` → B3/B4 **unavailable** with rung-4 unlock copy (P3-A5). Mixed currency → GMV uses the dominant currency only with the excluded count disclosed. Single-currency scope → no exclusions. All buyers holding exactly one order → repeat rate 0 (a measured zero, not null) and B4's tie-break path fully exercised. No money anywhere → B4 orders ranking still works while GMV mode is unavailable.

**12. Payload types:**
```ts
// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts
export type RepeatPurchase =
  | { status: "available"; buyers: number; repeatBuyers: number;
      repeatRatePercent: number | null; averageOrdersPerBuyer: number | null; }
  | { status: "unavailable"; missingFields: string[]; message: string };

export interface TopShopperRow {
  projectId: string; projectName: string;
  customerId: string;          // pseudonymous, store-provided identifier
  confirmedOrders: number; sessions: number;
  gmv: number | null;          // dominant currency only; null when absent
}
export type TopShoppers =
  | { status: "available"; currency: string | null; rows: TopShopperRow[];
      ordersExcludedForCurrency: number; unattributedOrders: number; }
  | { status: "unavailable"; missingFields: string[]; message: string };
```

**13. Frontend behavior:** None in this branch (rendering lands in 3E).

**14. Empty/unavailable/partial states:** The discriminated unions above. Zero is reported only when genuinely measured; every unavailable state names the unlocking fields.

**15. Performance budget and expected statement count:** +1 concurrent statement (Shoppers 3 → 4, the P3-A4 target). Provisional single-query budget 300 ms p95, consistent with the existing hypothesis; a breach is a filed finding.

**16. Fixture matrix:** Reuse and extend the Phase 2 ingest-API fixture script. Cases: a customer with exactly one confirmed order (not repeat) and one with exactly two (the B3 boundary); an order attributed via its representative when a later event carries a different `customerId`; an order whose representative has a null `customerId` (unattributed); tie-break correctness (equal orders → more sessions ranks higher; equal both → `customerId` ASC); a mixed-currency buyer (GMV counts the dominant currency only, exclusion disclosed); a scope with purchases but no `order_id` (both unavailable); cross-tenant isolation. Independent SQL cross-check of `buyers`, `repeat_buyers`, and one customer's order count.

**17. Benchmark/EXPLAIN requirements:** Register query ID **#28 `shopper-order-metrics`** with targets at all/all, all/custom-long, single/all, 30d. **Specifically verify whether unreferenced CTEs from the shared builder appear in the plan** (the P3-A1 gate); if they carry measurable cost, report it and recommend splitting the builder into identity and money halves rather than doing so unilaterally.

**18. Validation commands:** typecheck · build · lint · `bench:typecheck` · `git diff --check` · `git status` · §16 fixtures · confirm Sales and Products payloads are byte-identical (proving the shared builder is consumed, not mutated).

**19. Acceptance criteria:** B3 and B4 match independent SQL on the seeded dataset; every §16 edge case behaves as specified; unavailable states fire when confirmed orders are absent; ranking is deterministic across repeated runs; GMV never mixes currencies; exactly +1 statement; the P3-A1 CTE-cost gate is answered with EXPLAIN evidence.

**20. Risks:** R1 attributing orders by any event rather than the representative → non-deterministic counts, pinned by fixture. R2 GMV silently summing currencies → caught by grep and fixture. R3 window-aggregate misuse producing post-`LIMIT` totals → caught by the independent SQL cross-check. R4 shared-builder CTE overhead → measured, with a defined remedy.

**21. Recommended commit message:** `feat: add repeat purchase rate and top shoppers`

---

## Branch 3E — `feature/shoppers-tab-ui`

**1. Branch name:** `feature/shoppers-tab-ui`

**2. Goal:** Render B1–B4 on the Shoppers tab with honest labeling, disclosures, and states, and apply the locked P3-P5 identity correction to the legacy `uniqueCustomers` KPI.

**3. Dependencies:** 3B, 3C, 3D merged. P3-P5 is locked and approved, so this branch is unblocked.

**4. Files expected to change:** `apps/web/components/dashboard/analytics/tabs/ShoppersTab.tsx` · `ShopperKpiRow.tsx` · new presentational components for the trend, split, repeat stats, and ranked list · `analytics-types.ts` if any mirror gap remains · **`apps/server/src/analytics/shopperSummary.ts`** (P3-P5 correction only).

**5. Files that must not change:** all other server analytics modules (`shopperTrend.ts`, `shopperLifecycle.ts`, `shopperOrders.ts`, `shared/orderFacts.ts`, `sales.ts`, `lineItems.ts`, `summary.ts` beyond nothing) · `contract/*` · `analyticsScope.ts` · other tabs' components · `useAnalyticsTabData.ts` · `AnalyticsTabs.tsx` · `prisma/**` · `scripts/**`.

**6. Data/API/schema impact:** No schema change and no field renamed. One existing field's **value** changes: `uniqueCustomers` moves from `COUNT(DISTINCT "customerId")` to `COUNT(DISTINCT ("projectId", "customerId"))`. Single-project scopes are unaffected by construction; all-projects scopes may increase where customer IDs recur across projects.

**7. Step-by-step:**
1. **Apply the P3-P5 correction** in `shopperSummary.ts`: change only the `uniqueCustomers` aggregate to composite counting. Keep the field name `uniqueCustomers`. **Do not touch `purchasingSessions` or `uniqueSessions`.** Add a comment citing blueprint Principle 5 and this ruling.
2. Capture before/after `uniqueCustomers` values for every scope in the §16 matrix (see §17/§19 — these must appear in the PR).
3. Compose the tab: legacy KPI row (labeled) → B1 trend → B2 lifecycle summary with progressively disclosed series → B3 stats → B4 ranked list → coverage/data-quality strip. This progressive disclosure is presentational, not lazy loading, and adds no details endpoint.
4. Reuse existing primitives (`GlowCard`, `Icon`, the established chart idiom, and the Sales tab's basis-label and per-currency patterns).
5. Source every unavailable message from `trackingReadiness.ts` rung copy so Health and Shoppers never phrase an unlock differently.
6. Add all required disclosures listed in §13.

**8. Metric semantics:** Presentation only, with one exception: the P3-P5 correction to `uniqueCustomers`, which is a conformance fix to the project-scoped identity rule and not a new metric definition. No client-side metric computation beyond formatting (standards §18.5).

**9. SQL design:** One aggregate expression changes in `shopperSummary.ts` (composite distinct). No new query, no new statement.

**10. Scope/tenant rules:** Unchanged; the tab consumes the existing scoped payload and `shopperSummary` keeps using `scope.sql.currentEvent`.

**11. Edge cases:** Each of B1–B4 independently unavailable or empty while siblings render; long pseudonymous IDs (truncate with `title`, wrap-safe); ties rendered in stable order; percentages shown as "—" when null; all-time B2 not-applicable copy; single-project scopes where the corrected `uniqueCustomers` is provably identical to the old value.

**12. Payload types:** No new server types; mirrors completed. `uniqueCustomers` keeps its name and `number` type.

**13. Frontend behavior:** Loading, error, and empty flow through the existing `AnalyticsTabPanel` contract; refresh stays tab-scoped; no new fetch machinery and no client cache changes. **Required disclosures, each a hard acceptance item:**
- B4 customer IDs labeled as pseudonymous, store-provided identifiers.
- All-projects counting stated as per-project — a person can be new in one project and returning in another (P3-P3).
- B4 GMV labeled with its currency plus the count of orders excluded for other currencies (P3-P2).
- Null-`customerId` coverage shown whenever below 100% (P3-A6).
- The legacy `purchasingSessions` card's basis labeled distinctly from confirmed orders (P3-P1).
- A note that B1 bucket values do not sum to the range total.
- **The `uniqueCustomers` correction documented in the tab copy** as project-scoped shopper identity.

**14. Empty/unavailable/partial states:** Every section renders available, partial-with-disclosure, or unavailable-with-named-fields. No spinner-only states; status is conveyed by text, never color alone.

**15. Performance budget and expected statement count:** No statement change (Shoppers stays at 4 concurrent + all-time span). `shopperSummary`'s plan may shift slightly from composite distinctness — flag it for 3F. Frontend: no layout shift; cached revisit issues zero requests.

**16. Fixture matrix:** Browser matrix across {seeded project with buyers, mixed-currency project, project with purchases but no `order_id`, project with no `customerId`, empty project} × {24h, 30d, custom-long, all}, in both all-projects and single-project scope. Verify each disclosure appears exactly when its condition holds and disappears otherwise; ~375 px responsive pass; a11y (headings, non-color status, focus, `role="alert"`).

**17. Benchmark/EXPLAIN requirements:** No new query registered here. **Record before/after `uniqueCustomers` values for every matrix scope** and note the `shopperSummary` plan change so 3F can compare it against the Phase 2 baseline.

**18. Validation commands:** typecheck · build · lint · `git diff --check` · `git status` · browser matrix with the network panel open (one request per tab/scope, zero on cached revisit) · the before/after `uniqueCustomers` capture.

**19. Acceptance criteria:** All four features render with values matching the API payload; every §13 disclosure present under its condition; no unlabeled approximation and no merged currency can appear; a11y and 375 px pass; other tabs visually and structurally unchanged; **the P3-P5 correction is implemented with the field name preserved, before/after values recorded for every scope, and the visible metric correction documented in both the PR body and the tab copy**; `purchasingSessions` and `uniqueSessions` are untouched.

**20. Risks:** R1 a disclosure omitted, making a partial number look complete → each is an explicit acceptance item. R2 the P3-P5 change landing without visible documentation → before/after values and PR documentation are acceptance criteria. R3 scope creep into `purchasingSessions` → explicitly forbidden without separate approval. R4 client-side recomputation creeping in → review grep for arithmetic beyond formatting.

**21. Recommended commit message:** `feat: render shopper analytics and correct shopper identity counting`

---

## Branch 3F — `feature/shopper-benchmark-extension`

**1. Branch name:** `feature/shopper-benchmark-extension`

**2. Goal:** Extend the benchmark and EXPLAIN system to the new shopper surface, measure it, and cut the Phase 3 baseline of record.

**3. Dependencies:** 3A–3E merged.

**4. Files expected to change:** `apps/server/scripts/benchmark/explain-query-registry.ts` · `explain-types.ts` (query-ID tuple) · `run-benchmarks.ts` (Shoppers payload validation for the new fields) · `benchmarks/baselines/analytics/` (new baseline files and `findings.md`).

**5. Files that must not change:** **`seed-benchmark-data.ts` — unless the 3A pre-flight proved the dataset inadequate** · all `apps/server/src/**` · all `apps/web/**` · existing baseline files (additive only) · `guard.ts` safety rules.

**6. Data/API/schema impact:** None. Benchmark artifacts only.

**7. Step-by-step:**
1. Re-run the 3A pre-flight dataset check and record the results.
2. Register query IDs #26–#28 with their scopes and ranges (including B1's day and month granularity variants), extending the ID tuple.
3. Extend the runner's Shoppers payload validation to assert the new discriminants (available / unavailable / not-applicable), not merely HTTP status.
4. Run the full medium HTTP matrix and the EXPLAIN protocol.
5. **Because the seeder is unchanged, compare directly against `phase-2-514bbd9b-medium`** via `bench:compare` — a valid same-manifest comparison. Report Shoppers deltas, the `shopperSummary` plan change from P3-P5, and confirmation that the other four tabs are unchanged beyond variance.
6. Write `phase-3-<commit>-medium.{json,md}` into `benchmarks/baselines/analytics/`, append a Phase 3 section to `findings.md` in the established table format, and retain every prior baseline.

**8. Metric semantics:** Not applicable — measurement only. No metric may change in this branch.

**9. SQL design:** No production SQL. EXPLAIN runs read-only inside a transaction with rollback, per the established protocol.

**10. Scope/tenant rules:** Benchmark guard rules unchanged — `*bench*` database only, `NODE_ENV !== "production"`, mutation counts identical before and after.

**11. Edge cases:** If the pre-flight shows zero buyers with ≥2 confirmed orders, **stop and report**: B3 would be benchmarking a degenerate zero. The remedy is a seeder change following the Phase 2E two-step pattern (measure unchanged first, then reseed and cut a new manifest and baseline, retaining the old) — a scope change requiring approval.

**12. Payload types:** Not applicable.

**13. Frontend behavior:** Not applicable.

**14. Empty/unavailable/partial states:** Not applicable.

**15. Performance budget and expected statement count:** Records the final Shoppers statement count (expected 4 concurrent plus the all-time span pre-query). Any budget breach is filed as a finding with observation, evidence, hypothesis, evidence bar, and recommended phase — **not fixed here** (P3-P4).

**16. Fixture matrix:** The runner's existing correctness assertions plus the new shopper-payload discriminant checks across all shoppers cells.

**17. Benchmark/EXPLAIN requirements:** Mandatory cells — `shoppers` at all/all, all/custom-long, all/30d, single/all, single/30d; B1 day and month granularity targets; #27 and #28 at all/all and all/custom-long minimum. Capture scans, temp blocks, sorts, and index usage for each.

**18. Validation commands:**
```bash
cd apps/server
bun run bench:typecheck
bun run bench:seed      # ONLY if the pre-flight forced a seeder change
bun run bench:run
bun run bench:explain
bun run bench:compare
```
plus typecheck · build · lint · `git diff --check` · `git status`.

**19. Acceptance criteria:** New query IDs registered and executing; all shopper cells pass correctness; the same-manifest comparison against the Phase 2 baseline is reported; the Phase 3 baseline is committed with prior baselines retained; findings filed for every budget breach; mutation-safety counts identical before and after.

**20. Risks:** R1 accidentally modifying the seeder and invalidating comparison → explicit must-not-change rule. R2 treating directional timing noise as regression → F-P2E-08/F-0D5-11 bands are directional; plan-shape and payload stability are the harder gates. R3 a genuine Shoppers regression absorbed silently → the same-manifest comparison makes it visible.

**21. Recommended commit message:** `feat: extend analytics benchmarks to shopper metrics`

---

# Phase 3 Completion Criteria

1. B1–B4 are implemented per the locked metric semantics, each verified against independent SQL on seeded data.
2. Exactly one order-identity definition exists (`shared/orderFacts.ts`); no shopper module contains its own dedup SQL; Sales and Products payloads are byte-identical through 3A and 3D.
3. B3/B4 use `ORDER_FACT_EVENT_NAMES` exclusively; no new metric uses `PURCHASE_ALIASES` (P3-P1).
4. B3/B4 are unavailable — never estimated — when confirmed orders are absent (P3-A5).
5. GMV ranking is dominant-currency-only with disclosed exclusions; no FX and no blended totals anywhere (P3-P2).
6. `(projectId, customerId)` identity holds in all-projects mode and is disclosed in copy (P3-P3).
7. Null-`customerId` coverage and unattributed-order counts are surfaced (P3-A6).
8. B2 ships its selected-period split and per-bucket lifecycle series from one statement when the EXPLAIN gate passes; its only historical read is bounded by the additive `analyticsScope.ts` fragment; all-time summary is not-applicable while the series remains meaningful; `new + returning = B1 active` is fixture-proven; and cross-tenant isolation is demonstrated (P3-P6, P3-A2).
9. The P3-P5 correction is implemented in 3E only, with the field name preserved, before/after values recorded for every scope, and the visible correction documented; `purchasingSessions` is unchanged.
10. The Shoppers tab uses 4 concurrent statements plus the all-time span pre-query; Overview is untouched.
11. No schema change, migration, index, rollup, cache, or new dependency exists in the diff range.
12. The Phase 3 baseline is committed with prior baselines retained, and every budget breach is filed as a finding.
13. Typecheck, build, lint, `bench:typecheck`, and `git diff --check` are green on every branch, with honest runtime-verified-versus-inspected reporting.

# Phase 3 Explicit Stop Conditions

**Out of scope — a branch proposing any of these is out of scope by definition:** B5 shopper drilldown · session-quality analytics · cohort retention · payments analysis and failure rates · lifetime returning-buyer metric · a separate B2 historical first-seen query, details endpoint, or lazy-loading infrastructure · shopper KPIs on the Overview tab (F-P2E-04 pool pressure) · any index addition · rollups, caches, materialized first-seen state, normalized Customer or Order tables, or any Prisma migration · `occurredAt`, batch ingestion, SDK, async processing, queues, or workers · changes to Sales, Products, Conversion, or Behavior metric semantics · **changing the legacy `purchasingSessions` basis** (P3-P1, requires separate approval) · optimizing the known Phase 2 findings (Sales comparison 9–10 s; Overview 12–13 statements) · benchmark-seeder changes unless the 3A pre-flight forces one.

**Stop-and-ask triggers:** the 3A pre-flight finds zero repeat buyers · an EXPLAIN appears to justify an index · B2's measured cost approaches the Sales-comparison magnitude · any change would alter a shipped Phase 1 or Phase 2 payload value other than the approved `uniqueCustomers` correction.

**Debt to file (not to fix in this phase):**
- Third trend-bucket implementation (`trend.ts`, `sales.ts:trendBucketsCtes`, and now B1) — recommend a dedicated consolidation chore branch **after** Phase 3, since mixing that refactor into a feature branch violates the move-versus-improve rule.
- B2 lifecycle presentation remains scheduled for progressive disclosure in 3E; it is not a reason to add lazy loading or a details endpoint.
- Any measured index candidate arising from 3C or 3D EXPLAIN evidence.

# Phase 3 Benchmark Strategy

Measure per branch; file findings rather than fixing them (P3-P4). New query IDs #26 (B1), #27 (B2), #28 (B3/B4) enter the existing registry; the Shoppers tab is already in `BENCHMARK_TABS`, so no matrix-shape change is required. Mandatory coverage: all/all, all/custom-long, all/30d, single/all, single/30d, plus B1 day-versus-month granularity variants.

**The decisive strategic advantage:** if the 3A pre-flight confirms the dataset already exercises repeat buyers, cross-project customer IDs, null customer IDs, and ≥2 confirmed orders per buyer, the seeder stays untouched — manifest identity is preserved and Phase 3 gets a **valid direct comparison** against `phase-2-514bbd9b-medium`, avoiding the Phase 2E two-step baseline procedure entirely. Timing bands remain directional (F-P2E-08); plan-shape hashes and payload stability are the reliable gates. The anchor to beat-or-explain is `shoppers:all:all` at 370 ms median / 976 ms p95.

# Phase 3 Temporary Verification Strategy (until Phase 9 lands)

There are no automated tests and no CI; this plan does not pretend otherwise. Each branch verifies through:

- **Fixture matrices** driven through the real ingest API (extending the Phase 2 script), kept in the scratchpad and pasted into the PR so later branches reuse the same fixtures.
- **Independent SQL cross-checks** — hand-written `COUNT(DISTINCT …)` queries run directly against the database and compared with API output. This is the primary defense for B1's composite counting, B2's classification, B3's buyer counts, and the P3-P5 before/after values.
- **Payload byte-diffs** proving untouched surfaces stayed identical.
- **EXPLAIN** for every new statement, captured before dependent UI work begins.
- **Benchmark runs** for cost, compared against the retained Phase 2 baseline.
- **Visual and a11y verification** in 3E.

Every PR states plainly what was runtime-verified versus inspection-only (standards §18.7). These matrices are written down so Phase 9 can adopt them as its first golden tests.

---

# Complete Codex Prompts

**Prompt 3A — `refactor/shared-order-facts`**

> You are working in the EventPulse repository (Bun + Turborepo; server = Express + Prisma 7 + PostgreSQL). Phases 0D-5, 0M, 1, and 2 are merged. Implement **Phase 3A only**: extract shared order facts and add a customer dimension. Confirm a clean tree and report the current branch; the human owner creates and switches branches and makes all commits — never do either yourself.
>
> **Read first, edit second:** `.claude/plans/phase-3-shopper-mvp-implementation-workflow.md` (branch 3A and the P3-A1 ruling), `apps/server/src/analytics/sales.ts` in full (especially `salesFactsCtes`, `orderFactNamesSql`, `allMoneyEvidenceNamesSql`), `apps/server/src/contract/orderIdentity.ts`, and `.claude/plans/eventpulse-engineering-quality-standards.md` §§4–6, 9, 14, 18.
>
> **Scope — exactly this:** (1) Create `apps/server/src/analytics/shared/orderFacts.ts` and move the CTE builder plus its two name helpers **verbatim** (copy the SQL, never retype it), exporting `orderFactsCtes(eventScope: Prisma.Sql): Prisma.Sql`. (2) Add exactly one column, `"customerId"`, to the `scoped_sales_events` SELECT list — nothing else in the SQL changes. (3) Update `sales.ts` to import from the shared module and delete the local definitions; make no other edit to `sales.ts`. (4) Before finishing, grep the moved SQL for `SELECT DISTINCT *`, `UNION`, or any `GROUP BY` over all columns whose meaning a new column would change, and report what you found. Do not touch `contract/`, `analyticsScope.ts`, `lineItems.ts`, `productPerformance.ts`, `summary.ts`, `shopperSummary.ts`, any frontend file, the Prisma schema, or the benchmark seeder.
>
> **Validation (run and report actual output):** `bun run typecheck` · `bun run build` · `bun run lint` · `cd apps/server && bun run bench:typecheck` · `git diff --check` · `git status`. Then, with the local server and seeded data, capture `GET /api/analytics/summary?tab=sales` for {all-projects, one project} × {24h, 7d, 30d, one custom range, all} **before and after** your change and diff them — all ten must be byte-identical; paste the diffs (expected: empty). Run `bun run bench:explain` for the Phase 2 sales targets and confirm plan-shape hashes are unchanged. Finally run this read-only pre-flight against the benchmark database and paste the results: counts of (a) buyers with ≥2 distinct confirmed orders, (b) customer IDs appearing in more than one project, (c) rows with NULL `customerId`. **If (a) is zero, stop and report** — do not proceed and do not modify the seeder.
>
> **Report:** files created and modified, the grep result, byte-diff results, plan-hash comparison, pre-flight counts, and what was runtime-verified versus inspected. **Do not commit** — propose `refactor: extract shared order facts with customer dimension` and stop.

**Prompt 3B — `feature/shopper-active-trend`**

> EventPulse repository, `apps/server` plus one mirror-type edit in `apps/web`. Phase 3A is merged. Implement **Phase 3B only**: the B1 Active Shoppers Trend. Confirm a clean tree and report the branch; the human owner handles branching and commits.
>
> **Read first:** `.claude/plans/phase-3-shopper-mvp-implementation-workflow.md` (branch 3B), `.claude/plans/product-performance-analytics-design-cozy-book.md` §B1 (authoritative metric), `apps/server/src/analytics/trend.ts` (reuse `resolveTrendGranularity` and `fetchTrendSpanDays` unmodified), `sales.ts:trendBucketsCtes` (the established bucket pattern to copy), `summary.ts`, and `apps/web/components/dashboard/analytics/analytics-types.ts`.
>
> **Scope — exactly this:** Create `apps/server/src/analytics/shopperTrend.ts` with one statement counting **distinct `(projectId, customerId)` per bucket** using a row constructor — `COUNT(DISTINCT (p."projectId", p.customer_id))` — never string concatenation and never plain `COUNT(DISTINCT "customerId")`. Exclude rows whose trimmed `customerId` is empty or null, and return a coverage object (events in scope, events with a usable `customerId`, excluded percent — null when the scope is empty). Generate buckets so empty buckets are real zeros, and derive all-time bounds inline from the scoped shopper rows. Use only `scope.sql.currentEvent` for ownership and range — compose no ownership or date SQL yourself, and do not introduce `AT TIME ZONE`. Add a `// DEBT:` comment noting this is the third bucket-generation implementation. Wire it into the Shoppers composer's `Promise.all` and add mirrored types with `// MIRROR:` comments on both sides. Do not modify `shopperSummary.ts`, `trend.ts`, `sales.ts`, `shared/orderFacts.ts`, `analyticsScope.ts`, any UI component, or the schema.
>
> **Validation:** typecheck · build · lint · `bench:typecheck` · `git diff --check` · `git status`. Capture `?tab=shoppers` across {all-projects, one project} × {24h, 7d, 30d, custom, all}; verify granularity per range, bucket continuity, and zero-filled gaps. For at least two buckets, run your own independent `SELECT COUNT(DISTINCT (…))` SQL and show it matches the API. Verify a customer present in two projects is counted once per project. Confirm the other four tab payloads are byte-identical. **Do not commit** — propose `feat: add active shoppers trend to shoppers analytics` and stop.

**Prompt 3C — `feature/shopper-new-returning`**

> EventPulse repository, `apps/server` plus mirror types. Phases 3A–3B are merged. Implement **Phase 3C only**: the B2 New versus Returning selected-period summary and per-bucket lifecycle series from one statement. Decision P3-P6 is locked: do not add a separate historical first-seen scan, lazy-loading infrastructure, or a details endpoint. Confirm a clean tree; the owner handles branching and commits.
>
> **Read first:** `.claude/plans/phase-3-shopper-mvp-implementation-workflow.md` (branch 3C and the P3-A2 justification), `.claude/plans/product-performance-analytics-design-cozy-book.md` §B2, `apps/server/src/analytics/analyticsScope.ts` in full, and the engineering standards §§6, 9, 18.
>
> **Scope — exactly this:** (1) Add one **additive** member to `AnalyticsScopeSql`: `priorToRangeEvent: Prisma.Sql | null`, built with the file's existing private boundary helpers as ownership + project + strict `createdAt <` range start for alias `prior`, and null when the range has no lower bound. Change no existing fragment. (2) Create `shopperLifecycle.ts` with one statement over `scope.sql.currentEvent`: range-scoped shopper rows, distinct bucket membership, range-scoped `MIN(createdAt)`, one scoped pre-range distinct shopper set joined to active identities for bounded ranges, selected-period summary, and zero-filled lifecycle buckets. All-time omits the historical CTE. Reuse the B1 granularity resolved by the Shoppers composer and add no all-time span query. (3) For bounded ranges return measured summary counts and nullable percentages; for all-time return a not-applicable summary but still return the lifecycle series (first observed bucket New, later active buckets Returning). (4) Require `new + returning = B1 active` in every bucket. Wire additively into the composer and MIRROR types. Do not touch B1, other analytics modules, UI, schema, benchmark registry, or seeder.
>
> **Validation:** typecheck · build · lint · `bench:typecheck` · `git diff --check` · `git status`. Use real runtime fixtures for the exact-boundary and one-second-before cases, a New→Returning bucket transition with a gap, repeated same-bucket events, cross-project identity, cross-tenant isolation, null/blank IDs, empty scope, and all-time lifecycle behavior. Automate the B1/B2 invariant across all-project 24h/30d/custom-long/all and single-project 30d/all, and independently SQL-check one summary plus bounded/all-time series. Confirm other tab payloads and existing shopper outputs are unchanged. Capture `EXPLAIN (ANALYZE, BUFFERS)` for all-project/all-time, all-project/custom-long, and single-project/all-time; compare directionally with the retained Shoppers baseline and known Sales pathology. Ship summary+series only when the gate is healthy; otherwise prove the series is responsible before narrowing to summary-only. **Do not commit** — propose `feat: add new versus returning shopper analytics` when both views ship.

**Prompt 3D — `feature/shopper-order-metrics`**

> EventPulse repository, `apps/server` plus mirror types. Phases 3A–3C are merged. Implement **Phase 3D only**: B3 Repeat Purchase Rate and B4 Top Shoppers. Confirm a clean tree; the owner handles branching and commits.
>
> **Read first:** `.claude/plans/phase-3-shopper-mvp-implementation-workflow.md` (branch 3D and rulings P3-P1, P3-P2, P3-A5, P3-A6), `.claude/plans/product-performance-analytics-design-cozy-book.md` §B3 and §B4, `apps/server/src/analytics/shared/orderFacts.ts`, and `apps/server/src/analytics/sales.ts` for the payload-discriminant patterns to mirror.
>
> **Scope — exactly this:** Create `shopperOrders.ts` computing B3 and B4 in **one statement** that imports `orderFactsCtes` — do not write your own order-dedup SQL, and do not use `PURCHASE_ALIASES`. Aggregate `identity_representatives` into orders-per-customer, attributing each confirmed order to the `customerId` on its **identity representative** (orders whose representative has no usable `customerId` are unattributed: excluded and counted). Compute B3's totals as window aggregates (`COUNT(*) OVER ()`, a filtered count, `SUM(...) OVER ()`) so they cover all buyers, and return B4 as `ORDER BY confirmed_orders DESC, sessions DESC, customer_id ASC LIMIT 10`. For GMV, derive the dominant currency from `currency_slices` (most money-bearing orders, ties by currency ASC) and sum **only that currency's** money representatives per customer; count and expose orders excluded for currency. **Never sum across currencies and never convert.** When the scope has no confirmed orders, return `unavailable` with unlock guidance naming `order_id` — never substitute session estimates. Repeat rate and average orders are null when buyers = 0, and 0 is reported only when genuinely measured. Wire into the composer and mirror the types. Do not modify `shared/orderFacts.ts`, `sales.ts`, `lineItems.ts`, `shopperSummary.ts`, `shopperTrend.ts`, `shopperLifecycle.ts`, `analyticsScope.ts`, UI components, or the schema.
>
> **Validation:** typecheck · build · lint · `bench:typecheck` · `git diff --check` · `git status`. Extend the Phase 2 fixture script to cover: a customer with exactly one confirmed order and one with exactly two (the B3 boundary); an order whose later event carries a different `customerId` than its representative; an order whose representative has a null `customerId`; a ranking tie broken by sessions and a full tie broken by `customerId`; a mixed-currency buyer; a scope with purchases but no `order_id` (both features unavailable); and cross-tenant isolation. Cross-check `buyers`, `repeat_buyers`, and one customer's order count with your own independent SQL and paste both. Confirm Sales and Products payloads are byte-identical. Capture EXPLAIN at all-projects/all-time and **report whether unreferenced CTEs from the shared builder appear in the plan** — if they carry measurable cost, report it and recommend splitting the builder rather than doing so unilaterally. **Do not commit** — propose `feat: add repeat purchase rate and top shoppers` and stop.

**Prompt 3E — `feature/shoppers-tab-ui`**

> EventPulse repository, `apps/web` (**read `AGENTS.md` first — this Next.js version differs from your training data; consult `node_modules/next/dist/docs/` before writing React or Next code**) plus exactly one server file, described below. Phases 3A–3D are merged. Implement **Phase 3E only**: the Shoppers tab UI and the approved P3-P5 identity correction. Confirm a clean tree; the owner handles branching and commits.
>
> **Read first:** `.claude/plans/phase-3-shopper-mvp-implementation-workflow.md` (branch 3E and rulings P3-P1, P3-P2, P3-P3, P3-P5, P3-A6), the current `ShoppersTab.tsx` and `ShopperKpiRow.tsx`, the Sales tab components (for basis-label and per-currency patterns), `apps/server/src/analytics/trackingReadiness.ts` (source all unlock copy from its rung strings), and the engineering standards §§7, 8.
>
> **Scope — exactly this.** (A) **P3-P5 correction, approved and required:** in `apps/server/src/analytics/shopperSummary.ts`, change **only** the `uniqueCustomers` aggregate from `COUNT(DISTINCT "customerId")` to `COUNT(DISTINCT ("projectId", "customerId"))`. **Keep the response field name `uniqueCustomers`.** Do **not** modify `purchasingSessions` or `uniqueSessions` — changing the `purchasingSessions` basis requires separate approval. Add a comment citing blueprint Principle 5. Capture the before/after `uniqueCustomers` value for every scope in your matrix and put the table in your report. (B) Compose the tab: legacy KPI row (labeled) → B1 trend → B2 split → B3 stats → B4 ranked list → coverage strip, reusing `GlowCard`, `Icon`, and the established chart idiom. Every one of these disclosures is a hard requirement: B4 customer IDs labeled as pseudonymous store-provided identifiers; all-projects counting stated as per-project (a person can be new in one project and returning in another); B4 GMV labeled with its currency plus the count of orders excluded for other currencies; null-`customerId` coverage shown whenever below 100%; the legacy `purchasingSessions` card's basis labeled distinctly from confirmed orders; a note that B1 bucket values do not sum to the range total; and the `uniqueCustomers` correction explained in the tab copy as project-scoped shopper identity. Each section renders independently as available, partial-with-disclosure, or unavailable-with-named-fields; percentages render "—" when null. Do no metric arithmetic beyond formatting. Do not touch other tabs, `useAnalyticsTabData.ts`, `AnalyticsTabs.tsx`, any other analytics module, or the schema.
>
> **Validation:** typecheck · build · lint · `git diff --check` · `git status`. Exercise in the browser across {seeded project with buyers, mixed-currency project, project with purchases but no `order_id`, project with no `customerId`, empty project} × {24h, 30d, custom, all}, in both all-projects and single-project scope: verify each disclosure appears exactly when its condition holds, each unavailable state names its fields, rendering matches the API payload, ~375 px is clean, and a11y passes (headings, status as text not color alone, focus, `role="alert"`). Network panel: one request per tab and scope, zero on cached revisit. **Paste the before/after `uniqueCustomers` table** and confirm single-project scopes are unchanged. **Do not commit** — propose `feat: render shopper analytics and correct shopper identity counting` and stop.

**Prompt 3F — `feature/shopper-benchmark-extension`**

> EventPulse repository, `apps/server/scripts/benchmark/` and `benchmarks/`. Phases 3A–3E are merged. Implement **Phase 3F only**: benchmark and EXPLAIN coverage for the shopper surface. Confirm a clean tree; the owner handles branching and commits.
>
> **Read first:** `.claude/plans/phase-3-shopper-mvp-implementation-workflow.md` (branch 3F and the benchmark strategy), `.claude/plans/analytics-query-performance-phase-0d5.md` §§5–7, 12, 13, 18–21, `benchmarks/baselines/analytics/findings.md`, and the existing registry, runner, and compare scripts.
>
> **Scope — exactly this:** (1) Re-run the read-only pre-flight from 3A and paste the results. (2) Register query IDs #26 `shopper-active-trend`, #27 `shopper-new-returning`, and #28 `shopper-order-metrics` in `explain-query-registry.ts`, extending the ID tuple in `explain-types.ts`, with targets at all/all, all/custom-long, all/30d, single/all, single/30d, plus **day and month granularity variants for #26**. (3) Extend the runner's Shoppers payload validation to assert the new discriminants (available / unavailable / not-applicable), not merely HTTP status. (4) Run the full medium HTTP matrix and the EXPLAIN protocol. (5) **Do not modify `seed-benchmark-data.ts`** — the dataset is expected to already exercise repeat buyers, cross-project customer IDs, and null customer IDs; if the pre-flight contradicts that, **stop and report** rather than reseeding. (6) Because the seeder is unchanged, run `bench:compare` directly against `phase-2-514bbd9b-medium` — a valid same-manifest comparison — and report Shoppers deltas, the `shopperSummary` plan change introduced by the P3-P5 correction, and confirmation that the other four tabs are unchanged beyond variance. (7) Write `phase-3-<commit>-medium.{json,md}` into `benchmarks/baselines/analytics/`, append a Phase 3 section to `findings.md` in the established finding-table format, and retain every prior baseline.
>
> **Validation:** `bench:typecheck` · `bench:run` · `bench:explain` · `bench:compare` · typecheck · build · lint · `git diff --check` · `git status`. Confirm mutation-safety counts are identical before and after both runs and that EXPLAIN ran read-only with rollback. File every budget breach as a finding with observation, evidence, hypothesis, evidence bar, and recommended phase — **propose no optimization, index, or query change**. **Do not commit** — propose `feat: extend analytics benchmarks to shopper metrics` and stop.

---

# Final Definition of Done

Phase 3 is complete when all thirteen completion criteria hold; the six branches are merged with their fixture matrices, independent SQL cross-checks, and EXPLAIN captures pasted into their PRs; the P3-P5 correction is implemented in 3E with the field name preserved, before/after values recorded, and the visible correction documented; B2 ships its summary and lifecycle series from one statement when the P3-P6 performance gate passes, with all-time summary not-applicable and the B1/B2 bucket invariant proven; the Phase 3 baseline is committed alongside every prior baseline with all breaches filed as findings; the debt register carries the trend-bucket consolidation entry and any measured index candidate; no schema, migration, index, cache, rollup, details endpoint, or lifecycle-specific lazy loading exists anywhere in the diff range; the Sales, Products, Conversion, and Behavior payloads are byte-identical to their pre-Phase-3 values; and Phase 4 can begin by consuming shopper order attribution without editing Phase 3 code.

---
*Prepared read-only at `main` / `1c29cc6` (clean tree). All product and architecture decisions are locked; no implementation blockers remain. No source file was modified and no roadmap document was changed in preparing this plan.*
