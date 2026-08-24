# EventPulse Phase 4 — Conversion Depth Implementation Workflow

**Status:** FINAL — verified against repository truth on 2026-08-25.
**Type:** Feature phase (analytics read-side, three tabs). No schema change, no migration, no index, no new dependency.

**Verified against (this revision):** branch `feature/shoppers-tab-ui` at HEAD `0eac1fa`, which is **identical to `main`** (`git log main..HEAD` and `HEAD..main` both empty). Phase 2 commits `877a444`, `9525b67`, `202cbf7`, `514bbd9`, `1c29cc6` and Phase 3A–3D commits `5c332d8`, `dee8f1a`, `b8fc5e3`, `0eac1fa` all confirmed present.

**Working-tree state at verification (do not disturb):** Phase 3E is in flight in this tree as **uncommitted** edits — modified `apps/server/src/analytics/shopperSummary.ts`, `apps/web/.../AnalyticsOverview.tsx`, `ShopperKpiRow.tsx`, `tabs/ShoppersTab.tsx`, plus untracked `apps/web/components/dashboard/analytics/shoppers/`. Phase 3E is therefore **not merged**. Phase 3F has not started. No Phase 4 branch may be cut from this dirty tree; cut from `main` at `0eac1fa` or later.

**Authority:** analytics blueprint §§E2, E3, F4, K1, I3 + Part 7 row 4 · Commerce Tracking Contract §§2, 3, 5 Tier 2, 7, 8 · engineering standards §§8, 9, 11, 17, 18 · architecture book §20 decisions 4, 5, 9, 13, 14, 17, 21.

**Decision status:** all product and architecture decisions are **LOCKED** (§6). P4-O1, P4-O2 and P4-O3 are recorded as owner-approved. *(Reconciliation note: the previous revision contradicted itself — its header declared these locked while its trailing provenance line declared them open. The trailing line was stale, from a revision that also asserted a clean tree. This revision resolves to LOCKED; if that is wrong, only §6's three O-decisions need revisiting, not the surrounding architecture.)*

**Phase 2 semantics are preserved verbatim and are not re-opened by Phase 4.** In particular, shipped AOV is **not** "GMV ÷ all confirmed orders": it is `gmv ÷ moneyBearingOrders` for the selected currency (`sales.ts:372`), carried with the shipped basis note `across the ${moneyBearingOrders} orders with parseable amounts` (`sales.ts:435`). Orders lacking parseable money still count as confirmed Orders while being excluded from the AOV denominator. No Phase 4 branch may change that basis, that label, or any Phase 1–3 field name or value.

---

## 0. Repository-truth verification log (this revision)

Every claim below was re-derived from the working repository and the live `eventpulse_bench` database on 2026-08-25. Read-only throughout; no source file, seeder, schema, migration, or benchmark artifact was modified.

### 0.1 Confirmed — carried forward unchanged

| Claim | Evidence |
|---|---|
| `taxonomy.tier2Payment` = `[payment_attempted, payment_completed, payment_failed]` | `contract/taxonomy.ts:12` |
| `COMMERCE_FRICTION_ALIASES.paymentFailed` = `["payment_failed"]` | `contract/taxonomy.ts:185-186` |
| `ORDER_FACT_EVENT_NAMES` = `purchase_completed` + aliases `order_completed`, `checkout_completed`, `checkout.completed`, `order_placed` | `contract/orderIdentity.ts:15`, `taxonomy.ts:60-65` |
| `orderFactsCtes()` exposes `identity_representatives`, `money_representatives`, `currency_slices`; carries `customerId` | `analytics/shared/orderFacts.ts:23,32,56,121,171` |
| Scope fragments `currentEvent`, `currentAliasedEvent`, `priorToRangeEvent` exist | `analytics/analyticsScope.ts:52-54` |
| `trackingReadiness` is **one** statement; rung 7 detects `payment_attempted` + `payment_attempt_id`; already uses `COUNT(*) FILTER` | `analytics/trackingReadiness.ts:117-120,167-171`; 1 × `$queryRaw` |
| `healthInsights` is pure (0 SQL); exports `buildInsights` + `InsightType` | `analytics/healthInsights.ts:15,143` |
| `trend.ts` exports `resolveTrendGranularity`, `fetchTrendSpanDays` | `analytics/trend.ts:50,62` |
| `validate.ts` warns (observationally) on missing `payment_attempt_id` | `contract/validate.ts:171-177` |
| **No** `contract/paymentIdentity.ts`, **no** `analytics/payments.ts` | directory listing |
| Dominant-currency rule is `ORDER BY money_bearing_orders DESC NULLS LAST, currency ASC` | `analytics/sales.ts:516` — P4-O2 restates the shipped rule, it invents nothing |
| Dev seeder is contract-correct (`payment_attempt_id`, `payment_method`, `reason`) | `scripts/seedCommerceDemoData.ts:485-507` |
| Bench seeder emits non-contract `failure_reason`, no `payment_attempt_id` | `scripts/benchmark/seed-benchmark-data.ts:1091,1110` |
| `bench:typecheck`, `bench:run`, `bench:explain`, `bench:compare`, `bench:seed` exist | `apps/server/package.json` |
| `conversion` is **already** in `BENCHMARK_TABS` | `scripts/benchmark/benchmark-types.ts:1-8` — E2/E3 need **no** matrix-shape change |

**Statement counts re-derived by reading the composers (exact, not approximate):**

| Tab | Composer | Concurrent statements | Sequential pre-query |
|---|---|---|---|
| Overview | `buildOverviewSummary` (`summary.ts:210`) | `eventActivity` 9 all-projects / 8 single (stmt 9 at `eventActivity.ts:158` is all-projects-only) + `fetchTrend` 1 + `fetchPeriodComparison` 1 + `fetchTrackingReadiness` 1 + `buildOverviewSalesKpis` 1 = **13 / 12** | +1 span when all-time |
| Conversion | `buildConversionSummary` (`summary.ts:237`) | `commerceFunnel` 1 + `sessionFunnel` 1 = **2** | none today |
| Sales | `buildSalesAnalytics` (`sales.ts:1229`) | headline 1 + comparison 1, **+1 trend only when orders are available and granularity is non-null** = **2–3** | +1 span when all-time |
| Shoppers | `buildShoppersSummary` (`summary.ts:282`) | **4** | +1 span when all-time |
| Products | `buildProductsSummary` (`summary.ts:251`) | **4** | none |

### 0.2 Corrections applied to the prior draft

- **C1 — Benchmark query IDs #26–#28 do not exist yet.** `ANALYTICS_QUERY_IDS` is `[1 … 25]` (`explain-types.ts:12-15`) and the registry's last entry is `id: 25` `category-line-items` (`explain-query-registry.ts:265`). #26–#28 are registered by **Phase 3F** (`feature/shopper-benchmark-extension`, Phase 3 workflow §3F step 2), which has not started. **Consequence: 4G has a hard dependency on 3F** — corrected in §14 and §15, where the prior draft wrongly stated Phase 4 depends on neither 3E nor 3F.
- **C2 — F4-a is measurable on the current benchmark dataset; the prior §4 verdict was wrong in the merchant's favour.** The bench seeder sets `payment_method` inside `if (isPurchaseEvent)` (`seed-benchmark-data.ts:1064,1091`) where `PURCHASE_EVENT_NAMES = ORDER_FACT_EVENT_NAMES ∪ {payment_completed}` (`:211-214`). Live count: `purchase_completed` **3367/3367** and `order_placed` **4/4** carry `payment_method`. Because F4-a reads the method from the **order identity representative** (an order-fact event), orders-and-GMV-by-method works today. The real gap is the mirror image: **no order fact lacks a method**, so the `Unknown`-bucket path — an explicit P4-O2 acceptance criterion — is entirely unexercised. Step 2 of 4G must therefore **remove** `payment_method` from a deterministic slice of order facts, not merely add fields.
- **C3 — `order_id` coverage on `payment_completed` is 2,710, not 2,730.** Corrected in §4.
- **C4 — Owner-decision status contradiction** between the old header and old footer: resolved to LOCKED (see header note).
- **C5 — Broken cross-references:** §1 pointed at "§19" for out-of-scope (it is **§18**); branch 4B step 16 pointed at "§16" for its own case list (it is **§5/§19**). Fixed.
- **C6 — Mis-citation:** P4-A2's prohibition on re-deriving order dedup is governed by architecture decisions **13** (confirmed order identity) and **14** (GMV dedup: one amount per distinct order), not 17. Decision 17 (incremental shared module, three-consumer rule) governs **P4-A1** instead. Both corrected in §6.
- **C7 — Sales statement arithmetic:** the tab runs **2–3** concurrent statements today (not "~3–4"), so after F4's +2 it is **4–5**, not "5–6". Corrected in §10 and §20.
- **C8 — Staleness:** "clean tree" no longer holds (§ header), and "4A may begin as soon as Phase 3A is merged" is trivially satisfied — 3A merged at `5c332d8`. 4A is unblocked **now**, subject only to not cutting from the dirty 3E tree.

### 0.3 New measured evidence (live `eventpulse_bench`, read-only)

Dataset shape: **549,864** events · **110,199** distinct sessions · **27,436** null-session events · **6** projects · span **2026-05-13 → 2026-08-11** (~90 days).

Payment / order-fact field coverage:

```
event              rows  attempt_id  method  reason(contract)  failure_reason  order_id  null customer  null session
payment_attempted  5523       0         0           0                0           1783        410            270
payment_completed  3359       0      3359           0                0           2710        289            174
payment_failed     2831       0         0           0             2831            785        216            117
purchase_completed 3367       0      3367           0                0           2718        249            160
order_placed          4       0         4           0                0              4          0              0
```

E3 feasibility (full alias sets, sessions with both anchors):

```
sessions_with_view 46975 · sessions_with_order 3200 · qualifying_both 3039
positive_duration   3038 · non_positive 1 · median 7.50 minutes
```

E2 feasibility (session reach):

```
reached_cart 22031 · reached_checkout 8668 · reached_order 3200 · sessions_with_payment_failure 2714
```

**What this changes.** The prior draft treated the whole of F4 as unmeasurable before a seeder change. Measured truth is narrower and better:

| Metric | Measurable on today's bench dataset? |
|---|---|
| **E2** abandonment over time | **Yes, fully** — all three reach levels populated; payment line resolves to the session-fallback rung |
| **E3** time to convert | **Yes, fully** — 3,039 qualifying sessions, median 7.50 min; the non-positive exclusion path is exercised by exactly **1** session (thin but non-zero) |
| **F4-a** orders/GMV by method | **Yes** — method present on 100% of order facts; **`Unknown` bucket unexercised** |
| **F4-b** failure rate | **Session-fallback rung only** — zero `payment_attempt_id` anywhere; attempt-id rung and per-method failure rate unexercised |
| **F4-c** failure reasons | **`not_provided` path only** — contract `reason` absent on all 2,831 failures |
| **I3 / K1** | **Yes** — computed from fields already present |

So 4G **step 1 is a genuinely broad measurement pass**, not a placeholder, and step 2's seeder change is required for exactly four things: (a) `payment_attempt_id` across the payment family, (b) contract `reason` replacing `failure_reason`, (c) a deterministic slice of order facts with **no** `payment_method` (exercises `Unknown`), (d) multi-attempt and conflicted-attempt orders. This is recorded as the binding step-2 scope in §14.

---

## 1. Authoritative Phase 4 scope

**Blueprint Part 7, row 4 (verbatim):** `| **4** | Conversion depth | E2, E3; K1 rule expansion incl. I3 data-quality rules; F4 Payments Analysis | M |`

Platform roadmap begins at Phase 9 — no numbering conflict. Phase 4 spans **three tabs**.

| ID | Feature | Blueprint `M:` field (verbatim) | Tab |
|---|---|---|---|
| **E2** | Abandonment Over Time — MVP | "per bucket: cart-abandonment, checkout-abandonment, payment-failure rates (failure rate obeys §F4 denominator rules)" · D: session funnel × trend bucketing | Conversion |
| **E3** | Time to Convert — Advanced | "within-session median/p75 minutes; distribution buckets" · D: sessionId timestamps | Conversion |
| **F4** | Payments Analysis — MVP | "orders/GMV by `payment_method`; **failure rate only with a trustworthy denominator**: preferred distinct `payment_attempt_id`; fallback distinct sessions containing payment_completed-or-failed; otherwise failure **counts only, no rate**. Failure `reason` breakdown." | Sales (blueprint "Revenue") |
| **K1** | Expanded Rule Library — MVP | "payment-failure-by-method spike, stock-out → lost-session correlation, abandonment deterioration, coupon dependency, shopper concentration, data-quality gaps (I3)" | Overview (A3) |
| **I3** | Data Quality Rules — Advanced | five event-specific percentages (product_id, order_id/amount/currency, payment_method, unknown names, pre-session events) | Overview (feeds A3) |

**Scope correction — recovery/retry analytics is NOT in Phase 4.** F4's authoritative definition contains no recovered-orders metric, no retry count, and no attempt-sequence analysis. Building them would invent scope. Recorded as out-of-scope (§18) and, if wanted, a future blueprint amendment.

**Excluded (later phases):** E4 custom funnel builder (postponed pool) · F5 coupon impact (Phase 7) · K2 digest (Phase 8) · K3/K4 (never) · **I1/I2 (Phase 8 — I2 is the roadmap's only new write path)** · D3/B5/C-b drilldowns (Phase 5) · G-series (Phase 6) · H1 cohorts (Phase 7) · refunds (postponed pool).

## 2. What Phases 1–3 already provide

| Surface | State (verified) | Phase 4 use |
|---|---|---|
| `contract/taxonomy.ts` | `tier2Payment: [payment_attempted, payment_completed, payment_failed]`; `COMMERCE_FRICTION_ALIASES.paymentFailed` | Reuse as the payment family source |
| `contract/orderIdentity.ts` | `ORDER_FACT_EVENT_NAMES`, `ORDER_COUNT_BASIS`, fallback label | Reuse for **order-grain** F4 metrics only |
| `shared/orderFacts.ts` (3A) | `orderFactsCtes()` — identity + money representatives, carries `customerId` | Reuse for orders/GMV by method |
| `analyticsScope.ts` | 9 fragments incl. `priorToRangeEvent` (3C) | Reuse; **no new fragment needed** (§9) |
| `trackingReadiness.ts` | 1 statement, rung 7 detects `payment_attempted` + `payment_attempt_id` | **I3 merges into this statement (+0 Overview statements)** |
| `healthInsights.ts` | `buildInsights(params)` pure, `InsightType` union | K1 extension point |
| `sessionFunnel.ts` | Range-level abandonment counts | E2's per-bucket template (do not overload) |
| `trend.ts` | `resolveTrendGranularity`, `fetchTrendSpanDays` | E2 bucketing |
| `validate.ts` | Warns on missing `payment_attempt_id` (observational) | I3 read-time analogue |
| **Payment identity module** | **Does not exist** | 4A creates `contract/paymentIdentity.ts` |
| **Analytics consuming attempt identity** | **None** (only readiness detects presence) | New in 4A |

**Statement counts (re-verified 2026-08-25 by reading the composers — see §0.1 for the full table):** Overview **13** all-projects / **12** single (`eventActivity` 9/8 + trend + comparison + readiness + salesKpis), + a sequential all-time span pre-query · Conversion **2** · Sales **2–3** concurrent (trend is conditional) + span · Shoppers **4** + span · Products **4**.

## 3. Tracking-contract audit

Classification: **CG** = contract-guaranteed · **OC** = observed convention · **SD** = seeded-data only · **UN** = unsupported.

| # | Question | Answer | Class |
|---|---|---|---|
| 1 | Which events constitute a payment attempt? | `payment_attempted` (contract §5 Tier 2). Attempt identity = `payment_attempt_id`, **R on `payment_attempted` only** | **CG** |
| 2 | Successful payment? | `payment_completed` — "the payment success fact — **distinct from the order fact**" (§2) | **CG** |
| 3 | Failed payment? | `payment_failed` | **CG** |
| 4 | Can one `order_id` have multiple attempts? | Yes — §3: "One id per attempt; **retries are new attempts**" | **CG** |
| 5 | Can one `payment_attempt_id` appear in multiple events? | Yes — Rec on `payment_completed`/`payment_failed`, so attempt→outcome linkage is expected but not guaranteed | **CG (as recommended)** |
| 6 | Can success follow failures? | Semantically yes (retries = new attempt ids). **No dataset produces it** | **CG** semantics / **UN** in data |
| 7 | Failures without `order_id`? | Yes — `order_id` is only Rec on `payment_failed`. Bench: 785/2,831 have it | **CG** |
| 8 | Attempts without `customerId`? | Yes — envelope requires it for *new* events, but legacy/null rows exist. Bench: 410 null on `payment_attempted` | **CG** |
| 9 | Method/provider fields? | `payment_method` (Rec on all three). **No provider field exists anywhere** | **CG** for method; **UN** for provider |
| 10 | Failure reason standardized? | **No.** §5: "`reason` suggested enum (**free-form accepted**)" | **CG that it is NOT normalized** |
| 11 | Refunds in Phase 4? | No — postponed pool; Tier 5 accumulates data only | **CG** |
| 12 | Retries/recovery derivable honestly? | **No** — not in F4's definition, and no dataset exercises it | **UN** |

**Consequences that bind the design:** (a) attempt identity is contract-real, so `(projectId, payment_attempt_id)` is a legitimate grain; (b) because attempt ids are only *recommended* on outcome events, a meaningful share of failures may be unlinkable — the denominator ladder exists precisely for this; (c) **no canonical failure-reason vocabulary exists**, so a normalized categorical chart is not contract-supported; (d) there is no payment-provider concept — do not invent one.

## 4. Benchmark-dataset audit (re-queried live against `eventpulse_bench`, 2026-08-25)

```
event              rows  attempt_id  method  reason(contract)  failure_reason  order_id  null customer
payment_attempted  5523       0         0           0                0           1783        410
payment_completed  3359       0      3359           0                0           2710        289
payment_failed     2831       0         0           0             2831            785        216
purchase_completed 3367       0      3367           0                0           2718        249
order_placed          4       0         4           0                0              4          0
```

The prior revision omitted the **order-fact rows**, which is precisely where F4-a reads its method. Including them inverts one of its conclusions (§0.2 C2).

| Scenario | Status |
|---|---|
| Successful / failed attempts exist | **Sufficient** (3,359 / 2,831) |
| `payment_method` on **order facts** (F4-a's actual source) | **Present on 100%** (3,371 / 3,371) — F4-a is measurable today |
| `Unknown` method bucket (order fact **without** a method) | **ABSENT (0)** — a P4-O2 acceptance path is unexercised |
| `payment_attempt_id` anywhere | **ABSENT (0 of 8,354)** — preferred denominator unmeasurable |
| `payment_method` on `payment_attempted` / `payment_failed` | **ABSENT** — per-method failure rate unmeasurable |
| Failure reason under contract key `reason` | **ABSENT** — seeder emits non-contract `failure_reason` on all 2,831 |
| Multiple attempts per order / failure→success | **ABSENT** |
| Payment without `order_id` | Present (attempted 3,740; failed 2,046) |
| Payment without `customerId` | Present (410 / 289 / 216) |
| E2 session reach (cart 22,031 · checkout 8,668 · order 3,200 · failure 2,714) | **Sufficient** |
| E3 qualifying sessions (3,039; 1 non-positive; median 7.50 min) | **Sufficient**, non-positive path thin |
| Mixed currencies, malformed money, cross-project ids | Present (Phase 2E) |

**Verdict: a benchmark-seeder change is still mandatory, but for a narrower and better-specified reason than previously stated.** E2, E3, F4-a, I3 and K1 are all measurable on the unchanged dataset; only F4-b's attempt-id rung, F4-c's real reasons, and F4-a's `Unknown` bucket are not. The four required step-2 changes are enumerated in §0.3 and bound in §14.

The dev seed (`seedCommerceDemoData.ts`) is by contrast **contract-correct** — it emits `payment_attempt_id`, `payment_method`, and `reason` on all three events — so F4 is demoable and fixture-testable on dev data immediately. One dev-seed caveat: `paymentAttemptId = 'pay_${sessionId}'` makes attempt ≈ session (degenerate 1:1), which would mask a denominator-grain bug; fixtures must add a true multi-attempt order.

Because the seeder must change, **Phase 2E rules apply**: manifest identity changes, direct timing comparison against the Phase 3 baseline is invalidated, a new baseline of record is cut and all priors retained. 4G is therefore explicitly two-step.

## 5. Metric-by-metric semantics

**The mixed-grain prohibition (binding).** F4 contains two different grains. They must never divide into one another. Specifically **forbidden**: `successful orders / payment attempts`, `failed attempts / orders`, or any ratio whose numerator and denominator differ in grain. Each rate below states one grain for both halves.

### F4-a — Orders and GMV by payment method (**order grain**)
- **Question:** which methods carry the business?
- **Grain:** `(projectId, order_id)` via `orderFactsCtes` identity representatives.
- **Numerator/denominator:** counts and per-method GMV sums; share = method orders ÷ all confirmed orders in scope (same grain).
- **Method source:** `payment_method` on the order's **identity representative**; missing → `Unknown`, **included** in the share denominator (a tracking gap must not be hidden by shrinking the denominator).
- **Money (P4-O2, locked):** GMV per method in the **dominant currency only** (Phase 2 convention: most money-bearing confirmed orders, ties by currency ASC), explicitly labeled, with an excluded-order count. Never combined, never converted.
- **Two bases in one table, deliberately (P4-O2, locked):** the `orders` and `orderSharePercent` columns count **all confirmed orders** in scope regardless of whether trustworthy money exists; the `gmv` column covers only money-bearing orders in the dominant currency. The columns therefore have different denominators by design, and the UI must label them so. A parseable `0`/`0.00` is measured zero and contributes to GMV; missing/malformed/other-currency money is excluded and counted, never zero.
- **Basis:** confirmed orders only. If no confirmed orders → unavailable, rung-4 unlock copy.

### F4-b — Payment failure rate (**attempt grain, with a declared ladder**)
- **Question:** how often do payments fail?
- **Ladder (blueprint-mandated, in order):**
  1. **`attempt-id`** — failed attempts ÷ distinct `(projectId, payment_attempt_id)` in scope.
  2. **`session-fallback`** — sessions containing `payment_failed` ÷ sessions containing `payment_completed` **or** `payment_failed`. Labeled.
  3. **`counts-only`** — failure **counts**, **no rate emitted**.
- Each rung is internally single-grain. The chosen rung travels in the payload as a discriminant; the UI must render its label.
- **Per-method failure rate** is computed only on the `attempt-id` rung (method must exist on the attempt); on other rungs it is unavailable, not approximated.

### F4-c — Failure reason breakdown (**event grain, raw** — P4-O1 locked)
- **Grain:** `payment_failed` events. Reason = `LOWER(BTRIM(properties->>'reason'))` — exact-match grouping only; missing/empty → `not_provided`, surfaced and counted.
- **Contract field only:** read **`reason`**. The non-contract `failure_reason` key must never appear in application code (§6 P4-O1).
- **No invented categories:** no synonym mapping, no bucketing, no catch-all absorbing distinct strings. Top-N plus a **counted, labeled remainder** is the only permitted truncation.
- **Labeling:** rendered as raw, unstandardized reasons as reported by the store/provider; the UI must never imply EventPulse normalized them.

### E2 — Abandonment over time (**session grain, bucketed**)
- Per bucket: cart-abandonment = sessions reaching cart but not checkout ÷ sessions reaching cart; checkout-abandonment = reaching checkout but not order-fact ÷ reaching checkout; payment-failure rate **reuses F4-b's ladder verbatim and its basis label**.
- **Session-to-bucket rule:** each session is assigned to the bucket of its **first in-range event**, so a session contributes to exactly one bucket and per-bucket rates stay internally consistent.
- Rates are `null` (never 0) when a bucket denominator is 0.

### E3 — Time to convert (**session grain**)
- Start = earliest product-view-alias event in the session; end = earliest **order-fact** event in the session (not `payment_completed` — Phase 2 separated the payment fact from the order fact).
- Duration in minutes; median and p75 via `PERCENTILE_CONT`; fixed distribution buckets.
- Sessions missing either anchor, and non-positive durations, are **excluded and counted**. Percentiles are `null` below a stated minimum qualifying-session count.

### I3 — Data-quality rules (**event grain, five percentages**)
Each percentage has its own denominator (events of that type in scope) and is **`null` when that denominator is 0** — never 0%.

### K1 — Rule expansion (**pure, no SQL**)
New rules over plain-data inputs: payment-failure-by-method spike, abandonment deterioration, data-quality gaps. Every rule cites real numbers, labeled rule-based, no AI/predictive wording. A rule never fires on an unavailable input.

**Universal rules for all Phase 4 metrics:** tenant/range scope exclusively via `AnalyticsScope` fragments · `(projectId, …)` identity, never merged across projects · null-not-zero · every unavailable state names its unlocking fields · no FX, no cross-currency summation.

## 6. Architecture decisions

### LOCKED by authoritative documents
1. Phase 4 = E2, E3, K1(+I3), F4 (Part 7 row 4).
2. Failure-rate denominator ladder and its order (F4 `M:` field).
3. Attempt identity exists and retries are new attempts (contract §3).
4. Failure `reason` is free-form, not normalized (contract §5).
5. No refunds, no recovery/retry analytics (postponed pool; absent from F4).
6. No provider dimension (no such contract field).
7. No FX; money is per-currency (contract §3).
8. No schema change (contract §3: no entity requires one).

### RESOLVED by me (repository evidence sufficient)

**P4-A1 — Payment identity placement: `contract/paymentIdentity.ts` (rules) + `analytics/payments.ts` (SQL).**
*Alternatives:* a `shared/paymentFacts.ts` mirroring `shared/orderFacts.ts`; or inlining everything in the feature module. *Selected* the split because identity *rules* are contract-level (mirroring the `orderIdentity.ts` precedent), while a shared **SQL** helper fails the three-consumer test of architecture decision 17 — F4 is the only SQL consumer, and K1 consumes payments' **built output as plain data**, exactly as `healthInsights` already consumes other modules' results. *Consequence:* one payment-identity definition; no premature shared-SQL abstraction; extraction to `shared/` remains available if a second SQL consumer ever appears.

**P4-A2 — F4-a reuses `orderFactsCtes`; F4-b/c do not.**
*Reasoning:* orders/GMV by method is genuinely order-grain, so re-deriving order dedup would fork Phase 2/3A semantics (architecture decisions 13 and 14 — confirmed order identity, and one amount per distinct order). Failure rate and reasons are attempt/event grain and have no order dependency — pulling the order CTE chain into them would drag unrelated work for nothing. *Consequence:* F4 is **two statements**, not one (§11), split along the grain boundary rather than for convenience.

**P4-A3 — I3 merges into the existing `trackingReadiness` statement (+0 Overview statements).**
*Alternatives:* a dedicated I3 statement. *Rejected* because Overview already runs 13 statements against a pool of 10 (F-P2E-04); `trackingReadiness` already scans `scope.sql.currentEvent` with `COUNT(*) FILTER (…) > 0`, and I3 needs `COUNT(*) FILTER (…)` percentages **over the same rows**. *Consequence:* Overview statement count is unchanged; rung booleans must be proven byte-identical.

**P4-A4 — No new scope fragment.** The nine existing fragments suffice: all Phase 4 queries are range-bounded (`currentEvent`/`currentAliasedEvent`). **No Phase 4 query reads outside the selected range** — a materially lower tenant-risk profile than Phase 3C. `priorToRangeEvent` is not used.

**P4-A5 — Set-based only; the Phase 3C prohibition is binding.** No correlated per-row `EXISTS`/`SubPlan` in any Phase 4 query. Note that `properties->>'x'` is a function on a JSONB column and **cannot** use any existing index — acceptable inside a single-pass scan, catastrophic inside a correlated probe (the exact 3C failure mode: >180 s → 1.7 s by set-based rewrite).

**P4-A6 — E2 gets its own module; `sessionFunnel.ts` is not overloaded.** Different query shape (bucketed vs range-level). E2's bucket generation will be the **fourth** copy (`trend.ts`, `sales.ts`, `shopperTrend.ts`, `shopperLifecycle.ts` already carry variants); consolidation stays filed as debt for the post-Phase-3 chore and is **not** performed inside a feature branch (move-vs-improve rule).

### LOCKED BY OWNER APPROVAL

**P4-O1 — Failure-reason presentation. LOCKED: raw top-N `reason` values, explicitly labeled as unstandardized.**
Failure-reason analytics show the top-N raw `reason` values exactly as the merchant/provider reported them. Binding requirements:
- Label them clearly as **raw / unstandardized failure reasons**; the UI must never imply EventPulse normalized them.
- **Never merge arbitrary reason strings into invented categories.** Normalization is limited to `LOWER(BTRIM(...))` for exact-match grouping — no synonym mapping, no bucketing, no "other" catch-all that absorbs distinct strings (a counted *remainder* beyond top-N is permitted and must be labeled as such).
- **The legacy, non-contract `failure_reason` property must never be read by production analytics.** Only the contract's `reason` (contract §5 Tier 2) is consumed. The benchmark seeder's use of `failure_reason` is a dataset defect corrected in 4G step 2 — it is never accommodated in application code.
- Missing or empty reasons remain **explicitly unknown** (`not_provided`), surfaced and counted, never silently dropped and never folded into a real reason.
- **No contract amendment is part of Phase 4.** Introducing a canonical `reason_code` field is explicitly out of scope.

**P4-O2 — GMV by payment method. LOCKED: dominant tracked currency only.**
- Dominant currency is determined by the **existing Phase 2 convention** — the currency with the most money-bearing confirmed orders, ties broken by currency code ASC (`currency_slices ORDER BY money_bearing_orders DESC, currency ASC`). Phase 4 introduces no new dominance rule.
- The displayed currency is **explicitly labeled** in the payload and UI.
- **Never combine currencies. Never perform FX conversion.** No blended total may exist in any payload field.
- Orders excluded because their money is in another currency are **counted and disclosed**.
- **Payment-method order counts include all confirmed orders regardless of whether trustworthy money exists.** Order counts and method share are order-grain and must not shrink to the money-bearing subset; only the GMV column is restricted to money-bearing orders in the dominant currency. This keeps the two columns honest about their different bases and is an acceptance criterion for 4A.
- **A parseable `0`/`0.00` is measured zero** and contributes to GMV; missing, malformed, or non-dominant-currency money is **unavailable/excluded**, counted, and never rendered as zero.

**P4-O3 — Benchmark seeder change. LOCKED: approved, executed as the two-step baseline strategy.**
The current benchmark dataset cannot exercise F4 correctly (§4), so a seeder change is authorized. It is executed in 4G in exactly two ordered steps:
- **Step 1 —** extend Phase 4 benchmark tooling and query coverage first; run against the **unchanged** Phase 3 dataset wherever possible; preserve valid same-manifest regression comparisons for all existing analytics surfaces. A pre-existing-tab regression here is a stop-and-report condition.
- **Step 2 —** update the deterministic seeder with contract-correct Phase 4 payment scenarios; generate a new manifest identity; run the Phase 4 matrix; cut a new Phase 4 baseline of record; **retain every previous baseline**; and record explicitly that cross-manifest timings must never be compared as if they were a same-dataset regression.

## 7. SQL architecture

**F4-a — orders/GMV by method** (`payments.ts`, statement 1; order grain)
```
WITH ${orderFactsCtes(scope.sql.currentAliasedEvent)},
order_method AS (                       -- one row per confirmed order
  SELECT i."projectId", i.order_id,
         COALESCE(NULLIF(LOWER(BTRIM(i.properties->>'payment_method')),''),'unknown') AS method
  FROM identity_representatives i
),
dominant AS (SELECT currency FROM currency_slices
             ORDER BY money_bearing_orders DESC, currency ASC LIMIT 1),
method_money AS (                       -- dominant-currency GMV per method
  SELECT om.method, SUM(m.amount_value) AS gmv, COUNT(*) AS money_orders
  FROM order_method om
  JOIN money_representatives m ON m."projectId"=om."projectId" AND m.order_id=om.order_id
  CROSS JOIN dominant d
  WHERE m.normalized_currency = d.currency
  GROUP BY 1
)
SELECT method, order counts, gmv, money_orders, plus excluded-currency counter
```
Grouping key `method`; ordering `orders DESC, method ASC` (deterministic).

**F4-b/c — attempts, failure rate, reasons** (`payments.ts`, statement 2; attempt/event grain)
```
scoped_payment_events AS (              -- ${scope.sql.currentEvent}, family from contract
  SELECT "projectId","sessionId","createdAt", LOWER(name) AS name,
         NULLIF(BTRIM(properties->>'payment_attempt_id'),'') AS attempt_id,
         COALESCE(NULLIF(LOWER(BTRIM(properties->>'payment_method')),''),'unknown') AS method,
         COALESCE(NULLIF(LOWER(BTRIM(properties->>'reason')),''),'not_provided') AS reason
  FROM "Event" WHERE ${scope.sql.currentEvent} AND LOWER(name) IN (payment family)
),
attempt_facts AS (                      -- one row per (projectId, attempt_id)
  SELECT "projectId", attempt_id,
         BOOL_OR(name='payment_completed') AS succeeded,
         BOOL_OR(name='payment_failed')    AS failed,
         MIN(...) representative method    -- deterministic tie-break, see below
  FROM scoped_payment_events WHERE attempt_id IS NOT NULL GROUP BY 1,2
),
session_fallback AS (                   -- rung 2 only
  SELECT COUNT(DISTINCT "sessionId") FILTER (WHERE name='payment_failed')  AS failed_sessions,
         COUNT(DISTINCT "sessionId") FILTER (WHERE name IN ('payment_completed','payment_failed')) AS outcome_sessions
  FROM scoped_payment_events WHERE "sessionId" IS NOT NULL
),
reasons AS (SELECT reason, COUNT(*) FROM scoped_payment_events WHERE name='payment_failed' GROUP BY 1)
```
**Attempt representative method** (deterministic, mirroring the order-facts discipline): among the attempt's events carrying a method, order by name priority (`payment_attempted` → `payment_failed` → `payment_completed`), then `createdAt ASC`, then `id ASC`; take the first. **Attempt outcome:** success-wins when an attempt shows both signals, with a `conflictedAttempts` counter surfaced (conservative — never inflates the failure rate).
**Ladder selection is computed in TypeScript** from counters returned by this statement; the SQL always returns all three rungs' inputs in one pass.

**E2** (`abandonmentTrend.ts`, 1 statement): `buckets × session_steps` (per session: bucket of first in-range event, plus reach flags for cart/checkout/order-fact/payment-failure) → per-bucket aggregation. Payment-failure line consumes F4-b's ladder result.
**E3** (`timeToConvert.ts`, 1 statement): per-session `MIN(...) FILTER` for view and order-fact anchors → durations → `PERCENTILE_CONT` + histogram; served by the existing `(projectId, sessionId, createdAt)` index.
**I3**: additive `COUNT(*) FILTER (…)` columns inside the existing `trackingReadiness` statement.

**Queries reading outside the selected range: none.**

## 8. Scope and tenant architecture

No new fragment (P4-A4). Every statement injects `scope.sql.currentEvent` or `currentAliasedEvent`; no module composes ownership predicates. Payment attempt identity includes `projectId`, so identical attempt ids across projects never merge. Merchant-supplied `reason` strings are escaped at render, truncated, and never logged with values (standards §11). Tenant fixtures required per branch.

## 9. Module boundaries

```
apps/server/src/contract/paymentIdentity.ts   (new — rules/constants only)
apps/server/src/analytics/payments.ts         (new — F4-a + F4-b/c, 2 statements)
apps/server/src/analytics/abandonmentTrend.ts (new — E2)
apps/server/src/analytics/timeToConvert.ts    (new — E3)
apps/server/src/analytics/trackingReadiness.ts (edited — I3 columns, additive)
apps/server/src/analytics/healthInsights.ts   (edited — K1 pure rules)
```
No `shared/paymentFacts.ts` (P4-A1). F4-a and F4-b live in one module because they are one feature with one payload, while remaining two statements because their grains differ.

## 10. Statement count and pool pressure

Counts re-derived from the composers on 2026-08-25 (§0.1).

| Tab | Before (concurrent) | Phase 4 adds | After |
|---|---|---|---|
| Conversion | 2 | E2 +1, E3 +1 | **4** (+ an all-time span pre-query, new to this tab) |
| Sales | **2–3** (trend is conditional) + span | F4 +2 | **4–5** + span |
| Overview | **13** all-projects / **12** single (+ span) | I3 **+0** | **13 / 12 — unchanged** |
| Shoppers / Products | 4 / 4 | 0 | unchanged |

Overview's 13-vs-10 pool finding is respected: Phase 4 adds **nothing** to Overview, and K1 is pure. F4's two statements run concurrently within the Sales composer and must **not** be entangled with the 9–10 s Sales comparison query. E2 introduces the first all-time span pre-query on Conversion (sequential, then the fan-out) — the same shape Overview, Sales and Shoppers already use.

## 11. API / payload design

Discriminated unions throughout; all additive; no shipped Phase 1–3 field renamed or revalued.

```ts
// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts
export type PaymentFailureBasis = "attempt-id" | "session-fallback" | "counts-only";

export interface PaymentMethodRow {
  method: string;              // normalized lower/trim; "unknown" when absent
  orders: number;              // order grain
  orderSharePercent: number;   // ÷ all confirmed orders (same grain)
  gmv: number | null;          // dominant currency only; null when no money
  failureRatePercent: number | null; // attempt grain; null unless basis==="attempt-id"
}
export interface PaymentReasonRow { reason: string; failures: number; sharePercent: number; }

export type PaymentsAnalysis =
  | { status: "available";
      basis: PaymentFailureBasis;
      currency: string | null;
      failureRatePercent: number | null;   // null on counts-only
      failedCount: number;
      attempts: number | null;             // null unless attempt-id basis
      methods: PaymentMethodRow[];
      reasons: PaymentReasonRow[];         // raw, labeled (P4-O1)
      dataQuality: { conflictedAttempts: number; attemptsWithoutMethod: number;
                     failuresWithoutReason: number; ordersExcludedForCurrency: number; }; }
  | { status: "unavailable"; missingFields: string[]; message: string };

export interface AbandonmentTrendPoint {
  date: string;
  cartAbandonmentPercent: number | null;
  checkoutAbandonmentPercent: number | null;
  paymentFailurePercent: number | null;
}
export type AbandonmentTrend =
  | { status: "available"; granularity: TrendGranularity;
      points: AbandonmentTrendPoint[]; paymentBasis: PaymentFailureBasis; }
  | { status: "unavailable"; missingFields: string[]; message: string };

export type TimeToConvert =
  | { status: "available"; medianMinutes: number | null; p75Minutes: number | null;
      qualifyingSessions: number; buckets: { label: string; sessions: number }[];
      excludedNoView: number; excludedNoOrder: number; excludedNonPositive: number; }
  | { status: "unavailable"; missingFields: string[]; message: string };

export interface DataQualityRule {
  id: string; label: string;
  percent: number | null;      // null when the rule's denominator is 0
  affected: number; total: number; unlockGuidance: string | null;
}
```
Every `number | null` field means *unavailable*, never zero. `basis` is a discriminant the UI must branch on.

## 12. Frontend architecture

**Conversion tab** (today: one `ConversionFunnelCard`) → funnel → E2 multi-line trend → E3 stat + histogram. **Sales tab** → F4 method table (share, orders, GMV, failure %) + reasons bars. **Overview A3** → I3/K1 through the **existing** insights panel; no A3 redesign.

Reuse: `HourlyTrendChart` idiom (E2), Products ranked-table idiom (F4 methods), Sales per-currency/basis-label patterns, `AnalyticsTabPanel` for loading/error/empty. Required disclosures: F4 basis label on every rate; "counts only — no trustworthy denominator" note on rung 3; `Unknown` method labeled as a tracking gap with the `payment_method` unlock hint; reasons labeled "as your store reports them" (P4-O1); GMV currency label + excluded count; E3 exclusion counts; E2 null rates as "—". Data ships in the tab payload (no new endpoint, no detail-level parameter — the Phase 3 P3-P6 lesson: progressive **disclosure** ≠ lazy **loading**). ~375 px responsive; a11y per standards §8; **no client-side metric computation** beyond formatting.

## 13. Performance reconnaissance

All Phase 4 statements are single-pass, set-based, range-bounded. Expected shapes: seq scans over scoped rows with JSONB extraction (no index can serve `properties->>'x'`; acceptable in one pass), hash aggregation on `attempt_id`/`method`/`reason`, `PERCENTILE_CONT` sort for E3, bucket join for E2. F4-a inherits the `orderFactsCtes` chain cost (Phase 2 measured line-item queries at ~123–130 ms; the sales headline at 1.07–1.49 s on wide all-project cells).

**Risk cells:** all-projects/custom-long and all-projects/all-time for F4-a (inherits the order chain) and E2 (bucketed session aggregation). **Highest single risk:** E2 at all-projects/all-time.

**No index is proposed.** Following the Phase 3C precedent, if any query is slow, first prove whether a function-wrapped predicate or a correlated shape is the cause — that was worth ~180 s → 1.7 s there with no schema change. Any index candidate must clear the standards §9 / 0D-5 §14 bar (measured problem, EXPLAIN pathology attributable to the index, selectivity, ingestion write-cost, before/after on the same tier) and lands in a separate, separately-approved branch. **Phase 4 optimizes no inherited Phase 2/3 debt** (Sales comparison 9–10 s, Overview 13 statements, B2 lifecycle ~1.7 s, B3/B4 ~2.38 s) — recorded, untouched.

## 14. Benchmark strategy

**Query-ID dependency (corrected — §0.2 C1).** The registry today ends at **#25** (`ANALYTICS_QUERY_IDS = [1 … 25]`, `explain-types.ts:12-15`; last entry `id: 25 category-line-items`). IDs **#26–#28** are registered by **Phase 3F**, which has not started. Phase 4 therefore claims **#29** `payments-methods` (F4-a), **#30** `payments-attempts` (F4-b/c), **#31** `abandonment-trend` (E2), **#32** `time-to-convert` (E3) **on the assumption that 3F lands first and consumes #26–#28**. If 3F is skipped, renumbered, or lands after 4G, branch 4G must re-derive its ids from the tuple as it actually exists at that moment and record the deviation — it must never guess. **4G has a hard dependency on 3F** (§15).

`conversion` is already a member of `BENCHMARK_TABS` (`benchmark-types.ts:1-8`), so E2/E3 require **no** matrix-shape change — only new query ids.

Targets: all/all, all/custom-long, all/30d, single/all, single/30d; day and month granularity variants for #31. Runner payload validation extended to assert the new discriminants (`available`/`unavailable`, basis rungs), not merely HTTP status.

**Two-step (mandatory, per P4-O3 and the Phase 2E rule):**

**Step 1 — measure on the unchanged dataset.** Register targets and run against the **existing** manifest. Per §0.3 this is a broad, genuinely informative pass, not a placeholder: **E2, E3, F4-a, I3 and K1 all execute against real data**, and F4-b resolves to the session-fallback rung — itself a valid measurement of a shipped code path. Compare pre-existing tabs against the current baseline of record as the regression check for 4A–4F. **A pre-existing-tab regression here is a stop-and-report condition — the seeder must not be touched until it is resolved.**

**Step 2 — extend the seeder, then re-measure.** Exactly four deterministic changes, no more:
1. `payment_attempt_id` emitted across the payment family (`payment_attempted`, and on `payment_completed`/`payment_failed` where the contract recommends it), including at least one order with **two distinct attempt ids** and at least one **conflicted** attempt (both success and failure signals) to exercise success-wins and `conflictedAttempts`.
2. **`failure_reason` → `reason`** — the contract key, on `payment_failed`. The non-contract key is a dataset defect, never accommodated in application code (P4-O1).
3. `payment_method` on `payment_attempted` and `payment_failed`, so the per-method failure rate becomes measurable on the attempt-id rung.
4. **Remove `payment_method` from a deterministic slice of order facts**, so F4-a's `Unknown` bucket — a P4-O2 acceptance path currently at 0% coverage (§0.2 C2) — is exercised.

Then reseed, re-run the Phase 4 matrix, cut a **new baseline of record**, **retain every previous baseline**, and record explicitly that cross-manifest timings must never be compared as if they were a same-dataset regression. Timings remain directional (F-P2E-08 / F-0D5-11); plan-shape and payload stability are the hard gates.

## 15. Dependency graph

```
Phase 3D merged (0eac1fa)  ──────────────────────────────┐
        │                                                │
        │  3E (in flight, uncommitted) ──► 3F (not started)
        │                                                │
        ▼                                                │ registers #26–#28
4A payments backend (F4-a + F4-b/c)                      │
        │                                                │
        ├────────────► 4B abandonment over time (E2)   [needs F4-b ladder]
        │                                                │
        │              4C time to convert (E3)          [independent — parallelizable]
        │                                                │
        └────────────► 4D data quality + rule expansion (I3 + K1)  [needs 4A/4B outputs]
                              │                          │
        4B + 4C ─────► 4E Conversion tab UI              │
        4A + 4D ─────► 4F Sales payments UI + insights ◄─┘
                              │                          │
                              ▼                          │
                     4G benchmark extension (two-step) ◄──┘
```

**4A–4F depend on neither 3E nor 3F** — they build only on Phase 3A–3D surfaces (`shared/orderFacts.ts`, the scope fragments, `trackingReadiness`, `healthInsights`), all merged at `0eac1fa`. 4A is **unblocked now**.

**4G depends on 3F** (corrected — §0.2 C1): 3F owns query ids #26–#28 and cuts the Phase 3 baseline that 4G step 1 regression-compares against. Running 4G before 3F would either collide on ids or compare against a stale baseline.

**Branch hygiene:** the current tree is dirty with Phase 3E work. Cut every Phase 4 branch from `main` at `0eac1fa` or later — never from this working tree, and never by stashing, resetting, or checking out over the in-flight 3E files.

**Parallelizable:** 4C with 4A/4B; 4E with 4F. **Hard dependencies:** 4B→4A (ladder), 4D→4A/4B, 4F→4A/4D, 4G→4A–4F **and 3F**. **Owner gates: none** — P4-O1/O2/O3 are recorded approved and locked (§6). **Benchmark gate:** 4G step 1 must show no pre-existing-tab regression before the seeder is touched.

## 16. Branch sequence — full specifications

### 4A — `feature/payments-analysis-backend`

1. **Branch:** `feature/payments-analysis-backend`
2. **Goal:** F4 backend — orders/GMV by method (order grain) and failure rate + reasons (attempt/event grain) with the blueprint denominator ladder.
3. **Dependencies:** Phase 3A merged at `5c332d8` (`shared/orderFacts.ts`) — **satisfied; 4A is unblocked now.** Independent of 3E/3F. No open decisions — P4-O1 and P4-O2 are locked (§6). Cut from `main` at `0eac1fa` or later, never from the dirty 3E tree.
4. **Files expected to change:** `apps/server/src/contract/paymentIdentity.ts` (new) · `apps/server/src/analytics/payments.ts` (new) · `summary.ts` (Sales composer + payload type) · web `analytics-types.ts` (MIRROR only).
5. **Must not change:** `shared/orderFacts.ts` · `sales.ts` · `lineItems.ts` · `productPerformance.ts` · `analyticsScope.ts` · `contract/taxonomy.ts` · `trackingReadiness.ts` · `shopper*.ts` · any UI component · `prisma/**` · `scripts/**`.
6. **Impact:** additive Sales payload field. No schema change, no new scope fragment.
7. **Steps:** create `paymentIdentity.ts` (payment family from `taxonomy.tier2Payment`, attempt-identity key, success-wins outcome constant, method/reason property names, ladder rung constants); implement statement 1 (order grain, consuming `orderFactsCtes`) and statement 2 (attempt/event grain) per §7; compute the ladder in TypeScript from statement 2's counters; build the discriminated payload; wire into the Sales composer; mirror types.
8. **Semantics:** §5 F4-a/b/c verbatim. **Mixed-grain ratios are forbidden.**
9. **SQL:** §7. Both statements set-based, single-pass, `scope.sql.*` only. No correlated `EXISTS`.
10. **Scope/tenant:** `currentAliasedEvent` (stmt 1) / `currentEvent` (stmt 2); attempt identity includes `projectId`; range-bounded, no history reads.
11. **Edge cases:** attempt with both success and failure (success-wins + `conflictedAttempts`); attempt without outcome; outcome without `payment_attempted`; **no `payment_attempt_id` anywhere → session-fallback**; no payment events → counts-only, no rate; missing method → `Unknown` in denominator; missing reason → `Not provided`; mixed currency; order without method; cross-tenant.
12. **Payload:** `PaymentsAnalysis` (§11).
13. **Frontend:** none (4F).
14. **States:** unavailable when no payment signal; counts-only emits no percentage; fallback always labeled.
15. **Budget/statements:** **+2** on Sales (**4–5** total, per §10). 300 ms p95 hypothesis per statement; **measure independently of the Sales comparison query**.
16. **Fixture matrix:** via ingest API — conflicted attempt · **multi-attempt order (two attempt ids, one order)** · attempt without outcome · outcome without attempt · missing method · missing reason · zero `payment_attempt_id` (forces fallback) · zero payment events (counts-only) · mixed currency · cross-tenant · independent SQL cross-check of attempts, failures, and rate.
17. **Benchmark/EXPLAIN:** register #29, #30; EXPLAIN at all/all and all/custom-long; **assert no `SubPlan` with loops appears**; report whether the order-facts chain dominates statement 1.
18. **Validation:** `bun run typecheck` · `bun run build` · `bun run lint` · `cd apps/server && bun run bench:typecheck` · `git diff --check` · `git status` · other tab payloads byte-identical.
19. **Acceptance:** ladder selects the correct rung in all three regimes and labels it; no rate emitted without a trustworthy denominator; no mixed-grain ratio anywhere; `Unknown` method in denominator; GMV never mixes currencies; +2 statements exactly; zero correlated subplans.
20. **Risks:** R1 mixed-grain ratio slipping in → explicit acceptance item + review grep. R2 re-deriving order dedup → forbidden, must import. R3 entangling with the slow comparison query → separate statements, separately measured. R4 JSONB extraction inside a correlated probe → forbidden by P4-A5.
21. **Commit:** `feat: add payments analysis to sales analytics`

### 4B — `feature/abandonment-over-time`

1. `feature/abandonment-over-time` 2. E2 per-bucket cart/checkout abandonment + payment-failure rates. 3. **Deps:** 4A (ladder). 4. **Changes:** `analytics/abandonmentTrend.ts` (new), `summary.ts`, web types. 5. **Must not change:** `sessionFunnel.ts`, `commerceFunnel.ts`, `trend.ts`, `payments.ts`, `contract/*`, UI, schema, scripts. 6. Additive Conversion field. 7. **Steps:** resolve granularity via `trend.ts` (all-time adds the sequential span pre-query); assign each session to its first-in-range bucket; compute reach/abandonment per bucket; consume F4-b's ladder for the payment line; wire + mirror. 8. §5 E2. 9. §7 E2. 10. `currentEvent`, range-bounded. 11. Straddling sessions; empty buckets (null not 0); null-`sessionId` excluded + coverage; all-time granularity; range totals cross-checked against the existing session funnel. 12. `AbandonmentTrend`. 13. None (4E). 14. Unavailable when no session data. 15. **+1** (Conversion 2→3, + span on all-time); 300 ms p95. 16. §5/§19 E2 case list + independent per-bucket SQL. 17. #31 with day+month variants. 18. As 4A. 19. Bucket assignment per §5; nulls not zeros; payment line label identical to F4's basis. 20. Denominator drift from `sessionFunnel` → range-total cross-check. 21. `feat: add abandonment over time to conversion analytics`

### 4C — `feature/time-to-convert`

1. `feature/time-to-convert` 2. E3 median/p75 + histogram. 3. **Deps:** none (parallelizable). 4. **Changes:** `analytics/timeToConvert.ts` (new), `summary.ts`, web types. 5. **Must not change:** other analytics modules, `contract/*`, UI, schema, scripts. 6. Additive Conversion field. 7. Per-session anchors → durations → percentiles + buckets. 8. §5 E3. 9. §7 E3. 10. `currentEvent`. 11. Order-fact before view (excluded + counted); view without order; multiple views/orders (earliest wins); single qualifying session; below-minimum → null percentiles. 12. `TimeToConvert`. 13. None (4E). 14. Unavailable without session timestamps. 15. **+1** (Conversion →4); 300 ms p95. 16. §5/§19 E3 case list + independent SQL. 17. #32; report percentile sort spill. 18. As 4A. 19. Anchors per §5; exclusions counted and surfaced. 20. Sort spill on wide ranges → measured, filed. 21. `feat: add time to convert to conversion analytics`

### 4D — `feature/data-quality-and-rules`

1. `feature/data-quality-and-rules` 2. I3 five percentages + K1 rules. 3. **Deps:** 4A, 4B. 4. **Changes:** `trackingReadiness.ts` (additive columns in the **existing** statement), `healthInsights.ts`, `summary.ts`, web types. 5. **Must not change:** rung boolean semantics/values; `payments.ts`; `abandonmentTrend.ts`; `contract/*`; any other module's SQL; schema; scripts. 6. Additive Overview fields; **+0 statements**. 7. Add `COUNT(*) FILTER` columns to the readiness statement; compute percentages in TS; add K1 pure rules over plain-data inputs. 8. §5 I3/K1. 9. No new statement. 10. Unchanged. 11. Zero-denominator → null (never 0%); rules never fire on unavailable inputs; rung booleans provably unchanged. 12. `DataQualityRule[]` + extended `InsightType`. 13. Rendering in 4F. 14. Null percentages render "—". 15. **+0 statements** — the decisive property. 16. Hand-counted percentage per rule; each K1 rule at and below threshold; **rung-boolean byte-diff for every scope**. 17. No new query ID; readiness plan-shape change measured in 4G. 18. As 4A. 19. Rung booleans byte-identical; five percentages correct; each rule fires exactly at threshold; Overview statement count unchanged. 20. Perturbing shipped readiness values → byte-diff is an acceptance item. 21. `feat: add data quality rules and expanded insight library`

### 4E — `feature/conversion-tab-depth-ui`

1. `feature/conversion-tab-depth-ui` 2. Render E2 + E3. 3. **Deps:** 4B, 4C. 4. **Changes:** `ConversionTab.tsx`, new presentational components, web types if gaps. 5. **Must not change:** `ConversionFunnelCard` behavior, other tabs, `useAnalyticsTabData.ts`, any server file, schema. 6. Render only. 7. Compose funnel → abandonment trend → time-to-convert; reuse chart idioms; unavailable copy from `trackingReadiness` rungs. 8. Presentation only; no client-side metric math. 9. None. 10. N/A. 11. Independent section states; null rates "—"; E3 exclusions disclosed. 12. No new server types. 13. §12. 14. Available / partial-with-disclosure / unavailable-with-fields. 15. No statement change. 16. Browser matrix {full payment data, no attempt ids, no payment events, no session data, empty} × {24h, 30d, custom-long, all} × {all-projects, single}; ~375 px; a11y. 17. None. 18. typecheck · build · lint · `git diff --check` · `git status`. 19. Every basis label and disclosure appears exactly under its condition; values match payload verbatim. 20. Unlabeled fallback rate rendering as confirmed → explicit acceptance item. 21. `feat: render abandonment and time-to-convert on conversion tab`

### 4F — `feature/payments-ui-and-insights`

1. `feature/payments-ui-and-insights` 2. Render F4 on Sales; surface I3/K1 in A3. 3. **Deps:** 4A, 4D (P4-O1/O2 locked, §6). 4. **Changes:** `SalesTab.tsx` + payments components, `TrackingHealthInsightsCard.tsx` (only if not type-agnostic), web types. 5. **Must not change:** other Sales sections' behavior, other tabs, any server module, schema, A3 layout structure. 6. Render only. 7. Method table + reasons bars + basis label + data-quality counters; surface I3/K1 via the existing panel. 8. Presentation only. 9. None. 10. N/A. 11. Counts-only renders counts with an explicit no-denominator note; `Unknown` labeled as tracking gap; reasons labeled per P4-O1; GMV currency-labeled with excluded count. 12. No new server types. 13. §12. 14. As above. 15. No statement change. 16. F4 case list rendered; ~375 px; a11y; **reason strings escaped/truncated, never logged**. 17. None. 18. As 4E. 19. No percentage renders without its basis label; A3 layout unchanged; insights cite real numbers, rule-based wording. 20. Merchant reason strings breaking layout or injecting markup → escape + truncate + `title`. 21. `feat: render payments analysis and expanded insights`

### 4G — `feature/phase4-benchmark-extension`

1. `feature/phase4-benchmark-extension` 2. Measure Phase 4; correct the bench dataset's payment gaps; cut the Phase 4 baseline. 3. **Deps:** 4A–4F merged **and Phase 3F merged** (3F owns query ids #26–#28 and the Phase 3 baseline of record — §14, §0.2 C1). P4-O3 locked and approved (§6). 4. **Changes:** `explain-query-registry.ts`, `explain-types.ts`, `run-benchmarks.ts`, **`seed-benchmark-data.ts` (step 2 only)**, `benchmarks/baselines/analytics/`. 5. **Must not change:** any `apps/server/src/**` or `apps/web/**`; existing baselines (additive only); guard rules. 6. Benchmark artifacts only. 7. **Two ordered steps** per §14. 8. N/A — measurement only; no metric may change. 9. No production SQL; EXPLAIN read-only in a transaction with rollback. 10. Bench guard unchanged (`*bench*` DB only, `NODE_ENV !== production`, mutation counts identical). 11. If step 1 shows a pre-existing-tab regression, **stop and report before touching the seeder**. 12. N/A. 13. N/A. 14. N/A. 15. Records final counts: Conversion 4 (+span), Sales 4–5 (+span), Overview 13/12 unchanged. 16. Runner correctness assertions + new discriminant checks. 17. #29–#32 registered; day+month for #31. 18. `bench:typecheck` · `bench:run` · `bench:explain` · `bench:compare` · typecheck · build · lint · `git diff --check`. 19. Both steps in order; new baseline committed with priors retained; cross-manifest caveat recorded; every breach filed as a finding with no optimization proposed. 20. Conflating pre/post-seeder timings → two-step order is the mitigation. 21. `feat: extend analytics benchmarks to phase 4 metrics`

## 17. Stop conditions

Stop and report if: the benchmark dataset cannot exercise a required semantic even after the step-2 seeder change · the contract lacks an identity field for an advertised metric · a metric would require inventing unsupported semantics (notably a normalized failure taxonomy or any recovery metric) · any Phase 4 query approaches Sales-comparison-scale latency (~9–10 s) · a schema, migration, or index appears necessary · a shipped Phase 1–3 metric would need semantic modification · tenant isolation cannot be expressed through centralized scope fragments · payment attempt identity proves ambiguous in real data · 4G step 1 reveals a pre-existing-tab regression · any change would require reading the non-contract `failure_reason` key in application code, inventing reason categories, combining currencies, or amending the contract (each forbidden by §6).

## 18. Out of scope

Recovery/retry/recovered-order analytics · refunds and cancellations · payment provider dimension · **any normalized/invented failure-reason taxonomy, and any contract amendment such as a canonical `reason_code` field (P4-O1 locked)** · **reading the non-contract `failure_reason` property in application code** · **any cross-currency combination or FX conversion (P4-O2 locked)** · E4 custom funnel builder · F5 coupon impact · K2 digest · I1/I2 (Phase 8; I2 is a write path) · D3/B5/C-b drilldowns · G-series · H1 cohorts · shopper KPIs or any new statement on Overview · optimizing inherited Phase 2/3 debt · indexes, rollups, caches, materialized state, normalized tables, schema changes · queues/workers/cron/webhooks/Redis/new services · `occurredAt`, batch ingestion, SDK, async processing · changing any shipped Phase 1–3 metric value or field name · new endpoints or detail-level parameters.

## 19. Temporary verification strategy (Phase 9 absent)

Per branch: **real ingest-API fixtures** (extending the Phase 2/3 scripts, persisted in the scratchpad, pasted in the PR, reused by later branches) · **independent SQL cross-checks** for every rate, percentage, and count — the primary defense given the grain hazards · **payload byte-diffs** proving untouched tabs are identical · **cross-tenant fixtures** and **cross-project identifier collisions** · **boundary timestamps** (range edges, bucket edges) · **`EXPLAIN (ANALYZE, BUFFERS)`** for every new statement, captured before dependent UI work, asserting no `SubPlan` with loops · **benchmark runner** correctness assertions · **browser + a11y checks** for UI branches. Every PR labels each claim **runtime verified**, **inspection only**, or **not verified** (standards §18.7). These matrices become Phase 9's first golden tests.

## 20. Completion criteria

1. E2, E3, F4, K1, I3 implemented per §5, each verified against independent SQL.
2. F4's ladder provably selects the correct rung and labels fallbacks; **no rate emitted without a trustworthy denominator**.
3. **No mixed-grain ratio exists anywhere** in the diff (grep-verified; numerator and denominator share a grain in every rate).
4. Payment identity defined once in `contract/paymentIdentity.ts`; order identity consumed from `shared/orderFacts.ts`, never re-derived.
5. Attempt, order, session, and event grains are correct and never silently interchanged.
6. Tenant isolation via centralized scope fragments only; no query reads outside the selected range; cross-tenant and cross-project fixtures pass.
7. Missing-field honesty: `Unknown`/`Not provided` buckets included in denominators; every unavailable state names its unlocking fields.
8. Mixed currency: dominant-currency GMV labeled with excluded counts; no FX; no cross-currency summation.
9. Statement counts: Conversion 4 (+span), Sales 4–5 (+span), **Overview 13/12 unchanged**; I3 adds zero statements.
10. Performance evidence: EXPLAIN captured for #29–#32; zero correlated subplans; any breach filed as a finding, none fixed.
11. Payload regression: Products, Shoppers, Behavior byte-identical; Overview and Sales changed only additively; Phase 1–3 field names and values unchanged. **Specifically: shipped AOV remains `gmv ÷ moneyBearingOrders` with its shipped basis note, and confirmed-Orders counts remain independent of money availability.**
12. Frontend: every disclosure renders exactly under its condition; ~375 px and a11y pass; no client-side metric computation.
13. Benchmark: 3F merged before 4G; query ids re-derived from the live tuple rather than assumed; two-step executed in order; step 2 delivers all four seeder changes including the **`Unknown`-method slice**; new baseline committed with all priors retained; cross-manifest caveat recorded.
14. No schema, migration, index, rollup, cache, dependency, or endpoint added anywhere in the diff range.
15. Every branch: typecheck, build, lint, `bench:typecheck`, `git diff --check` green, with honest verification labelling.

---
*Finalized read-only on 2026-08-25 at HEAD `0eac1fa` (Phase 3D merged; branch `feature/shoppers-tab-ui` identical to `main`), with Phase 3E present in the working tree as uncommitted edits that were read but never modified. Verification covered the repository source, the benchmark tooling, and live read-only queries against `eventpulse_bench`; no source file, seeder, schema, migration, or benchmark artifact was written. Owner decisions P4-O1, P4-O2 and P4-O3 are recorded as **approved and locked** (§6) — superseding the prior revision's contradictory footer. The only outstanding sequencing dependency is **Phase 3F before 4G** (§14, §15); branches 4A–4F are unblocked.*
