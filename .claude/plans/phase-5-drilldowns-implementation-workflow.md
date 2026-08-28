# EventPulse Phase 5 — Drilldowns Implementation Workflow

**Status:** FINAL — planning complete, implementation-ready. Verified against repository truth on 2026-08-25.
**Type:** Feature phase (analytics read-side). Introduces the first **entity-detail endpoint** and the first analytics drawer. No schema change, no migration, **no new index**, no new dependency.

**Verified against:** HEAD `a91809c`, branch **`main`**, `HEAD == origin/main == main`, working tree clean apart from this document.

**Reconciliation pass — 2026-08-25.** This plan was drafted while Phase 3F was in flight. 3F has since **merged**, and every dependent claim below has been re-verified against the current repository:

| Phase | State at drafting | State now |
|---|---|---|
| 3E | uncommitted working-tree edits | **merged** `861753d` |
| Phase 4 doc | untracked | **committed** `3e945a6` |
| **3F** | branch open, no commits | **merged `a91809c`** *(feat: extend analytics benchmarks to shopper metrics)* — 8 files, +45,997/−22 |
| Phase 4 code | not started | **still not started** (no `contract/paymentIdentity.ts`, no `analytics/payments.ts`) |

**What 3F changed, and what it means for Phase 5:**
- `ANALYTICS_QUERY_IDS` is now **`[1 … 28]`** — #26 `shopper-active-trend`, #27 `shopper-new-returning`, #28 `shopper-order-metrics` are registered. **This resolves deferred item D5-2**, which is now a decided rule in §15.
- A **new baseline of record**: `phase-3-3e945a6-medium`, manifest `8c97632d…`, seed 502, fixed run anchor `2026-08-24T22:00:00.000Z`, 549,864 events, **the benchmark seeder untouched** (byte-identical, manifest still matching Phase 2). 5G step 1 can therefore make a valid same-manifest comparison against it.
- **The Shoppers tab is far more expensive than this plan originally assumed** — `shoppers:all:all` is now **2,003 ms median / 2,070 ms p95**, not the 370/976 figures from the 0D-5 baseline. §11 and §22 D5-2 are rewritten around the real number.
- Eight new findings **F-P3F-01 … F-P3F-08**, two of which directly retire Phase 5 risks (§0.1a).
- 3F changed **no** production code, no frontend code, and no seeder — only benchmark tooling and artifacts.

*Consequence: **5A–5F and 5G are all unblocked.** 5F's Phase 3E dependency and 5G's Phase 3F dependency are both satisfied; the deferred list drops from six items to five.*

**Authority:** analytics blueprint §§D3, B5, C-a, C-b + Part 7 row 5 · Commerce Tracking Contract §§2, 3, 7 · engineering standards §§4, 8, 9, 11, 17, 18 · architecture book §20 decisions 5, 6, 7, 9, 11, 13, 14, 21.

**Decision posture:** every ordinary engineering decision is **decided** below. **Five** items genuinely cannot be settled today; they are isolated in **§22 DEFERRED / DECIDE LATER**, each with why it cannot be decided now, when and by what evidence it will be decided, and a recommended default so implementation never stalls. Minor implementation details may still change during execution — this is an execution-ready plan, not an immutable specification.

**Preserved without exception:** Phase 2 money semantics (AOV = `gmv ÷ moneyBearingOrders` with its shipped basis note, `sales.ts:372,435`; dominant currency by `money_bearing_orders DESC, currency ASC`, `sales.ts:516`), Phase 3 shopper identity `(projectId, customerId)`, and every Phase 1–4 field name and value. Phase 5 is **purely additive**.

---

## 0. Repository-truth verification log

All read-only. No source file, frontend file, seeder, schema, migration, or benchmark artifact was written by any pass; no branch was created, switched, staged, committed, stashed, reset, or cleaned. Only this document was modified.

### 0.1 Infrastructure Phase 5 builds on — confirmed present

| Claim | Evidence |
|---|---|
| Analytics has exactly **one** endpoint: `GET /api/analytics/summary?tab=…` | `routes/analytics.routes.ts`, `controllers/analytics.controller.ts` |
| `createAnalyticsScope({userId, projectId, range, from, to})` is the sole scope authority | `analytics.controller.ts:66`, `analyticsScope.ts:273` |
| Scope exposes **9** SQL fragments: `ownedProject`, `ownedEvent`, `ownedAliasedEvent`, `currentEvent`, `currentAliasedEvent`, `priorToRangeEvent`, `todayEvent`, `comparisonCurrentRange`, `comparisonPreviousRange` | `analyticsScope.ts:218-270` |
| **`ownedEvent` carries ownership with *no* period predicate** | `analyticsScope.ts:245` — this is the lifetime fragment Phase 5 needs; **no new fragment is required** |
| `ProductStat` already carries **`projectId` + `productId`** | `analytics-types.ts:292-296` |
| `TopShopperRow` already carries **`projectId` + `customerId`** | `shopperOrders.ts:41-44` |
| `EventRecord` already carries `projectId`, `sessionId`, `customerId` | `event.controller.ts:361-362` |
| Drawer/portal idiom exists (`createPortal`, Escape-to-close, focus handling) | `events/EventDetailsDrawer.tsx` (166 lines) |
| `AnalyticsTabPanel` provides loading/error/retry states | `analytics/AnalyticsTabPanel.tsx` |
| `GlowCard`, `Icon`, `FilterDropdown` are the shared primitives | `components/common/` |
| Friction aliases incl. `outOfStock: ["item_out_of_stock"]`, `itemUnavailable` | `contract/taxonomy.ts:185-192` |
| Rate limiting is **ingestion-only**, per `apiKeyId` | `utils/rateLimit.ts` — read endpoints are JWT-only; Phase 5 adds no limiter (debt register #8 owns that) |
| **Phase 3E shipped the project-scoped shopper key** — `COUNT(DISTINCT ("projectId","customerId")) FILTER (WHERE "customerId" IS NOT NULL)` | `shopperSummary.ts` as of `861753d` — **the exact pattern C-a's `attributedShoppers` uses**; Phase 5 is consistent with shipped Phase 3, not inventing a rule |
| Phase 3E's Shoppers cards are merged (`ShopperTrendCard`, `NewReturningCard`, `RepeatPurchaseCard`, `TopShoppersCard`, `ShopperCoverageNotice`) | `861753d` — B4's card is the live 5E entry point for B5 |
| **`ANALYTICS_QUERY_IDS` = `[1 … 28]`**; registry holds 28 entries ending at #28 `shopper-order-metrics` | `explain-types.ts:12-15`, `explain-query-registry.ts:309` (3F, `a91809c`) |
| `BENCHMARK_TABS` **unchanged** — still the six tabs; the matrix is still tab × scope × range | `benchmark-types.ts:1-8` — 3F did not touch this file |
| `validateAnalyticsPayload(tab, payload, range?)` is keyed by **`BenchmarkTab`** and is now range-aware | `benchmark-utils.ts:963-967` (3F) |
| Granularity variants are **not** a registry field — they are a special-cased id list for `range === "all"` (ids 13, 22, 26, 27) | `explain-analytics.ts` (3F) — the mechanism Phase 5's D3 trend must join |
| The EXPLAIN coverage guard now derives from `ANALYTICS_QUERY_IDS.length` instead of a hardcoded 25 | `explain-analytics.ts` (3F) — adding ids is no longer brittle |
| Database is **PostgreSQL 14.18** | `SHOW server_version` — matches F-P3F-05's stated version scope |
| `eventpulse_bench` currently holds **549,864 events** — the exact dataset behind the `phase-3-3e945a6-medium` baseline | live count; manifest `8c97632d…`, seeder byte-identical |

**Indexes already on `Event`** (`prisma/schema.prisma:79-83`) — decisive for Phase 5:

```
@@index([userId, createdAt(sort: Desc)])
@@index([projectId, createdAt(sort: Desc)])
@@index([projectId, customerId])          ← B5 shopper drilldown
@@index([projectId, sessionId])           ← C-b session drilldown
@@index([projectId, sessionId, createdAt])← C-b ordered timeline, C-a
```

`F-0D5-09` already records `Event_projectId_customerId_idx` appearing in 25 scan nodes, so these are live paths, not theoretical ones.

### 0.1a Two Phase 5 risks retired by 3F's findings

**F-P3F-05 retires the shared-CTE overhead risk for 5B and 5C.** 3F inspected every `#28` plan tree recursively and found that PostgreSQL **prunes the unreferenced `orderFactsCtes` branches** — `session_representatives`, `money_evidence_quality`, and `order_quality` are absent from all six plans, while the referenced `identity_representatives` and `currency_slices` chain is retained. B5 and D3 consume the same shared builder for a narrow slice, so this is direct evidence that consuming it does **not** drag unrelated CTE cost. *Caveat carried forward from the finding itself: confirmed on **PostgreSQL 14.18**; the check must be repeated across database-version upgrades.* Branch 5B and 5C EXPLAIN steps adopt that same recursive CTE check.

**F-P3F-03 confirms the set-based discipline holds at scale.** All six `#27` lifecycle plans contain no correlated `SubPlan`; the Phase 3C pathology did not return. This is the standing evidence behind §8's prohibition and behind 5A/5B/5C's "assert no `SubPlan` with loops" acceptance items.

**F-P3F-08 sets the honesty bar for every Phase 5 timing claim.** All 223 targets held one plan-shape hash across six executions, but **52 of 60 HTTP cells fell outside at least one local variance band**, and an immediate repeat ran Shopper medians **21.97–32.80% slower**. Phase 5 therefore treats **plan shape and payload stability as the hard gates and timings as directional only** — the same posture Phases 2–4 adopted, now with stronger evidence.

### 0.2 The frontend fetch layer does **not** generalise to drilldowns — measured, not assumed

`useAnalyticsTabData` is structurally tab-only: its cache is `{scopeKey, tabs: Partial<Record<AnalyticsDataTabId, …>>}` and its in-flight guard `latestRequestIds` is a fixed six-key record literal (`overview, conversion, sales, products, shoppers, behavior`). There is no key space for an entity id. Its invalidation rule is "scopeKey changed → drop everything".

**Consequence:** a drilldown cannot be threaded through this hook without either widening its key type to `string` (destroying the exhaustive tab typing that makes it safe) or bolting an entity dimension onto a structure whose single invalidation rule does not fit. Phase 5 therefore adds a **separate, small hook** (P5-A11) and leaves `useAnalyticsTabData` untouched. This is a decision, not a deferral.

### 0.3 Measured performance evidence (live `eventpulse_bench`, read-only)

Dataset: 549,864 events · 110,199 sessions · 6 projects · span 2026-05-13 → 2026-08-11. **This is the same dataset and manifest (`8c97632d…`, seed 502) that backs the current baseline of record `phase-3-3e945a6-medium`** — the seeder was byte-identical through 3F — so these Phase 5 measurements are directly comparable with the Phase 3 numbers quoted in §11.

| Phase 5 query shape | Scope measured | Time | Plan |
|---|---|---:|---|
| **C-b** session timeline (ordered events of one session) | project + session | **0.85 ms** | `Index Scan using Event_projectId_sessionId_createdAt_idx`, 7 buffers |
| **B5** shopper profile header (sessions, first/last seen, events) | project + customer | **0.83 ms** | index-served |
| **D3** product detail, per-day buckets | project + product, 90d | **25.2 ms** | `[projectId, createdAt]` narrows first; JSONB filter applied after |
| **D3** worst case | **all-projects**, no range | **56.2 ms** | scan, but simple filter — no spill |
| **C-a** session quality (**corrected** grouping) | all-projects / all-time | **354 ms** | two `PERCENTILE_CONT` sorts over 110k session rows |
| C-a with the *naive* `(projectId, sessionId, customerId)` grouping | all-projects / all-time | 1,356 ms | **and wrong** — see 0.4 |

**Ruling this produces:** the three drilldowns are sub-100 ms index-served lookups — a different performance class from Phases 2–4 (hundreds of ms to seconds). They need **no index and no optimisation work**. The entire performance risk of Phase 5 is **C-a alone**, the one wide aggregate. Budgets in §11 reflect that split.

The tenant predicate remains enforced: the C-b plan shows `Index Cond: (projectId, sessionId)` with `Filter: (userId = …)`. The index narrows to ~12 rows and the ownership filter rejects anything not owned — safe *and* cheap.

### 0.4 Correctness hazard discovered by measurement — binds the design

Sessions contain a **mix** of rows with and without `customerId` (legacy rows predate the column; ingestion requires it only for new events, `schema.prisma:72-77`):

```
sessions where every row has a customerId : 75,184
sessions with MIXED null / non-null rows  : 34,974   ← 31.8% of sessions
sessions with no customerId on any row    :     41
```

Grouping session facts by `(projectId, sessionId, customerId)` therefore **splits one real session into two rows**, inflating the session count from **109,999 → 144,909 (+31.7%)** and corrupting every median derived from it. The naive form is also 3.8× slower.

Identity collision evidence (Principle 5 is load-bearing, and testable):

```
sessionIds appearing in >1 project        : 0     (bench happens to be globally unique — NOT a contract guarantee)
(projectId, sessionId) with >1 customerId : 0
customerIds appearing in >1 project       : 3,000 ← cross-project collisions DO exist
```

This produces **P5-A4** and **P5-A5** (§6) and a mandatory fixture in every branch that touches session grain.

### 0.4a Pre-existing inconsistency found in shipped Phase 3 code — recorded, not fixed

`fetchShopperSummary` as merged at `861753d` counts the two identities with **different keys**:

```sql
COUNT(DISTINCT ("projectId","customerId")) FILTER (WHERE "customerId" IS NOT NULL) AS "uniqueCustomers"  -- project-scoped
COUNT(DISTINCT "sessionId")                                                        AS "uniqueSessions"   -- GLOBAL
```

Shoppers are project-scoped (correct, Principle 5); **sessions are not**. In bench the two agree only because `sessionId` happens to be globally unique there (0 cross-project collisions, §0.4) — which the contract does not guarantee, and which is already false for `customerId` (3,000 collisions).

**Consequence for Phase 5:** C-a counts sessions as `(projectId, sessionId)` (P5-A4), so on any dataset with cross-project session-id reuse **C-a's session count will legitimately be higher than `shopperSummary.uniqueSessions`**. Branch 5D must **not** reconcile the two by adopting the weaker key, and must not change `uniqueSessions` — modifying a shipped Phase 3 metric is out of scope (§19) and would need its own approved branch. The divergence is recorded here and filed as a finding in 5D's PR.

### 0.5 Benchmark coverage gap — Phase 5's equivalent of Phase 4's seeder defect

Neither dataset exercises a large entity:

```
bench: max events/session 12 · p99 11 · max events/shopper 31 · max sessions/shopper 3
dev  : max events/session  4 · p99 3.88
```

Real stores produce sessions of hundreds of events. **Timeline truncation, pagination, and drawer scroll behaviour are therefore unmeasurable on today's data.** Recorded as **D5-1** in §22 with a recommended default, and as the sole mandatory seeder change in branch 5G.

### 0.6 Scope-boundary finding

`getEventsController` builds its **own** tenant predicate (`WHERE e."userId" = ${userId}` plus hand-rolled project/name/range fragments, `event.controller.ts:349-374`) and does **not** use `AnalyticsScope`. That is acceptable for the Events page, which is not an analytics surface, but it is **not a pattern Phase 5 may copy**: B5 and C-b are analytics and must route through `createAnalyticsScope` (architecture decision 9). Recorded as an explicit "must not change / must not imitate" in every branch spec.

---

## 1. Authoritative Phase 5 scope

**Blueprint Part 7, row 5 (verbatim):** `| **5** | Drilldowns | D3 product, B5 shopper, C-b session, C-a session quality | M–L |`

| ID | Feature | Blueprint `M:` field (verbatim) | Surface |
|---|---|---|---|
| **D3** | Product Detail Drilldown — Advanced | "per-product trend of views/carts/purchase-outcome sessions, confirmed units where available, stock-outs, GMV" | Drawer from D1 (Products tab) |
| **B5** | Shopper Profile Drilldown — Advanced | "sessions, first/last seen, orders, GMV, event timeline" · "establishes the drilldown pattern" | Drawer from B4 (Shoppers tab) + Events drawer |
| **C-b** | Session Timeline Drilldown — Advanced | "ordered events of one session + outcome badge" | Drawer from Events drawer / B5 |
| **C-a** | Session Quality Metrics — Advanced | "median events/session, median duration (first→last event), sessions per shopper" | Card on Shoppers tab, lower |

**Blueprint gap recorded, not filled — D4 Stock-out Impact is NOT Phase 5.** Part 7 assigns D4 to no phase, and Part 8's "build later" list does not name it. D3's `M:` field does include per-product **stock-out counts**, so Phase 5 ships stock-out numbers *inside the product drawer* and does **not** build D4's ranked card. Flagged in §22 (D5-5) as an unscheduled blueprint item for the owner, not resolved unilaterally.

**Phase 5 is independent of Phase 4.** D3 needs GMV and confirmed units (Phase 2, merged `514bbd9`); B5 needs order identity and GMV (Phases 2–3, merged); C-a and C-b need only `sessionId` timestamps (present since Phase 1). **No Phase 5 feature reads a Phase 4 surface.** Sequencing consequences are in §16.

**Excluded (later phases or never):** D4 ranked stock-out card (unscheduled) · H1 cohorts (Phase 7) · G-series (Phase 6) · L2 CSV export (Phase 6) · session replay and heatmaps (never-build) · session-outcome donut (blueprint: "funnel tells it") · product-level correlation insight rules (blueprint marks these "later") · LTV/refunds (postponed pool).

---

## 2. What Phases 1–4 already provide

| Surface | State (verified) | Phase 5 use |
|---|---|---|
| `analyticsScope.ts` | 9 fragments incl. **`ownedEvent` (ownership, no period)** | `currentEvent`/`currentAliasedEvent` for range-scoped fields; **`ownedEvent` for lifetime fields — no new fragment** |
| `shared/orderFacts.ts` | `orderFactsCtes()` — identity + money representatives, carries `customerId` | B5 orders/GMV, D3 GMV — **consumed, never re-derived** |
| `contract/orderIdentity.ts` | `ORDER_FACT_EVENT_NAMES`, `ORDER_COUNT_BASIS`, fallback label | B5/D3 order basis + labels |
| `contract/taxonomy.ts` | Tier 1–5 names, `ACCEPTED_EVENT_ALIASES`, `COMMERCE_FRICTION_ALIASES.outOfStock` | D3 stock-outs, C-b event classification |
| `analytics/productPerformance.ts` | D1 rows carrying `projectId` + `productId` | D3 entry point — **no payload change needed** |
| `analytics/shopperOrders.ts` | B4 rows carrying `projectId` + `customerId` | B5 entry point — **no payload change needed** |
| `analytics/trend.ts` | `resolveTrendGranularity`, `fetchTrendSpanDays` | D3 per-product bucketing |
| `analytics/summary.ts` | Six tab composers, `AnalyticsTab` union | C-a joins the Shoppers composer; drilldowns use a **new** composer set |
| `events/EventDetailsDrawer.tsx` | Portal drawer, Escape-to-close, copy affordances | The idiom Phase 5's analytics drawer follows |
| `AnalyticsTabPanel.tsx` | loading / error+retry / success | Reused for in-drawer states |
| **Analytics detail endpoint** | **Does not exist** | 5A creates it |
| **Analytics drawer** | **Does not exist** | 5E creates it |
| **Drilldown fetch hook** | **Does not exist** (§0.2) | 5E creates `useAnalyticsDetail` |

---

## 3. Identity and contract audit

Classification: **CG** = contract-guaranteed · **OC** = observed convention · **SD** = seeded-data only · **UN** = unsupported.

| # | Question | Answer | Class |
|---|---|---|---|
| 1 | Session identity key? | `(projectId, sessionId)`. Contract §1 defines a session as one visit; `sessionId` is envelope-required for new events. Bench shows 0 cross-project collisions but that is **not guaranteed** | **CG** |
| 2 | Shopper identity key? | `(projectId, customerId)` — blueprint Principle 5, contract §1 (pseudonymous, no identity merge in v1). Bench: **3,000** customer ids appear in >1 project | **CG** |
| 3 | Can a session's rows disagree on `customerId`? | Yes — 34,974 sessions mix null and non-null (§0.4). 0 sessions carry **two different** non-null ids in bench | **CG** (nullable column) / **OC** (single id per session) |
| 4 | Is `sessionId` guaranteed non-null? | No — nullable in DB for legacy rows; required by the ingestion envelope for new events | **CG** |
| 5 | Session boundary rule? | 30-min inactivity / 24 h absolute, defined in the contract itself | **CG** — but EventPulse does **not** re-segment; it trusts the merchant's `sessionId` |
| 6 | Can a session straddle the selected range? | Yes, trivially | **CG** — drives P5-A3 |
| 7 | "First/last seen" for a shopper? | Lifetime `MIN`/`MAX(createdAt)` for `(projectId, customerId)` | **CG** — inherently outside the range |
| 8 | Product identity for D3? | `properties->>'product_id'`, Recommended tier | **CG** — absence is an unavailable state, never an estimate |
| 9 | Product name stability? | Merchant-supplied, may change over time; D1 already takes a representative via `MAX(...)` ordering | **OC** |
| 10 | Stock-out signal? | `item_out_of_stock` / `item_unavailable` (`COMMERCE_FRICTION_ALIASES`) | **CG** |
| 11 | Session "outcome badge" vocabulary? | **Not in the contract.** Derived at read time from funnel aliases + order facts | **Derived** — must be labeled as EventPulse-derived, never as a merchant field |
| 12 | Event ordering within a session? | `createdAt` is server receipt time (decision 19; `occurredAt` deferred to Phase 11). Ties are possible | **CG** — needs a deterministic tie-break (P5-A8) |

**Consequences that bind the design:** (a) every drilldown key must include `projectId`, which is both a correctness requirement and the reason the existing indexes serve these queries; (b) session facts must never be grouped by `customerId`; (c) lifetime fields exist and must be labeled as such rather than silently range-scoped; (d) the session outcome badge is a derived label and must say so.

---

## 4. Benchmark-dataset audit

Measured 2026-08-25 against `eventpulse_bench` (full figures in §0.3–§0.5).

| Scenario | Status |
|---|---|
| Sessions with orderable event timelines | **Sufficient** (110k sessions) |
| Shoppers with multiple sessions | **Present but thin** — max 3 sessions/shopper |
| Cross-project `customerId` collisions | **Present** (3,000) — Principle 5 is testable |
| Sessions with mixed null/non-null `customerId` | **Present and dominant** (34,974) — the §0.4 hazard is exercised |
| Sessions with no `customerId` at all | **Present but thin** (41) |
| Products with view/cart/purchase history | **Sufficient** |
| Stock-out events (`item_out_of_stock`) | **Present** (720) |
| **Large sessions (hundreds of events)** | **ABSENT** — max 12 (bench), 4 (dev). Truncation/pagination unmeasurable |
| **Shoppers with long histories** | **ABSENT** — max 31 events, 3 sessions |
| Mixed currencies, malformed money | Present (Phase 2E) |

**Verdict:** unlike Phase 4, Phase 5's semantics are **almost entirely measurable today**. One gap is material — entity size — and it affects only truncation behaviour, not metric correctness. It is the **sole** mandatory seeder change in 5G, and it follows the Phase 2E two-step baseline rule.

---

## 5. Metric-by-metric semantics

**The scope-labeling rule (binding).** Phase 5 is the first phase whose payloads mix range-scoped and lifetime numbers in one view. Every field is therefore explicitly one of:
- **range-scoped** — obeys the selected range exactly, like every Phase 1–4 metric; or
- **lifetime** — deliberately ignores the range because the entity demands it, and **carries a label saying so** in both payload and UI.

A field may never be silently one while appearing to be the other. Blueprint Principle 9 is preserved by *disclosure*, following the Phase 3C precedent that already reads outside the range under a label.

### D3 — Product detail drilldown (**range-scoped**, `(projectId, productId)`)
- **Question:** "Why is this product underperforming?"
- **Grain:** sessions for the funnel columns (Principle 1); confirmed orders for money (Principle 3).
- **Fields:** per-bucket view / cart / purchase-outcome **sessions**; confirmed units sold where `items[]` is present; stock-out event counts; GMV in the dominant currency.
- **Attribution language is inherited verbatim from D1 (Principle 6):** the purchase column is **"Sessions that purchased"**. "Units Sold" appears **only** where purchase events carry `product_id`/`items[]`. The drawer must not upgrade the claim the tab makes.
- **Money:** dominant currency only, labeled, with an excluded-order count. Never combined, never converted (decision 4).
- Bucketing reuses `resolveTrendGranularity`; a bucket with a zero denominator yields `null`, never 0.

### B5 — Shopper profile drilldown (**dual-scope**, `(projectId, customerId)`)
- **Question:** "What did this customer do?" (support / VIP / fraud investigation — the blueprint states it carries **no insight rules**; it is an investigation tool).
- **Lifetime fields (labeled):** `firstSeen`, `lastSeen`, lifetime sessions, lifetime events. Computed with `ownedEvent`.
- **Range-scoped fields:** confirmed orders, GMV, sessions in range, event timeline. Computed with `currentEvent` / `currentAliasedEvent`.
- **Orders/GMV consume `orderFactsCtes` filtered to the customer** — never re-derived (decisions 13, 14).
- **Session list:** each of the shopper's sessions in range, with start time, event count, and the derived outcome badge; each row is a click-through into C-b.
- **Pseudonymity disclosure:** the UI repeats B4's existing note that customer ids are store-provided pseudonyms and remain project-scoped. No PII is displayed, derived, or logged.

### C-b — Session timeline drilldown (**entity-complete**, `(projectId, sessionId)`)
- **Question:** "What happened in this visit before abandonment?"
- **Scope ruling:** the timeline is **entity-complete, not range-clipped** — it returns the session's full ordered event list using `ownedEvent`, because a session truncated at a range boundary would misrepresent the visit (Principle 2: no fabricated or misleading data). The drawer states that the timeline shows the complete session.
- **Ordering:** `createdAt ASC`, tie-broken by `id ASC` — deterministic, and exactly the existing `[projectId, sessionId, createdAt]` index order.
- **Outcome badge** (derived, labeled as derived): `purchased` when an order-fact alias is present · `payment-failed` when `payment_failed` is present without an order fact · `checkout-abandoned` when a checkout alias appears without either · `cart-abandoned` when a cart alias appears without checkout · `browsed` otherwise. Precedence is evaluated in that order, so a session is assigned exactly one badge.
- **Truncation:** a hard server-side cap with a **counted, labeled remainder** — never a silent cut (§22 D5-1 for the cap value).

### C-a — Session quality metrics (**range-scoped**, wide aggregate, Shoppers tab)
- **Question:** "How engaged is a typical visit?"
- **Fields:** median events/session, median duration in minutes (first→last event in the session), sessions per shopper.
- **Session grain is `(projectId, sessionId)` — never `(projectId, sessionId, customerId)`** (P5-A4; §0.4 measured a +31.7% inflation from the wrong grouping).
- **Sessions-per-shopper attribution (P5-A5):** a session is attributed to a shopper when **any** row in it carries that `customerId`; sessions whose rows carry no `customerId` at all are **excluded from the ratio and counted separately** as unattributed. The ratio's denominator is distinct `(projectId, customerId)` pairs in range.
- Single-event sessions have a genuine duration of **0 minutes** — a measured zero, included, **not** null. Absent data is null; a real zero is zero (decision 5).
- Medians are `null` below a stated minimum qualifying-session count, never 0.
- **Sparse-tracking data-quality rule:** the blueprint assigns C-a an insight ("sparse-tracking data-quality rule"). It is implemented as a **pure** rule over C-a's plain-data output in `healthInsights.ts`, consistent with K1's pattern — no SQL, no new statement.

**Universal rules for all Phase 5 metrics:** tenant/range scope exclusively via `AnalyticsScope` fragments · every identity key includes `projectId` and is never merged across projects · null-not-zero · every unavailable state names its unlocking fields · no FX, no cross-currency summation · no client-side metric computation.

---

## 6. Architecture decisions

### LOCKED by authoritative documents
1. Phase 5 = D3, B5, C-b, C-a (Part 7 row 5).
2. Shopper identity `(projectId, customerId)`; project-scoped, no identity merge (Principle 5, contract §1).
3. Sessions are the conversion basis; event counts are diagnostic only (Principle 1).
4. Order identity and GMV dedup are consumed from the shared chain, never re-derived (decisions 13, 14).
5. No FX; money is per-currency with a labeled dominant currency (decision 4, contract §3).
6. Null ≠ zero; unavailable states name their unlocking fields (decision 5, Principle 11).
7. Product attribution language: "Sessions that purchased" unless `product_id`/`items[]` are present (Principle 6).
8. B5 carries **no** insight rules — it is an investigation tool (blueprint §B5).
9. No session replay, no heatmaps, no identity enrichment (never-build).
10. All tenant/time SQL is built by `AnalyticsScope` alone (decision 9).

### RESOLVED — decided here from repository evidence and standing architecture

**P5-A1 — One new endpoint: `GET /api/analytics/detail?kind=<product|shopper|session>&…`.**
*Alternatives:* (a) one route per drilldown (`/analytics/product/:id`, …); (b) extend `/summary` with a `detail` parameter; (c) a single `/detail` endpoint discriminated by a required `kind`.
*Selected (c).* It is the **exact shape of the existing tab endpoint** — one required discriminant → one composer switch → one controller, reusing `createAnalyticsScope` verbatim — so a reviewer's model of `analytics.controller.ts` transfers with zero new concepts. (a) multiplies routes and auth surfaces for no gain; (b) overloads a working, benchmarked contract and would force `tab` and `detail` to be mutually exclusive at runtime — a validation branch that can be got wrong.
*Consequence:* architecture decision 6 ("tab-scoped endpoints, one required parameter → one composer") is **extended, not violated** — Phase 5 is the entity-detail sibling of the same pattern. Detail responses are **never** bundled into tab payloads: entity cardinality is unbounded, so Phase 3's "progressive disclosure ≠ lazy loading" ruling does not apply here — this is genuine lazy loading of unbounded data, which is what it was distinguished from.

**P5-A2 — Every drilldown key is `(projectId, entityId)`, supplied by the clicked row.**
Verified available today: `ProductStat.projectId/productId`, `TopShopperRow.projectId/customerId`, `EventRecord.projectId/sessionId`. *Consequence:* **no existing payload changes to enable click-through**; identity is project-scoped per Principle 5 even when the tab is in all-projects mode; and the existing `[projectId, customerId]` / `[projectId, sessionId, createdAt]` indexes serve every drilldown (§0.3). A request whose `projectId` the caller does not own fails the ownership predicate and returns the standard not-found shape — never a partial result.

**P5-A3 — Dual-scope semantics using the existing `ownedEvent` fragment; no new scope fragment.**
Range-scoped fields use `currentEvent`/`currentAliasedEvent`; lifetime fields (B5 first/last seen, C-b's complete timeline) use `ownedEvent`, which already carries ownership with no period predicate (`analyticsScope.ts:245`). *Consequence:* the nine-fragment scope authority is unchanged, every lifetime read is centrally scoped, and each lifetime field is labeled in the payload (§5).

**P5-A4 — Session grain is `(projectId, sessionId)`. Grouping session facts by `customerId` is forbidden.**
Measured: the wrong grouping inflates sessions by **+31.7%** and is 3.8× slower (§0.4). *Consequence:* an explicit acceptance item and a review grep in every session-grain branch.

**P5-A5 — Session→shopper attribution: any-row-carries-the-id; no-id sessions counted separately.**
Follows from 34,974 mixed sessions. *Consequence:* C-a's ratio has a stated denominator and a disclosed unattributed count — no silent dropping, no zero-filling.

**P5-A6 — C-a is a new module on the Shoppers composer (+1 statement); the drilldowns are a separate composer set.**
*Alternatives:* fold C-a into `shopperSummary.ts`. *Rejected* — `shopperSummary.ts` is the legacy KPI module that Phase 3E is actively editing (P3-A3 restricts it), and C-a is a different grain with different sorts. *Consequence:* `sessionQuality.ts` is new and independent; **Phase 5 touches no file Phase 3E is editing.**

**P5-A7 — Split performance budgets: 50 ms p95 for drilldowns, tab-level budget for C-a.**
Measured 0.85 / 0.83 / 25 / 56 ms for the drilldowns (§0.3). A 300 ms budget copied from Phases 2–4 would be meaningless here — two orders of magnitude of headroom hides regressions. C-a keeps a 300 ms single-query hypothesis and is measured against the Shoppers tab budget.

**P5-A8 — Deterministic ordering and hard caps on every list.**
Timelines order by `createdAt ASC, id ASC` (matching the index, and `createdAt` is server receipt time with possible ties — decision 19). Every list-bearing payload carries `returned`, `total`, and `truncated`, so a cut is always visible and countable. Cap value: §22 D5-1.

**P5-A9 — No new index, no schema change, no migration.**
Measured index scans already serve all three drilldowns. Any future index must clear the standards §9 / 0D-5 §14 bar (measured problem, EXPLAIN pathology attributable to the index, selectivity, ingestion write-cost, before/after on the same tier) in a separate, separately-approved branch.

**P5-A10 — D3 ships stock-out counts; D4's ranked card is not built** (§1). The blueprint gap is reported, not filled.

**P5-A11 — A new `useAnalyticsDetail` hook; `useAnalyticsTabData` is not modified.**
Keyed by `(kind, projectId, entityId, scopeKey)`, with the same request-id staleness guard and the same "scope change invalidates" rule, plus "drawer closed → drop". *Reasoning in §0.2 — the existing hook's key space is a fixed six-tab record literal and cannot carry an entity id without destroying its exhaustive typing.* *Consequence:* zero risk to the six shipped tabs; decision 7 (per-scope cache, no caching library) is preserved.

**P5-A12 — One shared analytics drawer shell; three content components.**
`AnalyticsDrawer` owns the portal, Escape handling, focus trap, scroll lock, and `aria-modal` semantics — following `EventDetailsDrawer`'s proven idiom (`createPortal`, Escape-to-close). `ProductDetailPanel`, `ShopperProfilePanel`, `SessionTimelinePanel` are pure presentational children. *Consequence:* a11y is implemented once and reviewed once (standards §8).

**P5-A13 — Drawer state lives in the URL query string (`?detail=<kind>&pid=<projectId>&eid=<entityId>`).**
*Alternatives:* component state only. *Selected the URL* because a drilldown is exactly the thing an operator shares with a colleague during a support or fraud investigation — B5's stated purpose — and because it makes browser Back close the drawer, which users expect. *Consequence:* deep links are shareable; the scope query string already in the URL continues to govern range-scoped fields.

**P5-A14 — Cross-drilldown navigation is one-way and shallow: D1→D3, B4→B5, B5→C-b, Events→C-b, Events→B5.**
The drawer replaces its content rather than stacking; a back affordance returns to the previous entity within the drawer. *Consequence:* no nested-modal accessibility problem, and no unbounded navigation stack.

**P5-A15 — Failure semantics: a drilldown for an entity with no events in scope returns `status: "empty"` with the entity key echoed, not a 404 and not a fabricated zero row.** A malformed or unowned key returns 400/404 respectively. This keeps "no data" and "wrong id" distinguishable, which matters for an investigation tool.

---

## 7. API architecture

```
GET /api/analytics/detail?kind=product&projectId=<pid>&productId=<id>&range=…&from=…&to=…
GET /api/analytics/detail?kind=shopper&projectId=<pid>&customerId=<id>&range=…&from=…&to=…
GET /api/analytics/detail?kind=session&projectId=<pid>&sessionId=<id>&range=…&from=…&to=…
```

- **Auth:** `authMiddleware` (JWT), identical to `/summary`. No rate limiter (read path; debt register #8 owns that concern).
- **Validation order:** authenticated → `kind` is a known discriminant (else 400) → `projectId` present and non-empty (else 400) → entity id present, non-empty, length-capped (else 400) → `createAnalyticsScope` (else 400 with its message) → ownership enforced inside SQL → 404 if the project is not owned → `status: "empty"` if owned but no events in scope (P5-A15).
- **`projectId` is required for every `kind`,** even when the tab was viewing all projects — identity is project-scoped (Principle 5) and this is what makes the queries index-served.
- **Response envelope** matches `/summary` exactly: `{ success: true, data }`. Errors match the existing `{ success: false, message }`.
- Entity ids are **bound as parameters** through `Prisma.sql`, never concatenated — the standing rule in `event.controller.ts:337-338`.
- Merchant-supplied strings (product names, event names, property values, session/customer ids) are **escaped at render, length-truncated, and never logged with values** (standards §11, §12).

**Controller shape** — deliberately mirrors `getAnalyticsSummaryController`:

```ts
function isDetailKind(v: unknown): v is DetailKind { … }          // mirrors isAnalyticsTab
function buildDetail(kind, key, scope) { switch (kind) { … } }    // mirrors buildTabSummary
export async function getAnalyticsDetailController(req, res) { … }// mirrors the summary controller
```

## 8. SQL architecture

**D3 — product detail** (`productDetail.ts`, **2 statements**)
```
stmt 1 (range-scoped funnel + stock-outs, session grain):
  scoped AS (SELECT date_trunc(<granularity>,"createdAt") AS bucket, "sessionId", LOWER(name) AS name
             FROM "Event" WHERE ${scope.sql.currentEvent}
               AND NULLIF(BTRIM(properties->>'product_id'),'') = ${productId})
  → per-bucket COUNT(DISTINCT "sessionId") FILTER (view / cart / purchase-outcome)
  → plus stock-out event counts via COMMERCE_FRICTION_ALIASES.outOfStock
stmt 2 (money + confirmed units, order grain):
  WITH ${orderFactsCtes(scope.sql.currentAliasedEvent)}  -- consumed, never re-derived
  → dominant-currency GMV attributable to this product + confirmed units from items[]
```
Split along the **grain boundary** (session vs order), exactly as Phase 4 split F4-a from F4-b/c. Measured 25 ms project-scoped, 56 ms all-projects worst case.

**B5 — shopper profile** (`shopperProfile.ts`, **3 statements**)
```
stmt 1 (lifetime, ${scope.sql.ownedEvent}): MIN/MAX("createdAt"), COUNT(*), COUNT(DISTINCT "sessionId")
stmt 2 (range-scoped, ${scope.sql.currentEvent}): per-session rows — start, event count, outcome-badge flags
stmt 3 (range-scoped, order grain): ${orderFactsCtes(scope.sql.currentAliasedEvent)} filtered to the customer
        → confirmed orders + dominant-currency GMV
```
Statements 1 and 2 are index-served by `[projectId, customerId]`. Measured 0.83 ms.

**C-b — session timeline** (`sessionTimeline.ts`, **1 statement**)
```
SELECT id, name, properties, "createdAt", "customerId"
FROM "Event"
WHERE ${scope.sql.ownedEvent}          -- entity-complete, deliberately NOT range-clipped
  AND "sessionId" = ${sessionId}
ORDER BY "createdAt" ASC, id ASC
LIMIT ${cap + 1}                        -- +1 detects truncation without a second COUNT
```
Index Scan on `Event_projectId_sessionId_createdAt_idx`, ownership as a Filter. Measured 0.85 ms / 7 buffers. The outcome badge is computed in TypeScript from the returned names — no second query.

**C-a — session quality** (`sessionQuality.ts`, **1 statement**, Shoppers tab)
```
session_facts AS (                       -- (projectId, sessionId) ONLY — P5-A4
  SELECT "projectId","sessionId",
         COUNT(*) AS events,
         EXTRACT(EPOCH FROM (MAX("createdAt")-MIN("createdAt")))/60.0 AS minutes,
         MIN("customerId") FILTER (WHERE "customerId" IS NOT NULL) AS attributed_customer
  FROM "Event" WHERE ${scope.sql.currentEvent} AND "sessionId" IS NOT NULL
  GROUP BY 1,2)
→ PERCENTILE_CONT(0.5) over events and minutes
→ COUNT(*) FILTER (WHERE attributed_customer IS NULL) AS unattributed_sessions
→ COUNT(DISTINCT ("projectId", attributed_customer)) AS shoppers
```
Measured **354 ms** at all-projects/all-time. Set-based, single pass, no correlated subquery.

**Binding SQL rules (all statements):** set-based only — no correlated `EXISTS`/`SubPlan` with loops (the Phase 3C failure mode: >180 s → 1.7 s by set-based rewrite) · `properties->>'x'` is a function on JSONB and **cannot** use any index; acceptable in a single pass, catastrophic inside a correlated probe · every statement injects a `scope.sql.*` fragment and composes no ownership predicate of its own.

## 9. Scope and tenant architecture

No new fragment (P5-A3). Every statement injects `currentEvent`, `currentAliasedEvent`, or `ownedEvent`. `ownedEvent` reads outside the selected range **by design** and only where §5 declares the field lifetime — each such field is labeled in the payload and the UI.

**Phase 5 must not imitate `getEventsController`'s hand-rolled tenant predicate** (§0.6). Cross-tenant and cross-project fixtures are mandatory in every branch; the 3,000 cross-project `customerId` collisions in bench make the B5 case directly testable.

## 10. Module boundaries

```
apps/server/src/analytics/detail/productDetail.ts    (new — D3, 2 statements)
apps/server/src/analytics/detail/shopperProfile.ts   (new — B5, 3 statements)
apps/server/src/analytics/detail/sessionTimeline.ts  (new — C-b, 1 statement)
apps/server/src/analytics/detail/index.ts            (new — detail composer + DetailKind union)
apps/server/src/analytics/sessionQuality.ts          (new — C-a, 1 statement)
apps/server/src/analytics/summary.ts                 (edited — Shoppers composer gains C-a)
apps/server/src/analytics/healthInsights.ts          (edited — pure sparse-tracking rule)
apps/server/src/controllers/analytics.controller.ts  (edited — detail controller)
apps/server/src/routes/analytics.routes.ts           (edited — one route)
```

A `detail/` subdirectory keeps four new modules from flattening `analytics/`, which already holds 17 files. The drilldowns share a directory because they share an endpoint, a composer, and a payload discipline — not merely a theme.

**Explicitly untouched:** `shopperSummary.ts`, `ShopperKpiRow.tsx`, `AnalyticsOverview.tsx`, `tabs/ShoppersTab.tsx` — the four files Phase 3E is editing. Phase 5 adds C-a to `ShoppersTab` **only in branch 5F, after 3E has merged** (§16).

## 11. Statement count and performance budgets

| Surface | Before | Phase 5 adds | After |
|---|---|---|---|
| Shoppers tab | 4 concurrent + span | C-a **+1** | **5** + span |
| Overview / Conversion / Sales / Products / Behavior | unchanged | 0 | unchanged |
| `/analytics/detail?kind=product` | — | 2 | **2** (new endpoint) |
| `/analytics/detail?kind=shopper` | — | 3 | **3** |
| `/analytics/detail?kind=session` | — | 1 | **1** |

Detail statements run on their **own** request and never join a tab's fan-out, so Overview's 13-vs-10 pool pressure (F-P2E-04, F-0D5-07) is untouched.

**Budgets (P5-A7):**

| Target | Budget (p95) | Measured today | Headroom |
|---|---:|---:|---|
| `detail:session` | **50 ms** | 0.85 ms | 59× |
| `detail:shopper` | **50 ms** | 0.83 ms | 60× |
| `detail:product` | **150 ms** | 25 ms single / 56 ms all-projects | 2.7–6× |
| C-a single statement | **300 ms** | 354 ms all/all | **breached at all-projects/all-time** |
| Shoppers tab | existing hypothesis | **2,003 ms median / 2,070 ms p95** at all:all (`phase-3-3e945a6-medium`, F-P3F-01) | already breaching heavily pre-Phase-5 |

**Corrected by the 3F reconciliation.** This plan originally cited the 0D-5 figures (370 ms / 976 ms). The current baseline of record measures `shoppers:all:all` at **2,003 ms median / 2,070 ms p95** — Phase 3's four statements raised Shopper latency by 161–978% across cells (F-P3F-01), with `#26` at 1,265 ms (35,099 temp blocks), `#28` at 1,414 ms (six nested loops), and `#27` at 904 ms (20,515 temp blocks). Full Shoppers ladder for reference: `single:24h` 121 ms · `single:all` 643 ms · `all:30d` 885 ms · `all:custom-long` 904 ms · `all:all` **2,003 ms**.

**C-a therefore adds a fifth concurrent statement — itself spill-prone, with two `PERCENTILE_CONT` sorts — to a tab already at two seconds at its widest cell.** That is a materially heavier proposition than the original draft assumed, and it is handled as follows:

- **The ship decision is made: C-a ships on the Shoppers tab**, per the standing rule that measurement findings are filed, not optimised inside a feature branch (P3-P4, Phase 4 §13, and F-P3F-02/04 which declined optimisation on exactly this tab).
- **Branch 5D carries an explicit measured gate**, modelled on Phase 3C's precedent ("ship when the set-based rerun is healthy; block if serious pathology remains"): 5D captures `EXPLAIN (ANALYZE, BUFFERS)` for C-a at all-projects/all-time **before 5F builds UI on it**. The plan must be a single-pass set-based aggregate with **no correlated `SubPlan`**. Sort spill is expected and acceptable — every wide Shopper query already spills — and is recorded, not fixed.
- **Escalation threshold, stated up front:** if 5G step 1 measures `shoppers:all:all` **above 3,000 ms median**, that is a stop-and-report condition (§18), not a silent acceptance. The residual measurement is D5-3.
- Note that Shoppers is **not** the worst tab: `sales:all:custom-long` is **7,402 ms** with `#21` at 7,611 ms. Phase 5 touches neither.

## 12. Payload design

Discriminated unions throughout; additive; no shipped Phase 1–4 field renamed or revalued.

```ts
// MIRROR: apps/server/src/analytics/detail/index.ts
export type DetailKind = "product" | "shopper" | "session";

/** Every list-bearing payload discloses truncation (P5-A8). */
export interface DetailListMeta { returned: number; total: number; truncated: boolean; }

/** Fields that deliberately ignore the selected range (P5-A3, §5). */
export interface LifetimeFacts {
  scope: "lifetime";              // discriminant the UI must render as a label
  firstSeen: string; lastSeen: string;
  sessions: number; events: number;
}

export type SessionOutcome =
  | "purchased" | "payment-failed" | "checkout-abandoned"
  | "cart-abandoned" | "browsed";   // derived by EventPulse, labeled as derived

export interface SessionTimelineEntry {
  id: string; name: string; createdAt: string;
  isCommerceStep: boolean; properties: Record<string, unknown>;
}

export type SessionDetail =
  | { status: "available"; projectId: string; sessionId: string;
      outcome: SessionOutcome; startedAt: string; endedAt: string;
      durationMinutes: number;            // 0 is a measured zero, not null
      customerId: string | null;          // null = session never carried one
      timelineScope: "entity-complete";   // never range-clipped — UI must say so
      entries: SessionTimelineEntry[]; meta: DetailListMeta; }
  | { status: "empty"; projectId: string; sessionId: string }
  | { status: "unavailable"; missingFields: string[]; message: string };

export interface ShopperSessionRow {
  sessionId: string; startedAt: string; events: number; outcome: SessionOutcome;
}

export type ShopperDetail =
  | { status: "available"; projectId: string; customerId: string;
      lifetime: LifetimeFacts;                    // labeled lifetime
      rangeSessions: number;                      // range-scoped
      confirmedOrders: number; orderBasis: OrderCountBasis;
      gmv: number | null; currency: string | null;
      ordersExcludedForCurrency: number;
      sessions: ShopperSessionRow[]; meta: DetailListMeta; }
  | { status: "empty"; projectId: string; customerId: string }
  | { status: "unavailable"; missingFields: string[]; message: string };

export interface ProductDetailPoint {
  date: string;
  viewSessions: number; cartSessions: number; purchaseSessions: number;
  viewToPurchasePercent: number | null;   // null when the bucket denominator is 0
}

export type ProductDetail =
  | { status: "available"; projectId: string; productId: string;
      productName: string | null; granularity: TrendGranularity;
      points: ProductDetailPoint[];
      stockOutEvents: number; unavailableEvents: number;
      gmv: number | null; currency: string | null; ordersExcludedForCurrency: number;
      confirmedUnitsSold: number | null;   // null unless items[] present
      itemsCoverage: ItemsCoverage;        // reused from Phase 2
      attributionNote: string; }           // Principle 6 language, inherited from D1
  | { status: "empty"; projectId: string; productId: string }
  | { status: "unavailable"; missingFields: string[]; message: string };

export type AnalyticsDetail = ProductDetail | ShopperDetail | SessionDetail;

// MIRROR: apps/server/src/analytics/sessionQuality.ts   (Shoppers tab payload, additive)
export type SessionQuality =
  | { status: "available";
      medianEventsPerSession: number | null;   // null below the minimum qualifying count
      medianDurationMinutes: number | null;
      sessionsPerShopper: number | null;
      qualifyingSessions: number;
      unattributedSessions: number;            // disclosed, never dropped (P5-A5)
      attributedShoppers: number; }
  | { status: "unavailable"; missingFields: string[]; message: string };
```

Every `number | null` means *unavailable*, never zero. `scope: "lifetime"` and `timelineScope: "entity-complete"` are discriminants the UI **must** surface as labels.

## 13. Frontend architecture

**New components**
```
analytics/detail/AnalyticsDrawer.tsx        (shell — portal, Escape, focus trap, scroll lock, aria-modal)
analytics/detail/ProductDetailPanel.tsx     (D3 content)
analytics/detail/ShopperProfilePanel.tsx    (B5 content)
analytics/detail/SessionTimelinePanel.tsx   (C-b content)
analytics/detail/detail-formatters.ts       (presentation only)
analytics/shoppers/SessionQualityCard.tsx   (C-a card)
hooks/useAnalyticsDetail.ts                 (P5-A11)
```

**Entry points** (no payload change required — P5-A2): D1 product rows → D3 · B4 shopper rows → B5 · B5 session rows → C-b · Events drawer "view session" / "view shopper" links → C-b / B5, which is exactly what blueprint Part 6 specifies for the Events page.

**Reuse:** `AnalyticsTabPanel` for in-drawer loading/error/retry · `GlowCard` and `Icon` · `HourlyTrendChart` idiom for D3's mini-trend · the Products ranked-table idiom · Phase 2's per-currency and basis-label patterns · `EventDetailsDrawer`'s portal/Escape idiom (P5-A12).

**Required disclosures** — each renders exactly under its condition and is an acceptance item:
- B5 lifetime fields labeled **"all time"**, visually distinct from range-scoped fields on the same panel.
- C-b timeline labeled **"complete session"** with a note that it is not clipped to the selected range.
- Session outcome badges labeled as **derived by EventPulse**, never as a merchant-supplied field.
- Truncated lists render `returned of total` with an explicit note — never a silent cut.
- D3 repeats D1's **"Sessions that purchased"** language; "Units Sold" appears only when `items[]` is present.
- GMV carries its currency label and excluded-order count; no blended total anywhere.
- C-a's unattributed-session count is shown alongside sessions-per-shopper.
- Customer ids repeat B4's pseudonymity note.

**Behaviour:** drawer state in the URL (P5-A13); Back closes; deep links restore. ~375 px responsive; the timeline scrolls inside its own container so the page body never scrolls horizontally. Focus returns to the triggering row on close. a11y per standards §8: `role="dialog"`, `aria-modal="true"`, labelled by the drawer heading, Escape closes, focus trapped while open. **No client-side metric computation** beyond formatting.

## 14. Performance reconnaissance

Measured shapes and plans are in §0.3. Expected plan shapes: index scans on `[projectId, sessionId, createdAt]` and `[projectId, customerId]` for B5/C-b; `[projectId, createdAt]` narrowing before a JSONB filter for D3; a single-pass hash aggregate plus two `PERCENTILE_CONT` sorts for C-a.

**Risk cells:** C-a at all-projects/all-time (measured 354 ms standalone, on a tab already at 2,003 ms — the sole real risk, §11) · D3 at all-projects with no range (56 ms) · C-b for a pathologically large session (**unmeasurable today** — §0.5, §22 D5-1).

**No index is proposed** (P5-A9). **Phase 5 optimises no inherited debt.** Against the current baseline of record that debt is: `sales:all:custom-long` **7,402 ms** with `#21 sales-comparison` at **7,611 ms** (the worst surface in the system) · `shoppers:all:all` **2,003 ms** (F-P3F-01/02/04) · `products:all:all` **2,353 ms** (F-0D5-01) · Overview's 13-statement fan-out against a pool of 10 (F-0D5-07, F-P3F-06) · the wide-scope spills in F-0D5-10 and F-P3F-02/03. All recorded, all untouched.

## 15. Benchmark strategy

**Query IDs — DECIDED (was D5-2; resolved by 3F).** `ANALYTICS_QUERY_IDS` is now **`[1 … 28]`**. Phase 4 has not started and claims #29–#32 in its own plan. Two concrete outcomes, both decided:

| Situation at the time 5G runs | Phase 5 takes |
|---|---|
| Phase 4's 4G **has not** merged (the case today) | **#29–#35** |
| Phase 4's 4G **has** merged and consumed #29–#32 | **#33–#39** |

Assignment in order: `product-detail-funnel`, `product-detail-money`, `shopper-profile-lifetime`, `shopper-profile-sessions`, `shopper-profile-orders`, `session-timeline`, `session-quality`. **Safety rule retained:** 5G reads the tuple and continues from its maximum rather than assuming either row, and records the actual assignment in the PR and the baseline. Whichever phase reaches 5G/4G second simply continues the tuple — the two plans cannot collide as long as both follow this rule.

**Concrete harness work 5G must do** — now known precisely from 3F's diff rather than estimated:

1. **Extend the id tuple** in `explain-types.ts`. The coverage guard in `explain-analytics.ts` already derives from `ANALYTICS_QUERY_IDS.length` (3F made it generic), so no hardcoded count needs changing there.
2. **Update the CLI help string** `--queries LIST  Query ids 1..28` and the "Medium covers all 28 production SQL statements" line in `explain-analytics.ts` — both are literal strings 3F had to bump, and 5G must too.
3. **Register the new entries** in `explain-query-registry.ts` with `supportedScopes` / `supportedRanges`, following the #26–#28 shape.
4. **Add D3's trend granularity variant** to the `range === "all"` special-case id list in `explain-analytics.ts` (today `13, 22, 26, 27`). Granularity is **not** a registry field — this list is the mechanism, which resolves the "day and month variants" question left loose in the draft.
5. **Extend the matrix with a detail dimension.** This remains the largest piece of 5G and 3F did **not** do it: `BENCHMARK_TABS` is untouched, and `validateAnalyticsPayload(tab, payload, range?)` is keyed by `BenchmarkTab`. Detail endpoints are not tabs and take no `tab` parameter, so 5G adds `BENCHMARK_DETAIL_KINDS` to `benchmark-types.ts` and teaches the runner to resolve a **deterministic** representative entity per kind from the seeded manifest — a seeded product, a seeded high-activity shopper, a seeded long session. Never `ORDER BY COUNT(*) LIMIT 1` at run time, or cells stop being reproducible across reseeds.
6. **Add `validateDetailPayload`** following 3F's `validateShopperPayload` precedent (`benchmark-utils.ts`, +273 lines of semantic assertions): assert the `available`/`empty`/`unavailable` discriminants, truncation metadata coherence (`returned ≤ total`, `truncated` iff `returned < total`), `scope: "lifetime"` and `timelineScope: "entity-complete"` presence, and monotonic timeline ordering. 3F's invariant-style checks — duplicate-bucket detection, coverage bounds, range-conditional discriminants — are the model.
7. **Preserve the fixed run anchor** (`2026-08-24T22:00:00.000Z`) so range boundaries stay deterministic.

**Two-step, per the Phase 2E rule** (a seeder change invalidates cross-manifest timing comparison):

- **Step 1 — measure on the unchanged dataset.** The baseline of record is **`phase-3-3e945a6-medium`** (manifest `8c97632d…`, 549,864 events, seeder byte-identical since Phase 2), so this is a **valid same-manifest comparison** — 3F preserved that property deliberately. Register ids and the detail dimension; run C-a and all three drilldowns; compare the 60 existing cells against the baseline as the regression check for 5A–5F. **A pre-existing-tab regression is a stop-and-report condition — the seeder is not touched until it is resolved.** All Phase 5 semantics except truncation are measurable here (§4).
- **Step 2 — extend the seeder for entity size only.** Add a deterministic **long session** (several hundred events) and a **high-activity shopper** (many sessions, long history), which today max out at 12 events and 3 sessions (§0.5). Then reseed, re-run, cut a **new baseline of record**, **retain every prior baseline**, and record that cross-manifest timings must never be compared as a same-dataset regression.

**Honesty posture (F-P3F-08):** plan-shape hashes and payload validity are the hard gates; timings are directional local evidence only. 52 of 60 cells fell outside a local variance band on an immediate repeat, and Shopper medians moved 21.97–32.80% between identical runs — so no Phase 5 timing may be presented as a release gate.

## 16. Dependency graph and sequencing

```
Phase 3 COMPLETE — 3E (861753d) · 3F (a91809c) all merged on main
        │
        ├── [Phase 4: 4A…4G — not started, independent of Phase 5]
        │            │                        │
        ▼            │                        │ ids #26–#28        ids #29–#32
5A detail endpoint + session timeline (C-b)   │                        │
        │            │                        │                        │
        ├──► 5B shopper profile (B5)          │                        │
        │                                     │                        │
        ├──► 5C product detail (D3)  [parallelizable with 5B]          │
        │                                     │                        │
        └──► 5D session quality (C-a) [independent — tab, not detail]  │
                     │                                                 │
   5A+5B+5C ──► 5E drawer + detail UI                                  │
        5D ──► 5F session quality card ◄── requires 3E merged          │
                     │                                                 │
                     ▼                                                 │
              5G benchmark extension (two-step) ◄──────────────────────┘
```

**Phase 5 does not depend on Phase 4** (§1) — no Phase 5 feature reads a Phase 4 surface. The two phases can proceed in either order or in parallel on the backend.

**Real sequencing constraints:**
- **5F required Phase 3E — now SATISFIED** (merged at `861753d`). C-a's card lands in `tabs/ShoppersTab.tsx`, which 3E rewrote; that file is now stable on `main`, so 5F is unblocked. 5D never had this constraint (it touches `sessionQuality.ts` and `summary.ts` only).
- **5G required 3F — now SATISFIED** (merged `a91809c`). The id tuple is `[1 … 28]` and the baseline of record `phase-3-3e945a6-medium` is current and same-manifest, so 5G has everything it needs. Query-id assignment is decided in §15 for both possible orderings relative to Phase 4.
- **5A is unblocked now** and is the pattern-setting branch: it establishes the endpoint, the composer, the payload discipline, and the tenant-scoping proof that 5B and 5C then follow. This is why C-b (the simplest, 1 statement, measured 0.85 ms) is deliberately first rather than D3.

**Parallelizable:** 5B with 5C; 5D with all of 5A–5C. **Hard dependencies:** 5B/5C → 5A (endpoint + composer), 5E → 5A+5B+5C, 5F → 5D **and 3E**, 5G → 5A–5F **and 3F**.

**Branch hygiene:** the tree is clean, `main == origin/main == a91809c`, and no parallel branch is open. Cut every Phase 5 branch from `main` at `a91809c` or later. The repository moved twice during planning, so re-run `git status` and `git log -1` immediately before cutting.

**No Phase 5 branch has a remaining external dependency.** All seven can begin; only the internal ordering above applies.

## 17. Branch sequence — full specifications

Each branch follows the 21-point house format used by Phases 2–4.

### 5A — `feature/analytics-detail-endpoint`

1. **Branch:** `feature/analytics-detail-endpoint`
2. **Goal:** establish the detail endpoint, composer, and payload discipline; ship **C-b session timeline** as the first (and simplest) consumer.
3. **Dependencies:** none beyond `0eac1fa`. **Unblocked now.** Independent of 3E/3F/Phase 4. Cut from `main`, never from the dirty tree.
4. **Files:** `analytics/detail/index.ts` (new) · `analytics/detail/sessionTimeline.ts` (new) · `controllers/analytics.controller.ts` (detail controller) · `routes/analytics.routes.ts` (one route) · web `analytics-types.ts` (MIRROR only).
5. **Must not change:** `summary.ts` · `analyticsScope.ts` · `shared/orderFacts.ts` · `contract/**` · any existing analytics module · **`shopperSummary.ts` or any file Phase 3E is editing** · any UI component · `prisma/**` · `scripts/**`.
6. **Impact:** one new route. Zero change to `/summary` behaviour or payloads.
7. **Steps:** define `DetailKind` and the detail payload union; implement `sessionTimeline.ts` per §8 using `scope.sql.ownedEvent`; compute the outcome badge in TypeScript from returned names (§5); implement `isDetailKind` + `buildDetail` + `getAnalyticsDetailController` mirroring the summary controller; mount the route; mirror types.
8. **Semantics:** §5 C-b verbatim. Timeline is **entity-complete, not range-clipped**, and says so in the payload.
9. **SQL:** §8 C-b. One statement, index-served, `LIMIT cap+1` for truncation detection.
10. **Scope/tenant:** `scope.sql.ownedEvent` only. **Must not imitate `getEventsController`'s hand-rolled predicate** (§0.6).
11. **Edge cases:** session with 1 event (duration 0 — a measured zero, not null) · session with no `customerId` on any row · session with mixed null/non-null `customerId` · session straddling the range boundary (full timeline still returned) · unowned `projectId` → 404 · owned project, unknown session → `status:"empty"` · malformed/oversized id → 400 · `createdAt` ties → `id ASC` tie-break · truncation at the cap.
12. **Payload:** `SessionDetail` (§12).
13. **Frontend:** none (5E).
14. **States:** `available` / `empty` / `unavailable`, each distinguishable.
15. **Budget:** new endpoint, **1 statement, 50 ms p95** (measured 0.85 ms). No change to any tab's statement count.
16. **Fixture matrix:** via the ingest API — the eleven cases in step 11, plus **cross-tenant** (another user's session id must 404, never leak) and **cross-project** (same session id under two projects must not merge). Independent SQL cross-check of the timeline and the badge.
17. **Benchmark/EXPLAIN:** no registry change yet (5G owns it). Capture `EXPLAIN (ANALYZE, BUFFERS)` and **assert the plan uses `Event_projectId_sessionId_createdAt_idx` and contains no `SubPlan` with loops**.
18. **Validation:** `bun run typecheck` · `bun run build` · `bun run lint` · `cd apps/server && bun run bench:typecheck` · `git diff --check` · `git status` · **all six tab payloads byte-identical**.
19. **Acceptance:** endpoint validates `kind`, `projectId`, and entity id in the stated order; ownership enforced in SQL; 404 vs `empty` distinguishable (P5-A15); timeline complete and deterministically ordered; truncation counted and disclosed; zero change to `/summary`.
20. **Risks:** R1 range-clipping the timeline by reflex (use `ownedEvent`, explicit acceptance item). R2 copying the Events controller's ad-hoc tenant predicate (forbidden; review grep for `userId" = ` outside `analyticsScope.ts`). R3 unbounded result on a huge session (cap + `LIMIT cap+1`).
21. **Commit:** `feat: add analytics detail endpoint with session timeline`

### 5B — `feature/shopper-profile-drilldown`

1. `feature/shopper-profile-drilldown` 2. B5 backend — lifetime facts, range sessions, orders/GMV. 3. **Deps:** 5A. 4. **Changes:** `analytics/detail/shopperProfile.ts` (new), `detail/index.ts`, web types. 5. **Must not change:** `shopperSummary.ts`/`shopperOrders.ts`/`shopperTrend.ts`/`shopperLifecycle.ts` · `shared/orderFacts.ts` · `sessionTimeline.ts` · `contract/**` · UI · schema · scripts. 6. Additive detail kind. 7. **Steps:** stmt 1 lifetime via `ownedEvent`; stmt 2 range sessions via `currentEvent`; stmt 3 orders/GMV by **consuming `orderFactsCtes`** filtered to the customer; assemble the dual-scope payload. 8. §5 B5 — lifetime fields carry `scope:"lifetime"`. 9. §8 B5, three statements. 10. `ownedEvent` + `currentEvent` + `currentAliasedEvent`; key `(projectId, customerId)`. 11. Shopper with zero in-range sessions but lifetime history (lifetime populated, range empty — a real and important case) · **cross-project customerId collision (3,000 exist in bench — must not merge)** · shopper with orders but no parseable money · mixed currencies · sessions with mixed null/non-null customerId · unowned project → 404. 12. `ShopperDetail`. 13. None (5E). 14. Lifetime and range states are independent. 15. **3 statements, 50 ms p95** (measured 0.83 ms). 16. Step-11 list + cross-tenant + independent SQL cross-check of orders, GMV, and session counts. 17. EXPLAIN; assert `Event_projectId_customerId_idx` is used; no correlated subplan; **repeat 3F's recursive CTE-pruning check (F-P3F-05) to confirm the unreferenced `orderFactsCtes` branches are still absent from the plan on this query shape** — confirmed for `#28` on PostgreSQL 14.18, not yet for this one. 18. As 5A. 19. Order counts and GMV **equal the B4 values for the same customer and range** (a direct cross-check against shipped Phase 3 output); lifetime fields labeled; no cross-project merge; `orderFactsCtes` consumed, never re-derived. 20. R1 re-deriving order dedup → forbidden, must import (decisions 13, 14). R2 silently range-scoping first/last seen → acceptance item. 21. `feat: add shopper profile drilldown`

### 5C — `feature/product-detail-drilldown`

1. `feature/product-detail-drilldown` 2. D3 backend — per-bucket funnel, stock-outs, GMV, confirmed units. 3. **Deps:** 5A. **Parallelizable with 5B.** 4. **Changes:** `analytics/detail/productDetail.ts` (new), `detail/index.ts`, web types. 5. **Must not change:** `productPerformance.ts` · `lineItems.ts` · `shared/orderFacts.ts` · `contract/**` · UI · schema · scripts. 6. Additive detail kind. 7. **Steps:** resolve granularity via `trend.ts`; stmt 1 session-grain funnel + stock-outs; stmt 2 order-grain money + confirmed units via `orderFactsCtes`; assemble. 8. §5 D3 — **D1's attribution language is inherited verbatim** (Principle 6). 9. §8 D3, two statements split on the grain boundary. 10. `currentEvent` (stmt 1) / `currentAliasedEvent` (stmt 2). 11. Product with views but no purchases · product with `items[]` on some orders only (`itemsCoverage` partial) · product absent from the range → `empty` · product id appearing under two projects (must not merge) · empty buckets → null rates not 0 · mixed currencies · all-projects worst case. 12. `ProductDetail`. 13. None (5E). 14. Unavailable when `product_id` is absent, naming the unlocking field. 15. **2 statements, 150 ms p95** (measured 25 / 56 ms). 16. Step-11 list + cross-tenant + independent SQL; **funnel totals cross-checked against D1's row for the same product and range**. 17. EXPLAIN at single and all-projects; confirm `[projectId, createdAt]` narrows before the JSONB filter; no correlated probe on `properties->>'product_id'` (P5-A5 / §8); **repeat the F-P3F-05 CTE-pruning check on statement 2's `orderFactsCtes` chain.** 18. As 5A. 19. Values reconcile with D1; "Sessions that purchased" language preserved; units only where `items[]` present; GMV single-currency and labeled. 20. R1 upgrading the attribution claim in the drawer → acceptance item. R2 JSONB filter inside a correlated probe → forbidden. 21. `feat: add product detail drilldown`

### 5D — `feature/session-quality-metrics`

1. `feature/session-quality-metrics` 2. C-a backend + the pure sparse-tracking rule. 3. **Deps:** none — independent of 5A–5C **and of 3E** (touches neither `shopperSummary.ts` nor the tab component). 4. **Changes:** `analytics/sessionQuality.ts` (new), `summary.ts` (Shoppers composer), `healthInsights.ts` (pure rule), web types. 5. **Must not change:** `shopperSummary.ts` · `shopperOrders.ts` · `shopperTrend.ts` · `shopperLifecycle.ts` · `tabs/ShoppersTab.tsx` · `ShopperKpiRow.tsx` · `AnalyticsOverview.tsx` (**the Phase 3E files**) · `detail/**` · schema · scripts. 6. Additive Shoppers payload field; **+1 statement**. 7. **Steps:** implement `sessionQuality.ts` per §8 grouping by `(projectId, sessionId)` **only**; compute medians and the shopper ratio; add the pure sparse-tracking rule to `healthInsights.ts`; wire into `buildShoppersSummary`; mirror types. 8. §5 C-a. **P5-A4 and P5-A5 are binding.** 9. §8 C-a, one statement, set-based. 10. `currentEvent`. 11. **Sessions with mixed null/non-null `customerId` (34,974 in bench — the primary correctness case)** · sessions with no `customerId` at all · single-event sessions (duration 0, included as a measured zero) · zero qualifying sessions → null medians, not 0 · cross-project customer collisions · all-projects/all-time. 12. `SessionQuality`. 13. Rendering in 5F. 14. Null medians render "—" (5F). 15. **+1 statement** on Shoppers (4 → 5), joining the existing four-way fan-out plus the all-time span pre-query (F-P3F-06). **300 ms single-statement hypothesis, measured 354 ms standalone at all/all — a pre-declared breach, filed as a finding, not optimised.** The tab it joins is already at **2,003 ms median / 2,070 ms p95** at all:all (§11). 16. **Hand-verified session count against `COUNT(DISTINCT (projectId, sessionId))` — must not exceed it** (this is the +31.7% regression test) · hand-computed medians on a small fixture · unattributed count verified · independent SQL cross-check. 17. **Gate (Phase 3C precedent):** capture `EXPLAIN (ANALYZE, BUFFERS)` for C-a at all-projects/all-time **before 5F builds UI on it**. The plan must be a **single-pass set-based aggregate with no correlated `SubPlan`**. Sort spill is expected and acceptable — `#26` writes 35,099 temp blocks and `#27` writes 20,515 on the same tab — and is recorded, not fixed. **File the budget breach as a finding; propose no fix.** Escalation threshold for 5G: `shoppers:all:all` above **3,000 ms median** is stop-and-report (§18, D5-2). 18. As 5A. 19. Session count **exactly** matches distinct `(projectId, sessionId)`; medians null-not-zero; unattributed sessions disclosed; the rule never fires on unavailable input; Shoppers goes 4 → 5 statements exactly. **C-a's session count may legitimately exceed `shopperSummary.uniqueSessions`, which uses a global `sessionId` key (§0.4a) — do not reconcile by weakening C-a's key, and do not modify the shipped metric; file the divergence as a finding.** 20. R1 the `(projectId, sessionId, customerId)` grouping bug (+31.7%, measured) → hand-count acceptance item **and** a review grep for `GROUP BY` in this file. R2 touching a Phase 3E file → forbidden list in step 5. R3 a fifth spill-prone statement on a 2-second tab → the step-17 gate plus the D5-3 escalation threshold. 21. `feat: add session quality metrics to shopper analytics`

### 5E — `feature/analytics-drilldown-ui`

1. `feature/analytics-drilldown-ui` 2. Drawer shell, three panels, the detail hook, and all entry points. 3. **Deps:** 5A, 5B, 5C. 4. **Changes:** `analytics/detail/AnalyticsDrawer.tsx`, `ProductDetailPanel.tsx`, `ShopperProfilePanel.tsx`, `SessionTimelinePanel.tsx`, `detail-formatters.ts` (all new) · `hooks/useAnalyticsDetail.ts` (new) · `ProductPerformanceCard.tsx`, `TopShoppersCard.tsx`, `EventDetailsDrawer.tsx` (entry points only) · web types if gaps. 5. **Must not change:** `useAnalyticsTabData.ts` (**P5-A11 — explicitly untouched**) · any server file · any tab's existing card behaviour · schema. 6. Render only. 7. **Steps:** build the drawer shell with portal/Escape/focus-trap/scroll-lock following `EventDetailsDrawer`; build `useAnalyticsDetail` keyed by `(kind, projectId, entityId, scopeKey)` with a request-id staleness guard; wire URL state (P5-A13); add entry points; implement the three panels with every §13 disclosure. 8. Presentation only; **no client-side metric computation**. 9. None. 10. N/A. 11. Rapid open/close/reopen (stale response must not paint) · scope change while open (refetch, and lifetime fields stay lifetime) · deep link to a nonexistent entity → `empty` state · 404 → error state with retry · truncated timeline → disclosed · very long merchant strings → escaped and truncated · drawer on ~375 px. 12. No new server types. 13. §13. 14. loading / error+retry / empty / available, each distinct. 15. No statement change. 16. Browser matrix: {product, shopper, session} × {available, empty, unavailable, error} × {24h, 30d, custom-long, all} × {all-projects, single} · ~375 px · **a11y: `role="dialog"`, `aria-modal`, labelled heading, Escape closes, focus trapped, focus returns to the trigger** · keyboard-only walkthrough. 17. None. 18. typecheck · build · lint · `git diff --check` · `git status`. 19. Every §13 disclosure renders exactly under its condition; values match the payload verbatim; Back closes the drawer; deep links restore; `useAnalyticsTabData` diff is empty. 20. R1 a stale drilldown response painting over a newer one → request-id guard + explicit test. R2 merchant strings breaking layout or injecting markup → escape, truncate, `title`. R3 nested drawers → P5-A14 forbids stacking. 21. `feat: add analytics drilldown drawer and detail panels`

### 5F — `feature/session-quality-card`

1. `feature/session-quality-card` 2. Render C-a on the Shoppers tab. 3. **Deps:** 5D **and Phase 3E merged — satisfied at `861753d`** (this branch edits `tabs/ShoppersTab.tsx`, which 3E rewrote). 4. **Changes:** `analytics/shoppers/SessionQualityCard.tsx` (new), `tabs/ShoppersTab.tsx` (compose the card), web types if gaps. 5. **Must not change:** any other Shoppers card's behaviour · other tabs · any server file · `detail/**` · schema. 6. Render only. 7. **Steps:** stat row for median events, median duration, sessions per shopper; disclose the unattributed-session count; place per blueprint Part 6 ("Shoppers, lower" — after B4 Top Shoppers). 8. Presentation only. 9. None. 10. N/A. 11. Null medians → "—" with the qualifying-count note · zero qualifying sessions → unavailable state naming `sessionId` · unattributed count > 0 → shown · duration 0 rendered as `0m`, **not** "—" (a measured zero). 12. No new server types. 13. §13. 14. available / unavailable. 15. No statement change. 16. Rendered case list; ~375 px; a11y. 17. None. 18. As 5E. 19. Card sits below B4 per Part 6; null vs zero visually distinguishable; unattributed count present; no 3E-owned behaviour altered. 20. R1 merge conflict with 3E → **resolved: 3E is merged at `861753d`**; rebase on `main` before starting. R2 rendering a real 0 as "—" → acceptance item. 21. `feat: render session quality metrics on shoppers tab`

### 5G — `feature/phase5-benchmark-extension`

1. `feature/phase5-benchmark-extension` 2. Extend the harness to entity-keyed detail targets; measure Phase 5; cut the Phase 5 baseline. 3. **Deps:** 5A–5F merged. **Phase 3F is merged (`a91809c`) — this dependency is satisfied**; the id tuple is `[1 … 28]` and `phase-3-3e945a6-medium` is the current same-manifest baseline of record. Query-id assignment follows §15's decided table for whichever ordering holds relative to Phase 4. 4. **Changes:** `benchmark-types.ts` (detail dimension), `explain-types.ts` (id tuple), `explain-query-registry.ts`, `run-benchmarks.ts`, `explain-analytics.ts`, **`seed-benchmark-data.ts` (step 2 only)**, `benchmarks/baselines/analytics/`. 5. **Must not change:** any `apps/server/src/**` or `apps/web/**` · existing baselines (additive only) · the bench guard rules. 6. Benchmark artifacts only. 7. **Two ordered steps per §15.** 8. N/A — measurement only; **no metric may change**. 9. No production SQL; EXPLAIN read-only in a transaction with rollback. 10. Bench guard unchanged (`*bench*` DB only, `NODE_ENV !== production`, mutation counts identical before and after). 11. **If step 1 shows a pre-existing-tab regression, stop and report before touching the seeder.** Representative entities must resolve deterministically from the manifest, or cells are not reproducible. 12. N/A. 13. N/A. 14. N/A. 15. Records final counts: **Shoppers 5 + span**; detail endpoints 1 / 2 / 3 statements; all other tabs unchanged. 16. Runner correctness assertions incl. the new `status` discriminants (`available` / `empty` / `unavailable`) and truncation metadata. 17. Register the seven ids **after reading the live tuple** per §15's decided table (**#29–#35** today; #33–#39 if Phase 4's 4G lands first); add D3's trend to the `range === "all"` granularity special-case list in `explain-analytics.ts`; bump the two literal CLI/help strings. 18. `bench:typecheck` · `bench:run` · `bench:explain` · `bench:compare` · typecheck · build · lint · `git diff --check`. 19. Both steps in order; the detail dimension is reproducible across reseeds; new baseline committed with **all priors retained**; cross-manifest caveat recorded; every budget breach filed as a finding with **no optimisation proposed**. 20. R1 conflating pre/post-seeder timings → the two-step order is the mitigation. R2 non-deterministic representative entities → resolve from the seeded manifest, never by `ORDER BY COUNT(*) LIMIT 1` at run time. 21. `feat: extend analytics benchmarks to phase 5 drilldowns`

## 18. Stop conditions

Stop and report if: a drilldown cannot be tenant-scoped through `AnalyticsScope` fragments · a session or shopper identity proves ambiguous in real data (two non-null `customerId`s on one `(projectId, sessionId)`) · C-a's session count exceeds distinct `(projectId, sessionId)` in any scope · any Phase 5 query approaches the worst measured surface in the system — `#21 sales-comparison` at **7,611 ms** (`phase-3-3e945a6-medium`) · `shoppers:all:all` exceeds **3,000 ms median** in 5G step 1 (D5-3) · a schema, migration, or index appears necessary · a shipped Phase 1–4 metric would need semantic modification · B5's orders/GMV disagree with B4 for the same customer and range · D3's funnel totals disagree with D1 for the same product and range · a correlated `SubPlan` with loops appears in any plan · the detail endpoint would need to return data the tab endpoint already returns (a sign the split is wrong) · 5G step 1 reveals a pre-existing-tab regression · truncation would silently drop rows without a count.

## 19. Out of scope

D4's ranked stock-out card (unscheduled — §1) · H1 cohorts (Phase 7) · G-series segmentation/search/device (Phase 6) · L2 CSV export (Phase 6) · K2 digest, J1/J2 alerts (Phase 8) · I1/I2 (Phase 8; I2 is a write path) · product-level correlation insight rules (blueprint: "later") · session replay, heatmaps, identity enrichment (never-build) · session re-segmentation from raw timestamps (EventPulse trusts the merchant's `sessionId`) · `occurredAt`, batch ingestion, SDK, async processing · LTV, refunds, cancellations · any new index, rollup, cache, materialized state, normalized table, or schema change · queues/workers/cron/webhooks/Redis/new services · optimising inherited Phase 2/3/4 debt · changing any shipped Phase 1–4 metric value or field name · modifying `useAnalyticsTabData` · a shared server↔web types package (decision 11 — the MIRROR rule still applies).

## 20. Verification strategy (Phase 9 absent)

Per branch: **real ingest-API fixtures** (extending the Phase 2/3/4 scripts, persisted in the scratchpad, pasted in the PR, reused by later branches) · **independent SQL cross-checks** for every median, count, and rate · **reconciliation against shipped surfaces** — B5 vs B4, D3 vs D1 — which is Phase 5's strongest correctness signal and cheaper than any fixture · **payload byte-diffs** proving untouched tabs are identical · **cross-tenant fixtures** and **cross-project identifier collisions** (3,000 real cases exist in bench) · **boundary timestamps** (range edges, sessions straddling boundaries) · **`EXPLAIN (ANALYZE, BUFFERS)`** for every new statement, asserting the expected index and no `SubPlan` with loops · **benchmark runner** correctness assertions · **browser + a11y checks** for UI branches, including a keyboard-only drawer walkthrough. Every PR labels each claim **runtime verified**, **inspection only**, or **not verified** (standards §18.7). These matrices become Phase 9's first golden tests.

## 21. Completion criteria

1. D3, B5, C-b, C-a implemented per §5, each verified against independent SQL.
2. B5's orders/GMV reconcile exactly with B4; D3's funnel totals reconcile exactly with D1.
3. **C-a's session count equals distinct `(projectId, sessionId)` in every scope** — the +31.7% grouping bug cannot ship. Its divergence from `shopperSummary.uniqueSessions` (§0.4a) is filed as a finding, and neither metric is changed to match the other.
4. Every drilldown key is `(projectId, entityId)`; no cross-project merge, proven against the 3,000 colliding customer ids.
5. Lifetime and range-scoped fields are separated, labeled in the payload, and labeled in the UI.
6. C-b returns the complete session, never range-clipped, and says so.
7. Tenant isolation via centralized scope fragments only; `getEventsController`'s ad-hoc predicate is not imitated; cross-tenant fixtures pass.
8. Truncation is capped, counted, and disclosed everywhere; no silent cut.
9. `empty`, `unavailable`, and 404 remain distinguishable (P5-A15).
10. Statement counts: **Shoppers 4 → 5 + span**; all other tabs unchanged; detail endpoints 1/2/3.
11. Performance: drilldowns within 50/150 ms p95; C-a passes 5D's plan-shape gate and its breach is filed as a finding and **not** optimised; `shoppers:all:all` stays at or below the 3,000 ms escalation threshold, or 5G stops and reports; zero correlated subplans; no index added.
12. Payload regression: Overview, Conversion, Sales, Products, Behavior byte-identical; Shoppers changed only additively; Phase 1–4 field names and values unchanged — **specifically, AOV remains `gmv ÷ moneyBearingOrders` with its shipped basis note**.
13. Frontend: every disclosure renders exactly under its condition; a11y and ~375 px pass; `useAnalyticsTabData` untouched; no client-side metric computation.
14. Benchmark: ids read from the live tuple and assigned per §15's table; the granularity special-case list and both CLI help strings updated; the detail dimension reproducible from the seeded manifest; `validateDetailPayload` asserts the discriminants and truncation invariants; two-step executed in order against `phase-3-3e945a6-medium`; new baseline committed with all priors retained.
15. No schema, migration, index, rollup, cache, dependency, or endpoint beyond `/api/analytics/detail` added anywhere in the diff range.
16. Every branch: typecheck, build, lint, `bench:typecheck`, `git diff --check` green, with honest verification labelling.

---

## 22. DEFERRED / DECIDE LATER

**Five items.** Everything else in this document is decided. Each states why it cannot be settled today, **when** it will be decided, what evidence decides it, which branch it blocks, and a **recommended default** so implementation never stalls waiting for an answer.

Two items from the pre-3F draft are now **resolved and removed**: benchmark query IDs (3F registered #26–#28; §15 carries a decided assignment table) and 5F's Phase 3E dependency (3E merged at `861753d`). The C-a budget item has been re-scoped — the *ship decision* is now made in §11, leaving only the *measurement* deferred.

---

### D5-1 — Timeline / session-list truncation cap
- **Why it cannot be decided now:** the cap must be justified by real entity sizes, and **no available dataset exercises them**. Bench maxes at **12 events per session** and **3 sessions per shopper**; dev maxes at **4** (§0.5). Any number chosen today would be asserted, not measured — and the whole point of the cap is to bound a case neither dataset contains.
- **When it will be decided:** at **5G step 2**, the only point at which a large entity exists to measure.
- **What evidence decides it:** payload size, drawer scroll behaviour, and query time against the seeded long session and high-activity shopper. Real customer data would resolve it better still.
- **Blocks:** 5A acceptance (final value) and 5E's scroll/disclosure behaviour. **Does not block starting 5A.**
- **Recommended default:** **cap 500 entries, query `LIMIT 501`** to detect truncation without a second `COUNT`, with `returned`/`total`/`truncated` in the payload and an explicit UI note. 500 events at ~200 bytes each is ~100 KB, comfortably under the 51,200-byte p95 *payload hypothesis* only if trimmed — so ship the timeline with a **reduced property projection** (id, name, createdAt, and a commerce-step flag) and load full `properties` only for an expanded entry. Revisit the number in 5G with measurements; changing a constant is cheap, changing the payload shape later is not.

---

### D5-2 — C-a's real cost as a fifth concurrent statement on the Shoppers tab
- **Why it cannot be decided now:** the **ship decision is already made** (§11 — C-a ships, with a 5D plan-shape gate). What cannot be decided is the *measured concurrent cost*, and this is a tooling limit, not a judgement call: **F-P3F-06 states the HTTP runner records tab wall time but not per-statement timings, so pool wait and statement share cannot be quantified**, and standalone EXPLAIN is sequential and "cannot reproduce `Promise.all` connection-pool contention". C-a's 354 ms standalone therefore cannot be added to the tab's 2,003 ms to predict anything. F-P3F-08 compounds it: an immediate repeat moved Shopper medians by 21.97–32.80%.
- **When it will be decided:** at **5G step 1**, which runs the full Shoppers ladder with C-a present against the same manifest as `phase-3-3e945a6-medium`.
- **What evidence decides it:** the `shoppers:*` HTTP cells in 5G step 1 compared against the baseline's `single:24h 121 ms → all:all 2,003 ms` ladder, plus C-a's own EXPLAIN target.
- **Blocks:** nothing. 5D ships behind its own plan-shape gate; this is a measurement, not a gate on writing the code.
- **Recommended default / escalation:** **ship C-a and file the result as a finding** (`F-P5E-xx`), per P3-P4 and the precedent of F-P3F-02/04, which declined optimisation on exactly this tab. **Pre-declared escalation:** if 5G step 1 measures `shoppers:all:all` above **3,000 ms median** (≈1.5× the current baseline), stop and report before 5F ships UI — do not silently accept it, and do not optimise inside the branch. A separately-approved optimisation branch for the Shoppers tab as a whole is the correct response, since three of the four existing statements already dominate the cost.

*(The previous D5-2 — benchmark query IDs — is **resolved**: Phase 3F merged and registered #26–#28, so the tuple is `[1 … 28]` and §15 now carries a decided assignment table for both possible orderings relative to Phase 4.)*

---

### D5-3 — B5 drawer versus a dedicated shopper page
- **Why it cannot be decided now:** this is a **product decision** about the investigation workflow, and the blueprint deliberately leaves it open — §B5 says "**drawer/page**". The right answer depends on how much a support or fraud investigation needs on screen at once, which no repository evidence settles.
- **When it will be decided:** at **5E**, or after B5 has been in use — whichever comes first.
- **What evidence decides it:** owner preference, or observed investigation workflows once B5 ships.
- **Blocks:** 5E's layout only. The backend (5B) is identical either way — the payload does not change.
- **Recommended default:** **ship the drawer.** It is consistent with C-b and D3, it reuses one a11y implementation (P5-A12), and the URL-state decision (P5-A13) already makes a drilldown deep-linkable and shareable — which is most of what a dedicated page would buy. Promoting the drawer to a page later is a pure presentation change against an unchanged payload.

---

### D5-4 — Session outcome badge vocabulary
- **Why it cannot be decided now:** §3 row 11 establishes that **no outcome vocabulary exists in the contract** — the badge is EventPulse-derived. The five-value set proposed in §5 is a reasoned default, not a contract fact, and a merchant-visible label set is partly a product decision.
- **When it will be decided:** at **5A review** (the union is defined there), or from feedback after C-b ships.
- **What evidence decides it:** owner review of the five labels against real session shapes.
- **Blocks:** 5A's payload `SessionOutcome` union (a string-literal union, so widening it later is a typed, safe change).
- **Recommended default:** **ship the five values in the stated precedence** — `purchased` → `payment-failed` → `checkout-abandoned` → `cart-abandoned` → `browsed` — computed from existing funnel aliases and order facts, and **labeled in the UI as derived by EventPulse**. Precedence guarantees exactly one badge per session. Adding a value later is additive; changing the *meaning* of a shipped value would not be, so the definitions are recorded in §5 as binding.

---

### D5-5 — D4 Stock-out Impact is unscheduled in the blueprint
- **Why it cannot be decided now:** this is a **gap in an authoritative document**, not an engineering choice. Blueprint Part 7 assigns D4 to no phase and Part 8's "build later" list does not name it, yet §D describes it as a quick-commerce differentiator. Assigning it to a phase unilaterally would be inventing roadmap.
- **When it will be decided:** whenever the owner next amends the blueprint — it is not on any Phase 5 critical path.
- **What evidence decides it:** an owner ruling placing D4 in Phase 5, 6, or the postponed pool.
- **Blocks:** nothing in Phase 5. D3 already ships per-product stock-out **counts**, which is what its `M:` field specifies.
- **Recommended default:** **do not build D4's ranked card in Phase 5.** Ship D3's stock-out counts as specified and report the gap. If the owner wants D4 in Phase 5, it is a small additive branch (`5H`) reusing `COMMERCE_FRICTION_ALIASES.outOfStock` and the Products ranked-table idiom — the 720 seeded `item_out_of_stock` events make it immediately measurable.

---

*Prepared read-only and reconciled on 2026-08-25. Drafting began at HEAD `0eac1fa` with Phase 3E uncommitted; the repository moved twice during planning as a parallel agent merged Phase 3E (`861753d`), committed the Phase 4 document (`3e945a6`), and completed Phase 3F (`a91809c`). Every dependent claim was re-verified against the final state: HEAD `a91809c`, branch `main`, `HEAD == origin/main`, clean tree. Verification covered the repository source, the Prisma schema, the benchmark tooling and its findings register (F-0D5-01…12, F-P2E-01…09, F-P3F-01…08), the `phase-3-3e945a6-medium` baseline of record, and live read-only queries and EXPLAIN plans against `eventpulse_bench` (PostgreSQL 14.18, 549,864 events, manifest `8c97632d…` — the same dataset that backs the baseline).*

*No production code, frontend code, benchmark tooling, seeder, schema, or migration was written by any pass; no branch was created, switched, staged, committed, pushed, merged, reset, restored, stashed, or cleaned. Only `.claude/plans/phase-5-drilldowns-implementation-workflow.md` was modified.*

***All seven Phase 5 branches (5A–5G) are unblocked*** — Phase 3 is complete and Phase 5 is independent of Phase 4. Five items remain deferred (§22), none of which blocks starting any branch.*
