# EventPulse Phase 2 — GMV and Orders MVP Implementation Workflow

**Type:** Implementation workflow (metric semantics + branch plans + Codex handoffs). Metric authority stays with the blueprint and the Commerce Tracking Contract; this file operationalizes them.
**Assumes:** 0D-5, Phase 0M, and Phase 1 (1A–1F, approvals A1–A4 resolved) are fully merged. Written against the repository at branch `feature/benchmark-runner` / commit `817dec9` (0D-5B in progress) — every "post-Phase-1" reference below names the artifact the Phase 0M/Phase 1 workflow commits those phases to producing; implementers must re-verify file names against the merged reality.
**Governing documents (authoritative, unmodified):** analytics blueprint (Principles 2/3/6/11; features A1, D1, F1–F3; Parts 6–7) · Commerce Tracking Contract (§§2, 3, 5, 7, 8, 10, 11) · Engineering Quality Standards · Platform Roadmap · Phase 0M + Phase 1 workflow · Phase 0D-5 plan (benchmark rules §§7, 12, 18).

**Execution order (binding):** 0D-5 → 0M → Phase 1 → **Phase 2** → Phase 3.

---

## 1. Purpose

Phase 2 answers the merchant's first money question — **"How much is the store selling, and when?"** — with numbers EventPulse can defend. It activates the existing Sales tab (today an honest static unavailable state) with:

- **Confirmed Orders** — distinct, project-scoped `order_id` counting: the exact number of orders, immune to event double-emission and retries.
- **Confirmed GMV** — exactly one `amount` per distinct order, per currency, never converted, never fabricated.
- **AOV** — confirmed GMV ÷ money-bearing confirmed orders, per currency, confirmed basis only.
- **Unavailable/readiness states** — every locked value names the exact fields that unlock it (Principle 11), consistent with Phase 1's readiness rungs 4–6.
- **One explicitly permitted approximation** — blueprint Principle 3 and contract §7 both authorize a **purchasing-session fallback** for Orders/GMV when `order_id` is absent, *visibly labeled* ("approximated by purchasing sessions"), never merged into confirmed values, and never feeding AOV.

**Why after Phase 1:** Phase 1 built the rungs this phase climbs — the contract module (alias single source, money rules, order-identity constants in `contract/orderIdentity.ts`), observational validation that measures `order_id`/`amount`/`currency` adoption, readiness reporting that already tells merchants rungs 4–6 exist, docs that teach them, and seed data that exercises them (`items[]`, `payment_attempted`, deterministic order ids). Phase 2 is the first *consumer* of those definitions; building it earlier would have meant inventing order identity ad hoc inside SQL — exactly the drift Part 5 of the blueprint forbids.

**Blueprint scope for Phase 2 (Part 7, row 2 — verified verbatim):** "F1, F2, F3; KPI row gains GMV + Orders; confirmed Units Sold appears in D1/D3 where items[] present." D3 (product drilldown) is Phase 5; the D1 portion lands now. This corrects the inventory's assumption that product/category money is out of scope: **F3 (GMV by Category/Product) and D1 confirmed Units Sold are explicitly Phase 2**, on the items[]-attributed basis only. Payment analytics (F4) is Phase 4; refunds are in the postponed pool.

## 2. Authoritative Metric Definitions

These definitions are binding for every query, type, label, and test in Phase 2. Sources: blueprint Principle 3 ("Orders = COUNT DISTINCT `order_id` when present; fallback = distinct purchasing sessions, visibly labeled; never raw purchase-event counts. GMV dedupes the same way — one amount per distinct order"), contract §3 (Order entity: "**The** dedup key… Must be unique per project and identical across all events describing the same order"), contract §7 (fallback + malformed-value rows), contract §2 (purchase_completed is "**The order fact**").

### 2.1 Confirmed Orders

- **Identity:** one order = one distinct `(projectId, order_id)` pair, inside the tenant scope (`AnalyticsScope` provides `userId` + project + range; sales queries add nothing of their own — standards §6).
- **`order_id` extraction:** `BTRIM(properties->>'order_id')`; empty-after-trim or absent = **no order id** (falls to §2.4). Comparison is **byte-exact and case-sensitive** after trim — `ORD1` and `ord1` are two orders. Lowercasing would silently merge distinct merchant ids (fabricated dedup); the contract puts id consistency on the merchant ("identical across all events").
- **Eligible event names** (the *order-fact family*): canonical `purchase_completed` + its contract §2 aliases (`order_completed`, `checkout_completed`, `checkout.completed`, `order_placed`) + `payment_completed` — matched via `LOWER(name)` against the contract module's constants (post-1A single source; today's `COMMERCE_PURCHASE_ALIASES` is the equivalent set). `payment_completed` participates because contract §5 states its `order_id` "must equal the purchase_completed order_id when both are sent — that equality is what makes order dedup work" and §7 says distinct-`order_id` counting "absorbs re-sent purchase facts and the purchase/payment overlap." **Excluded from order identity:** `payment_attempted`/`payment_failed` (an attempted order is not an order), `refund_issued`/`order_cancelled` (corrections, not orders — analytics deferred).
- **Duplicate events / retries:** any number of eligible events sharing `(projectId, order_id)` count **once**. Transport retries are already absorbed by idempotency; re-sent facts and the seed's documented purchase+payment double-emission are absorbed by distinctness. Orders can never be inflated by event volume — that is the entire point of the definition.
- **Same order id in different projects:** two different orders (identity includes `projectId`). All-projects scope sums per-project distinct counts — implemented as `COUNT(DISTINCT (projectId, order_id))`, never `COUNT(DISTINCT order_id)` across projects.
- **Conflicting amount/currency across one order's events:** the order still counts **exactly once**. Money resolution is §2.2's job; conflicts never split or duplicate the order.
- **Purchase event without `order_id`:** contributes nothing to confirmed Orders; contributes to the coverage denominator (§2.4) and, when the fallback basis is active, to purchasing-session counting.
- **Null vs zero:** a scope with purchase-family events and zero distinct `order_id`s has **confirmed Orders = unavailable (null)**, not 0 — the store didn't sell nothing; we can't count. A scope with *no purchase-family events at all* likewise reports unavailable with the rung-1/4 unlock copy. **Zero is reserved for a scope where confirmed counting is possible and the in-range count is genuinely 0** (e.g., order ids exist in other ranges, none in this one).

### 2.2 Confirmed GMV

- **Exactly one amount per distinct `(projectId, order_id)`.** Never per event.
- **Representative event selection (deterministic, two-level):** among the order's in-scope eligible events that carry a **parseable, non-negative `amount` and a valid currency**, pick by (1) **name priority: order-fact events (`purchase_completed` + aliases) over `payment_completed`** — the contract names purchase_completed "the order fact; everything money reads from here"; (2) **earliest `createdAt`**; (3) smallest `id` (total order → deterministic under standards §3.10). *Why earliest, argued:* "latest event" lets any re-sent or mutated fact silently rewrite history — the append-only philosophy says facts don't change, corrections arrive as new event types (`refund_issued`); "earliest valid" anchors GMV to the original fact and is stable as later duplicates arrive. Consequence, stated: a merchant who "amends" an order by re-sending a different amount will not see GMV change — the docs already say corrections are refund/cancel events (deferred analytics), and the conflict is a data-quality observation, not something the metric resolves by guessing. Backfilled events with earlier timestamps can change the representative — acceptable: facts-based, still deterministic.
- **Which amount:** the representative event's guarded `amount` — SQL-side guarded parse mirroring the shipped convention (regex-gated `::numeric`, extended to detect an optional leading minus so negatives are *classified*, not lumped with garbage). Aggregation in SQL `numeric`; JS sees final values only (standards §4).
- **Malformed amount (`"1,299"`, `"$12"`, text):** the event cannot be a money representative. If **no** event of the order carries parseable money, the order counts in Orders but contributes **no** GMV; it is counted in `ordersWithoutMoney` and surfaced ("GMV computed from N of M orders — K orders have unparseable amounts"). Never zero, never guessed (contract §7).
- **Missing/invalid currency:** money without currency is unlabeled money — excluded from GMV exactly like malformed amounts, counted in `missingCurrency`. Currency validity = `UPPER(BTRIM(currency))` matching `^[A-Z]{3}$` (shape-only, per Phase 1's ruling — no whitelist authority is fabricated). Case-normalization to uppercase is labeling hygiene, not conversion.
- **Negative amount:** excluded from GMV, counted separately (`negativeAmounts`), with the contract's exact posture: "a negative sale is a refund wearing the wrong event" — surfaced with the send-`refund_issued` hint. The order itself still counts once in Orders.
- **Refund/cancellation exclusion:** `refund_issued`/`order_cancelled` events are entirely outside Phase 2 aggregation — GMV is **gross** merchandise value; net adjustments are the postponed refund analytics. The Sales tab states this plainly ("GMV is gross — refunds are not deducted").
- **No FX conversion, ever.** No blended totals across currencies exist anywhere in the payload.
- **Mixed currencies:** GMV is computed **per currency** (§7 currency model). An order's currency is its representative event's currency; one order belongs to exactly one currency bucket.

### 2.3 AOV

- **Numerator:** confirmed GMV in currency *c*. **Denominator:** confirmed orders whose representative money is in currency *c* (i.e., **money-bearing orders in *c***) — *not* all confirmed orders. Deviation from a naive "GMV ÷ all orders," justified: orders lacking parseable money would deflate AOV with zeros that were never measured, violating null-vs-zero; the label states the basis ("AOV across the N orders with parseable amounts"). This is Principle 2's "no rate without a trustworthy denominator" applied to money.
- **Per-currency only.** There is no blended AOV; each currency row carries its own `aov`.
- **Mixed-currency headline:** the dominant currency's AOV, labeled (§7).
- **Zero denominator (no money-bearing orders in *c*):** that currency row's `aov` is `null` — the row shouldn't exist in that case anyway (no GMV either), but the type permits it and the UI renders "—".
- **Unavailable:** AOV exists **only on the confirmed basis**. When Orders/GMV run on the session-approximate fallback, `aov` is null with copy naming `order_id` ("AOV requires exact order identity — add order_id to purchase events"). Rationale: F2 defines AOV as GMV ÷ *distinct orders*; an approximate-over-approximate ratio compounds two biases (session fallback undercounts multi-order sessions — blueprint decision #2 notes the bias), and no governing text authorizes an approximate AOV. Principle 11: unavailable, never estimated.

### 2.4 The permitted approximation (session fallback) and basis selection

- **Fallback definitions:** approximate Orders = distinct purchasing sessions (in-scope sessions containing ≥1 order-fact-family event, `sessionId IS NOT NULL`); approximate GMV = one amount per purchasing session, representative chosen by the same priority/earliest/id rule within the session, same parse/currency/negative rules. Blueprint Principle 3 + contract §7 authorize exactly this, labeled.
- **Basis selection per scope (one basis, never blended):**
  - ≥1 confirmed order in scope → **confirmed basis**. Purchases lacking `order_id` are *excluded and surfaced* as coverage ("N% of purchase events lack order_id and are excluded — Health names the fix"). Partial adoption never mixes bases; contract §10 already treats inconsistent presence as the worse state, and the coverage line makes the cost visible.
  - 0 confirmed orders but ≥1 purchasing session → **session-approximate basis**, every headline visibly labeled ("approximated by purchasing sessions"), AOV null.
  - Neither → **unavailable** (today's Sales-tab copy, now data-driven): the four Tier-1 events / `order_id` / `amount` + `currency` unlock chain per readiness rungs.
- **Hard rules (correction requirements §3/§4, encoded):** approximate values live in separate, explicitly-typed fields; they are never summed with, compared against, or silently substituted for confirmed values; the `basis` discriminant travels in the API type so the UI *cannot* render an unlabeled approximation.

## 3. Scope and Non-Goals

**In scope (blueprint-assigned to Phase 2):** F1 GMV & Orders trend on the Sales tab · F2 AOV header stat · F3 GMV by Category/Product (items[]-attributed, labeled) · Overview KPI row gains GMV + Orders with previous-period deltas (A1 Stage 2) · confirmed Units Sold in D1 where `items[]` present · one GMV-delta insight rule (F1's "I:") · benchmark matrix extension for the now-dynamic Sales tab.

**Explicitly out of scope:** payment methods / failure rates / attempts (F4 — Phase 4; requires `payment_attempt_id` denominators) · refunds & cancellations (postponed pool; contract Tier 5 data accumulates, analytics deferred) · retention/cohorts (Phase 7) · Top Shoppers monetary ranking (Phase 3 unlocks it) · coupon impact (F5, Phase 7) · FX conversion (banned forever) · normalized order/product tables (contract §3: no entity requires schema) · **any Prisma schema change** · rollups/caching/query optimization/indexes (0D-5 §14 evidence bar governs any future index) · occurredAt/batch/quarantine (Phase 11) · SDK (Phase 12) · async processing (10A) · any change to Phase 1 validation behavior (warnings, readiness semantics, Layer 1) · new top-level navigation (the existing Sales tab is activated, not replaced).

## 4. Phase 1 Dependency Contract

| Dependency (expected Phase 1 artifact) | Status | Fallback | Blocks Phase 2 if absent? |
|---|---|---|---|
| `contract/taxonomy.ts` — purchase-family alias constants (single source; analytics shim re-exports) | **Required** | Use `analytics/shared/aliases.ts` exports directly (same values pre-1A) | No — degrades to today's constants; single-source discipline still holds because both are one definition |
| `contract/orderIdentity.ts` — order-identity + labeling-flag constants | **Required** | Inline the §2 rules in `sales.ts` with doc comments citing this file | No, but the Part-5 drift risk returns; prefer waiting for 1A |
| `contract/moneyRules.ts` — guarded-parse regex convention, currency shape | **Required** | Mirror `productPerformance.ts`'s shipped regex | No |
| Phase 1B validators / warning codes | Optional | — | No — Phase 2 consumes definitions, not the validator |
| Phase 1C response warnings | Optional | — | No — ingestion-side; irrelevant to read path |
| Phase 1D readiness rungs 4/5/6 surfaced in Health | Optional but strongly desired | Sales-tab unavailable copy carries the unlock text alone | No — copy duplicates gracefully; alignment check in 2B validation |
| Phase 1F seed: deterministic `order_id`s on purchases (already true pre-Phase-1), `items[]` on a majority, partial-adoption minority, `payment_attempted` | **Required for demoability and manual verification** (not for correctness) | Hand-crafted curl fixtures | 2D's Units-Sold verification is blocked without items[] in some dataset; 2E's bench needs items[] in the *bench* seeder regardless (separate seeder — see §12, branch 2E) |
| Phase 1 response compatibility (no renamed fields) | **Required** | — | Yes — Phase 2 types extend Phase 1 shapes additively |

## 5. Current-State Assessment (verified at `817dec9`; post-Phase-1 deltas noted)

- **Sales tab today:** `apps/web/components/dashboard/analytics/tabs/SalesTab.tsx` (35 lines) — a static `GlowCard` unavailable state: "GMV & Orders … will unlock when purchase events include the required order and money fields," with chips for exactly `order_id`, `amount`, `currency`. **No request is issued**: `AnalyticsTabDataMap` (web `analytics-types.ts` L245–253) omits `sales`; `useAnalyticsTabData.isDataTab()` returns false for it; the server tab union (`AnalyticsTab` in `summary.ts` L49) and controller validator exclude it (unknown tab → 400). The inventory's claim is verified. Note a naming mapping: the blueprint calls this the "Revenue" tab; the implementation shipped it as **Sales** — same tab, and all money labels say GMV (blueprint Part 8 wording rules).
- **Tab endpoint architecture:** `GET /api/analytics/summary?tab=…` (tab required since 0D-4C); thin controller → `createAnalyticsScope` → per-tab composer in `summary.ts`, each with its own `Promise.all` of module fetchers. Adding a tab = extend the union, add a composer, add a payload type + MIRROR.
- **Analytics module structure:** 12 files under `apps/server/src/analytics/` (19 raw SQL statements; inventory in 0D-5 §11). Every fetcher takes `AnalyticsScope` first; scope fragments are the only ownership/time filter source; alias lists come from `shared/aliases.ts` (post-1A: re-export shim over `contract/taxonomy.ts`).
- **Frontend tab hook:** `useAnalyticsTabData` (177 lines) — per-scopeKey cache, per-tab request ids, refresh-active-tab-only, `sales` excluded at the type level. Extending `AnalyticsDataTabId` mechanically extends the hook (its `latestRequestIds` literal must gain a `sales` key).
- **Scope/comparison utilities:** `AnalyticsScope.sql` exposes `currentEvent`, `currentAliasedEvent`, `ownedEvent`, `comparisonCurrentRange`, `comparisonPreviousRange`, plus range metadata (`dayCount`, `isAllTime`, comparison label). `comparison.ts` shows the FILTER-pair pattern; `trend.ts` exports `resolveTrendGranularity` + `fetchTrendSpanDays` — both reusable by the sales trend without modification. The inventory's "previous-period infrastructure may be reusable" is verified: **it is, unmodified.**
- **Product Performance GMV today:** both CTE queries select literal `NULL::numeric AS gmv, NULL::text AS currency` (`productPerformance.ts` L138–139, L239–240); `ProductStat`/`CategoryStat` already carry `gmv: number | null` + `currency`, and the D1 card renders the unavailable state. The landing zone for F3/D1 money exists; only the SQL and labels change.
- **Tracking Health/readiness:** `healthInsights.ts` is pure (volume/spike/funnel rules today); Phase 1D adds rung detection (order/GMV/items readiness) to the Overview health payload. Phase 2 consumes the same rung copy for its unavailable states; it does not modify readiness.
- **Benchmark tooling:** 0D-5A seeder is merged (`scripts/benchmark/`, commit `817dec9`); runner/EXPLAIN/baseline land with 0D-5B/C. The 0D-5 §7 matrix covers five data tabs; **Sales = 0 statements is a baseline assumption that Phase 2 invalidates** — §18's rerun triggers ("any change to analytics SQL … composers") fire for Phase 2, and the bench dataset shape rules (0D-5 §6) include `order_id`/`amount`/`currency` but **not `items[]`**, so 2E must extend the bench seeder → new manifest hash → new baseline of record, per 0D-5 §18's own rule ("if the seeder itself changes, a new baseline must be cut and both are kept").

## 6. Order Deduplication Model (normative restatement + edge cases)

Identity `(projectId, order_id)` under tenant scope; extraction/normalization/eligibility per §2.1. The dedup CTE shape (one statement, two aggregation levels — same discipline as the product CTEs):

```
scoped_purchase_events:  scope.sql.currentAliasedEvent ∧ LOWER(name) IN (order-fact family)
                         → projectId, order_id (BTRIM, NULLIF ''), name-priority, createdAt, id,
                           guarded amount (signed parse), normalized currency
orders:                  one row per (projectId, order_id ≠ NULL):
                           representative = min by (priority, createdAt, id) among money-valid events,
                           else min by (priority, createdAt, id) among all events (identity-only order)
sales aggregates:        COUNT(*) orders; per-currency SUM(amount)/COUNT FILTER money-valid;
                         counts: missing-order-id events, unparseable, missing-currency, negative
```

Edge-case rulings (each deterministic, each with its consequence stated):

- **Date range:** an order exists in a range iff ≥1 eligible event is in-range; the representative is chosen **among in-range events only**. Consequence: an order whose purchase event falls in June and whose payment_completed falls in July counts once in June's query and once in July's — each range honestly reports "orders evidenced in this window." Adjacent-range sums may exceed the union's count; this is inherent to range-scoped distinctness, matches how every existing distinct metric here behaves, and is preferable to attributing orders to out-of-range events the query may not even own. Documented in the tab's helper copy ("orders counted by activity in the selected range").
- **Same order multiple times within one range:** once (distinctness).
- **Retries:** absorbed twice over (idempotency at ingest; distinctness at read).
- **Alias variants for one order** (`purchase_completed` + `order_placed` + `payment_completed` sharing an id): one order; representative from the higher-priority order-fact name.
- **Conflicting amounts / currencies:** order counts once; money from the representative per §2.2; the conflict is *observable* (the `dataQuality` counters and, later, Health/I3) but never resolved by averaging, summing, or guessing.
- **Missing / empty / whitespace-only order_id:** not an order; feeds coverage + fallback only.
- **Case sensitivity:** byte-exact after BTRIM (no case folding — see §2.1).
- **Trend bucketing (F1):** each order lands in exactly one bucket — the bucket of its representative event's `createdAt` — so bucket values sum to the range headline. (Deliberate divergence from "count in every bucket where evidenced," which would break the sum-to-total property users will check first.)
- **Representative-rule choice:** "earliest valid, order-fact-first" over "latest event" — argued in §2.2; over "highest amount" (obviously gameable/arbitrary); over "purchase_completed only" (would drop orders evidenced solely by `payment_completed`, which §5/§7 of the contract explicitly wire into dedup).

## 7. Currency Model

- **Normalization (labeling only, never conversion):** `UPPER(BTRIM(currency))`; valid iff `^[A-Z]{3}$`. Invalid/absent ⇒ the event can't be a money representative (§2.2).
- **API shape (adopting the suggested type, extended):**

```ts
currencies: Array<{
  currency: string;        // "INR"
  gmv: number;             // SQL numeric → number at mapping, per-currency sum
  orders: number;          // money-bearing orders in this currency (AOV denominator)
  aov: number | null;      // gmv / orders, null iff orders = 0
  orderShare: number;      // orders ÷ all money-bearing orders (drives dominance + label)
}>  // sorted by orders DESC, then currency ASC (deterministic tiebreak)
```

- **Single-currency scope (the common case):** one row; headline cards show that currency plainly.
- **Mixed currencies:** headline GMV/AOV cards show the **dominant currency** (most money-bearing orders; ties broken by currency ASC), labeled with the contract's own pattern: "INR only — N% of orders in other currencies." The full per-currency table renders below. **No blended number exists anywhere.**
- **Headline Orders** is currency-independent (identity needs no money) — the one all-currency number.
- **Trend (F1):** GMV bars in the **dominant currency only**, labeled; the orders line is all-currency. Per-currency trends are deliberately v1-excluded (payload/complexity without a stated question); revisit only if merchants ask.
- **Previous-period:** Orders delta is all-currency; GMV/AOV deltas are **dominant-currency, same-currency comparisons** (current-period dominant vs the same currency's previous value — never compare INR to USD). If the dominant currency has no previous-period money, the delta is null ("no prior data"), not 0.
- **Unknown/malformed currency:** excluded money, counted in `dataQuality.missingCurrency`, surfaced.
- **No-FX guarantee:** restated in code comments at the aggregation site and in tab helper copy.

## 8. F3 + D1: items[]-Attributed Product/Category Money and Units (in scope per blueprint Part 7)

- **Basis:** line-item revenue — `price × quantity` per `items[]` line on order-fact events, deduped to **one items[] snapshot per distinct order** (same representative rule; the representative's items[] is the order's line set — never sum lines across duplicate events of one order). Guarded numerics per line; lines missing `product_id` are skipped and counted. Per-currency, no FX; a product's row reports its dominant currency with mixed-currency handling identical to §7.
- **Labeling (contract §3, binding):** line-derived money is **labeled as line-item GMV** and the UI notes "line totals may differ from order GMV (fees, discounts, shipping) — neither is adjusted." F3's ranked lists and D1's per-product `gmv` both carry this label. `sum(items)` is never reconciled against `amount`.
- **Confirmed Units Sold (D1):** `SUM(quantity)` (guarded, default 1 when absent-but-line-present? **No** — absent quantity contributes null-line to units, counted as "lines without quantity"; defaulting to 1 fabricates units) across deduped order line-sets, per product. Shown **only where items[] evidence exists**; the "Sessions that purchased" column and its label remain untouched (they answer a different, session-attribution question).
- **Where it computes:** a new fetcher pair in a new `lineItems.ts` module (items[] expansion via `jsonb_array_elements`), consumed by the Products composer (D1 columns) and the Sales composer (F3 ranked lists, top-8 categories / top-15 products, deterministic ORDER BY with tiebreakers). The existing product/category CTEs are **not modified** (their `NULL::numeric` gmv columns are *replaced at the composer level* by lineItems results where present — session-attribution SQL stays frozen, 0D-5 baseline intact for those two statements).
- **Absent items[]:** F3 section and D1 money/units columns show the unavailable state naming `items[]` (rung 6 copy). Partial adoption: computed from the orders that carry items[], with coverage note ("from N of M orders with line items").

## 9. Overview KPI Row (A1 Stage 2) and the F1 Insight

- **KPI row:** the Overview tab's `AnalyticsMetricCards` gains two cards — **GMV** (dominant-currency, labeled, with delta chip) and **Orders** (confirmed count or labeled approximate, with delta chip) — fed by two additive fields on `OverviewTabData` (`salesKpis: { orders, gmv, basis, currency, deltas… } | null`). Null when unavailable → cards render the locked state naming the unlock fields. Implementation reuses the sales module's headline fetcher (one extra statement) + comparison fetcher (one more): **Overview grows from 10–11 to 12–13 concurrent statements against the pg pool of 10.** This is stated, measured (bench smoke in 2C's validation), and *not* mitigated here — pool sizing has an 0D-5 §17 finding and its own evidence bar.
- **F1 insight ("GMV delta rules"):** one rule, in the Sales tab payload (not healthInsights — no cross-tab coupling): when confirmed GMV delta vs previous period exceeds ±25% with ≥10 money-bearing orders in both windows, emit an insight ("GMV fell 32% vs previous 30 days") with severity by magnitude. Rule-based wording only; thresholds are constants beside the builder; no-AI vocabulary.

## 10. API and Type Design

New tab payload (server `summary.ts` sibling types; MIRROR to web `analytics-types.ts`):

```ts
export type SalesBasis = "confirmed" | "session-approximate";
export interface SalesTabData {
  basis: SalesBasis | null;              // null ⇒ fully unavailable
  orders: number | null;                 // basis-scoped headline (null when unavailable)
  ordersWithoutMoney: number;            // confirmed orders lacking parseable money
  dominantCurrency: string | null;
  currencies: CurrencySlice[];           // §7 shape; empty when no money
  aovBasisNote: string | null;           // denominator label (§2.3)
  trend: { granularity: TrendGranularity; points: SalesTrendPoint[] } | null;
  comparison: { orders: PeriodComparison | null; gmv: PeriodComparison | null };  // reuses existing shape
  insights: SalesInsight[];              // §9 rule output (possibly empty)
  productGmv: LineRevenueStat[] | null;  // F3, null ⇒ items[] unavailable
  categoryGmv: LineRevenueStat[] | null;
  dataQuality: {
    purchaseEvents: number; withOrderIdPct: number | null;
    unparseableAmounts: number; missingCurrency: number; negativeAmounts: number;
    lineItemsCoverage: { ordersWithItems: number; ordersTotal: number } | null;
  };
  unavailable: { missingFields: string[]; message: string } | null;  // rung-aligned copy
}
```

Rules: additive-only against Phase 1 responses; every "can't compute" is `null` + named fields, never 0; `basis` is a discriminant the UI must branch on (an unlabeled approximate render is unrepresentable); all arrays deterministically ordered; bigint/Decimal → number exactly once at mapping; MIRROR comments both sides. Statement budget per Sales request: headline dedup aggregate (1) + trend buckets (1) + comparison (1) + line-revenue product/category (2, skipped when a cheap items-existence probe inside the headline query reports none) + span query when all-time (1, sequential) ⇒ **3–6**.

## 11. Frontend Design (Sales tab activation + Overview cards + D1 columns)

- `AnalyticsTabDataMap` gains `sales: SalesTabData`; `isDataTab` special-case for `"sales"` is deleted; the hook's request-id map gains the key. The 0D-4 acceptance line "Sales issues zero requests" is **superseded here by design** — noted so nobody "fixes" it back.
- `SalesTab` becomes a data component: headline cards (GMV [currency-labeled, basis-labeled], Orders [basis-labeled], AOV [confirmed-only]) with delta chips → F1 trend (GMV bars + orders line, existing chart idioms) → per-currency table (when >1 currency) → F3 ranked category/product line-GMV lists → data-quality/coverage strip. Every basis/coverage label from §§2, 6–8 renders as text (never color-alone). The current unavailable card becomes the `unavailable` branch, driven by the payload, copy aligned with Phase 1D rung text.
- Overview: two new KPI cards (§9), locked-state variant included. Products: D1 gains Units Sold + line-GMV columns where present, with the line-item label; existing columns and "Sessions that purchased" untouched.
- A11y + honesty: `role`/heading structure per standards §8; "GMV" never "Revenue"; "near-real-time"; ~375px verified; loading/error/empty per existing `AnalyticsTabPanel` pattern (no new state machinery).

## 12. Branch Sequence

Five branches. The candidate "one big sales branch" was rejected (SQL semantics, tab UI, Overview coupling, product attribution, and benchmarking are five separately-reviewable risk surfaces); a separate "AOV branch" was rejected as too thin (AOV is one derived field of 2A).

| # | Branch | Goal | Depends on |
|---|---|---|---|
| 2A | `feature/sales-analytics-module` | Backend: `sales.ts` (dedup CTE, currency slices, trend, comparison, insight rule, data-quality counters) + `buildSalesSummary` composer + tab union `"sales"` + `SalesTabData` + MIRROR types (unused by UI yet) | Phase 1 merged |
| 2B | `feature/sales-tab-ui` | Frontend: activate the Sales tab per §11 (hook + types + `SalesTab` data component; unavailable branch preserved, now data-driven) | 2A |
| 2C | `feature/overview-gmv-orders-kpi` | Overview KPI row gains GMV + Orders cards; `OverviewTabData.salesKpis` additive; bench smoke reported | 2A (reuses fetchers) |
| 2D | `feature/product-line-revenue` | `lineItems.ts` module; F3 ranked lists into the Sales payload/UI; D1 Units Sold + line-GMV columns; labels per §8 | 2A (order dedup rule), 2B (Sales tab sections) |
| 2E | `feature/sales-benchmark-extension` | Bench seeder gains `items[]` (+ mixed-currency + missing-money shapes); 0D-5 matrix gains `sales` cells; full rerun; **new baseline of record cut and committed** per 0D-5 §18 | 2A–2D merged; 0D-5B/C tooling merged |

**Per-branch detail:**

**2A** — Files: `analytics/sales.ts` (new), `analytics/summary.ts` (union + composer + types), controller `isAnalyticsTab` (add `"sales"`), web `analytics-types.ts` (mirror only). Schema: none. API: new tab value; existing tabs byte-identical. Steps: dedup CTE per §6 → currency aggregation §7 → trend (reuse `resolveTrendGranularity`/span) → comparison via existing fragments → builders (pure, testable) → insight rule §9. Edge cases: empty scope; order-id-less store (fallback basis); zero-in-range-but-confirmed-capable (true zero); mixed currency; negative/malformed money; conflicting per-order currencies; all-time span. Validation matrix: curl `?tab=sales` across {all, one project} × {24h, 7d, 30d, custom, all} on the Phase-1F seed; hand-verify dedup against SQL spot queries (`SELECT COUNT(DISTINCT …)`); confirm every §2 null-vs-zero ruling with a fixture project; existing five tabs response-diffed byte-identical. Acceptance: §2 definitions demonstrably hold; deterministic output across repeated runs. Commit: `feat: add sales analytics module with confirmed orders and gmv`.

**2B** — Files: web `analytics-types.ts`, `useAnalyticsTabData.ts`, `SalesTab.tsx`, small presentational cards. Steps per §11. Edge cases: basis labels, unavailable branch, single vs mixed currency, delta-null rendering. Validation: full tab matrix in browser; network panel (sales fetches once, cached revisit zero requests); a11y/375px; copy sweep. Acceptance: no unlabeled approximate value can render; unavailable copy names fields. Commit: `feat: activate sales tab with gmv and orders analytics`.

**2C** — Files: `summary.ts` (Overview composer + type), `AnalyticsMetricCards.tsx`, mirror types. Steps: reuse 2A fetchers; additive `salesKpis`; locked-card variant. Edge cases: unavailable (null) rendering; approximate basis chip label; delta nulls. Validation: Overview response diff = additive only; **0D-5 small-tier bench smoke with the Overview delta reported honestly** (statement count 12–13 vs pool 10 — record the wait, change nothing). Acceptance: KPI cards match Sales-tab headline values exactly (same fetcher — assert in manual check). Commit: `feat: add gmv and orders to overview kpi row`.

**2D** — Files: `analytics/lineItems.ts` (new), `sales.ts`/`summary.ts` wiring, `productPerformance` composer-level merge (SQL of existing CTEs untouched), Products/Sales UI columns/sections, mirrors. Steps: `jsonb_array_elements` expansion over deduped representative events → per-product/category per-currency sums + units → top-N ordered lists. Edge cases: lines without product_id/quantity (counted, skipped per §8); orders with duplicate items[] across events (representative snapshot only); mixed currency per product; >16KB never arrives (envelope). Validation: seed spot-checks (hand-compute one product's line GMV from raw properties); partial-coverage label correctness; products tab diff shows only new fields. Acceptance: contract §3 labeling verbatim-faithful ("line totals may differ from order GMV"); units never defaulted. Commit: `feat: add line-item gmv and units sold attribution`.

**2E** — Files: `scripts/benchmark/` seeder + runner matrix config + `benchmarks/baselines/`. Steps: extend bench dataset shape (items[] on a deterministic majority of purchases; a mixed-currency project; missing-money minority) → seed all tiers → extend matrix with `sales` cells (and Overview's changed cost) → full rerun → cut + commit the new baseline alongside the old (both kept, manifest hashes distinguish). Edge cases: anchor-drift rule respected; dataset determinism re-proven (double-seed manifest diff). Validation: 0D-5 §19-style checks; comparison report old-vs-new baseline with the Phase-2 deltas called out (new statements are *expected* movements, documented, not regressions). Acceptance: sales cells present at all tiers; new baseline of record committed; findings filed for any budget breach (0D-5 §21 template). Commit: `feat: extend analytics benchmarks to sales tab`.

## 13. Temporary Verification Strategy (pre-Phase 9)

Same discipline as Phases 0M/1: per-branch matrices pasted into PRs; SQL spot-verification of dedup (independent hand-written `COUNT(DISTINCT)` queries against the same DB — the metric's most falsifiable claim gets the most direct check); fixture project exercising every §2 edge (script-inserted events via the ingest API: duplicate order ids, conflicting amounts, `"1,299"`, negative, missing currency, `ORD1`/`ord1`, cross-project id reuse, payment-only order evidence); determinism double-runs; response byte-diffs for untouched tabs; honest runtime-vs-inspection reporting (standards §18.7). None of this replaces Phase 9 tests; the fixture set is written down in the 2A PR so Phase 9 can lift it into golden tests.

## 14. Acceptance Criteria (phase-level)

1. Sales tab live behind `?tab=sales` with §2-exact semantics; five pre-existing tabs byte-identical except Overview's additive `salesKpis` and Products' additive line fields.
2. Confirmed Orders/GMV/AOV match hand-verified SQL on seed + fixture data, including every §6 edge ruling.
3. Basis discipline holds end-to-end: no code path sums or swaps confirmed and approximate values; UI cannot render an unlabeled approximation (type-level discriminant).
4. Mixed-currency scopes show per-currency rows + labeled dominant headline; grep-proof: no FX rate, no blended total anywhere.
5. Null-vs-zero rulings verified per §2 (fixture-backed).
6. F3/D1 line money + units labeled per contract §3; absent items[] shows rung-6 copy.
7. No Prisma migration in the diff range; no Phase 1 validation behavior change (ingest matrix re-run clean).
8. Benchmark: new baseline of record committed with sales cells; Overview cost delta recorded as a finding, not silently absorbed.
9. All branches: typecheck/build/lint/`git diff --check` green; honest verification reports.

## 15. Stop Conditions (excluded even if "almost free")

F4 payments analysis or any failure *rate* · refund/cancel math · net revenue · LTV · coupon impact · monetary Top Shoppers (Phase 3 unlocks) · per-currency trend series · FX of any kind · order tables/materialized views/rollups/caches/indexes · occurredAt/batch/SDK/async · Health grading changes (Phase 4 I3) · renaming the Sales tab. A Phase 2 branch proposing any of these is out of scope by definition.

## 16. Complete Codex Prompts (Codex 5.6 Sol Ultra)

**Prompt 2A — `feature/sales-analytics-module`**

> EventPulse repository, `apps/server` (+ one mirror-type edit in `apps/web`). Phases 0D-5, 0M, and 1 are merged. Implement **Phase 2A only**: the sales analytics backend. Clean tree confirmed; the human owner creates branch `feature/sales-analytics-module` — never create/switch branches or commit yourself.
>
> **Read first, edit second:** `~/.claude/plans/phase-2-gmv-orders-implementation-workflow.md` §§2, 6, 7, 9–10, 12 row 2A (binding metric semantics — do not improvise); contract §§2, 3, 5, 7 and blueprint Principles 2/3/6/11 + F1/F2 (authority); `apps/server/src/analytics/` in full (scope fragments, composer pattern, `comparison.ts`, `trend.ts` exports, alias constants via the contract module); standards §§4–6, 9, 18.
>
> **Scope — exactly this:** (1) `analytics/sales.ts`: fetchers taking `AnalyticsScope` first, using only `scope.sql.*` for ownership/time; the §6 dedup CTE (identity `(projectId, BTRIM(order_id))`, case-sensitive, order-fact-family names from the contract module's constants, representative = order-fact-priority → earliest `createdAt` → smallest `id`, guarded signed numeric parse, `UPPER(BTRIM(currency)) ~ '^[A-Z]{3}$'`); per-currency aggregates + data-quality counters; trend buckets (representative-event bucketing; reuse `resolveTrendGranularity`/`fetchTrendSpanDays` unmodified); previous-period FILTER-pair comparison via the existing comparison fragments; session-approximate fallback fetch (distinct purchasing sessions + one-amount-per-session) used only when zero confirmed orders exist; pure builders for `SalesTabData` per §10 incl. the ±25%/≥10-orders GMV-delta insight and every null-vs-zero ruling in §2. (2) `summary.ts`: `SalesTabData` + `buildSalesSummary`; extend the tab union; controller `isAnalyticsTab` accepts `"sales"`. (3) Web `analytics-types.ts`: mirrored types only (UI unchanged), `// MIRROR:` both sides. Forbidden: schema/migrations, index changes, edits to existing analytics SQL, FX or blended totals, payment/refund math, frontend behavior, Phase 1 validation changes.
>
> **Validation (run, report actual output):** `bun run typecheck` · `bun run build` · lint on touched files · `git diff --check`. Against the seeded dev DB: curl `?tab=sales` for {all-projects, one project} × {24h, 7d, 30d, one custom, all}; paste one response and annotate each §2 ruling it demonstrates. Independently verify dedup: run your own `SELECT COUNT(DISTINCT ("projectId", BTRIM(properties->>'order_id')))`-style spot query and show it matches the API. Build a small fixture project via the ingest API covering: duplicate order ids across purchase+payment events, conflicting amounts, `"1,299"`, `-50`, missing currency, `ORD1` vs `ord1`, an order evidenced only by `payment_completed` — show each lands per spec. Diff all five existing tab responses pre/post: byte-identical. Report runtime-verified vs inspected. **Do not commit** — propose `feat: add sales analytics module with confirmed orders and gmv` and stop.

**Prompt 2B — `feature/sales-tab-ui`**

> EventPulse repository, `apps/web` — **read `AGENTS.md` first: this Next.js version differs from your training data; consult `node_modules/next/dist/docs/` before writing React/Next code.** Phase 2A is merged. Implement **Phase 2B only**: activate the Sales tab. Human owner creates `feature/sales-tab-ui`.
>
> **Read first:** workflow §§7, 10, 11, 12 row 2B; `useAnalyticsTabData.ts`, `analytics-types.ts`, `AnalyticsTabs.tsx`, `AnalyticsTabPanel.tsx`, `SalesTab.tsx`, `OverviewTab.tsx`/`ConversionTab.tsx` (idioms), `HourlyTrendChart.tsx` (chart pattern); standards §§7, 8.
>
> **Scope — exactly this:** add `sales: SalesTabData` to `AnalyticsTabDataMap`; remove the `sales` special-case in `isDataTab`; extend the hook's request-id literal; rebuild `SalesTab` as a data component per workflow §11: headline GMV/Orders/AOV cards (currency + basis labels as text; delta chips reusing `MetricComparisonChip`), F1 trend (GMV bars + orders line), per-currency table when >1 currency, data-quality/coverage strip, and the `unavailable` branch preserving today's copy shape (fields chips) driven by the payload. Basis labeling is mandatory everywhere a `session-approximate` value renders ("approximated by purchasing sessions"); AOV renders "—" + order_id hint on that basis. Wire the panel in `AnalyticsOverview.tsx` exactly like existing data tabs. Forbidden: new fetch machinery, tab renames, Overview/Products changes (2C/2D), any client-side metric math beyond formatting.
>
> **Validation:** typecheck · build · lint · `git diff --check` · browser matrix: {seeded project with orders, fixture mixed-currency project, project with zero order_ids (approximate labels visible), empty project (unavailable branch)} × {ranges incl. custom + all}; network panel: one request per scope, cached revisit zero requests, refresh refetches sales only; a11y pass (headings, text-not-color labels, `role="alert"` errors) and ~375px. Copy sweep: "GMV" never "Revenue", no AI wording. Report honestly. **Do not commit** — propose `feat: activate sales tab with gmv and orders analytics` and stop.

**Prompt 2C — `feature/overview-gmv-orders-kpi`**

> EventPulse repository (server + web). Phases 2A–2B merged. Implement **Phase 2C only**: Overview KPI cards. Human owner creates `feature/overview-gmv-orders-kpi`. **Read `AGENTS.md` before web edits.**
>
> **Read first:** workflow §9, §12 row 2C; blueprint A1 Stage 2; `summary.ts` (`buildOverviewSummary`), `sales.ts` fetchers, `AnalyticsMetricCards.tsx`.
>
> **Scope — exactly this:** additive `salesKpis` on `OverviewTabData` (orders + dominant-currency GMV + basis + same-currency deltas, null when unavailable), computed by reusing the 2A headline + comparison fetchers inside the Overview composer's `Promise.all` (do not serialize anything); two new KPI cards with delta chips and a locked-state variant naming `order_id`/`amount`/`currency`; MIRROR updates. Nothing else changes in the Overview payload.
>
> **Validation:** typecheck · build · lint · `git diff --check` · Overview response diff pre/post shows only the additive key (paste) · KPI values equal the Sales tab headline for the same scope (same fetchers — verify side-by-side) · locked state renders on a project without order data · **run the 0D-5 small-tier benchmark smoke and report the Overview statement count and latency delta honestly** (expect 12–13 concurrent statements vs pool max 10 — record, do not fix, file the observation per 0D-5 §21). **Do not commit** — propose `feat: add gmv and orders to overview kpi row` and stop.

**Prompt 2D — `feature/product-line-revenue`**

> EventPulse repository (server + web). Phases 2A–2C merged. Implement **Phase 2D only**: items[]-attributed line GMV and Units Sold (F3 + D1). Human owner creates `feature/product-line-revenue`. **Read `AGENTS.md` before web edits.**
>
> **Read first:** workflow §8, §12 row 2D; contract §3 (line-item entity; "both are stored; neither is reconciled"), §5 purchase items[] shape; blueprint F3 + D1 ("Units Sold appears only where purchase events carry product_id or items[]"); `productPerformance.ts` (its two CTE statements are **frozen** — you merge at composer level only), `sales.ts` dedup CTE (reuse the representative rule).
>
> **Scope — exactly this:** (1) `analytics/lineItems.ts`: over deduped representative order events, expand `jsonb_array_elements(properties->'items')`; per line: `BTRIM`ed `product_id` (skip + count when absent), guarded `price`/`quantity`; per-product and per-category per-currency sums + `SUM(quantity)` units + coverage counters; top-15 products / top-8 categories, deterministic ORDER BY with tiebreakers; never default a missing quantity to 1. (2) Sales payload/UI: F3 ranked lists + coverage line ("from N of M orders with line items"). (3) Products D1: additive Units Sold + line-GMV columns where evidence exists, labeled "line-item GMV — may differ from order GMV (fees, discounts, shipping)"; existing columns, labels, and the two existing CTE queries byte-identical. MIRROR updates. Forbidden: reconciling `sum(items)` vs `amount`, touching session-attribution SQL, FX, schema.
>
> **Validation:** typecheck · build · lint · `git diff --check` · hand-compute one seeded product's line GMV and units from raw `properties` and match the API (paste both) · partial-coverage label correct on the seed's deliberate items[]-less minority · products tab response diff shows only additive fields · mixed-currency product renders per-currency correctly · rung-6 unavailable copy on an items[]-less project. **Do not commit** — propose `feat: add line-item gmv and units sold attribution` and stop.

**Prompt 2E — `feature/sales-benchmark-extension`**

> EventPulse repository, `apps/server/scripts/benchmark/` + `benchmarks/`. Phases 2A–2D merged; 0D-5 tooling (seeder/runner/explain/baselines) merged. Implement **Phase 2E only**: benchmark coverage for the now-dynamic Sales tab. Human owner creates `feature/sales-benchmark-extension`.
>
> **Read first:** `~/.claude/plans/analytics-query-performance-phase-0d5.md` §§5–7, 12, 13, 18–21 (binding procedure — especially §18: a seeder change requires cutting a **new** baseline of record and keeping both); workflow §12 row 2E; the bench seeder and runner as merged.
>
> **Scope — exactly this:** (1) extend the bench dataset generator deterministically: items[] on a fixed majority of purchase orders (line shapes per contract §3), one mixed-currency project, a deterministic minority of purchases with missing/malformed money and missing order_id (so sales-tab edge paths are benchmarked, not just happy paths); bump the dataset manifest identity. (2) Add `sales` to the runner's tab matrix (all scopes/ranges per 0D-5 §7 tier rules) and include Overview's changed shape. (3) Reseed all tiers, run the full matrix + EXPLAIN protocol, and cut + commit the new baseline of record per 0D-5 §12/§18 — old baselines stay. File findings (0D-5 §21) for the sales statements and the Overview 12–13-vs-pool-10 observation; expected Phase-2 cost movements are documented as expected, not regressions. Forbidden: production/dev DBs (bench guard rules), index/SQL changes, runner redesign.
>
> **Validation:** determinism double-seed manifest diff (counts identical) · full-matrix run with zero errored cells · sales cells present at all tiers · new baseline committed with environment block + manifest hash · comparison report old-vs-new baseline attached. **Do not commit** — propose `feat: extend analytics benchmarks to sales tab` and stop.

---

## Dependency Graph

```
Phase 1 (1A contract module … 1F seed) ──► 2A feature/sales-analytics-module
                                              ├─► 2B feature/sales-tab-ui ──► 2D feature/product-line-revenue
                                              └─► 2C feature/overview-gmv-orders-kpi      │
0D-5 B/C (runner + baseline) ────────────────────────────────► 2E feature/sales-benchmark-extension ◄── 2A–2D
                                                                    │
                                                                    ▼
                                        Phase 3 — Shopper MVP (B3 repeat purchase & B4 ranking consume order identity)
```

## Recommended Execution Order

Phase 1 complete → **2A → 2B → 2C → 2D → 2E** → Phase 3. (2B/2C may run in parallel after 2A if two implementers exist; 2E is strictly last.)

## Branch and Commit Summary

| Branch | Commit message |
|---|---|
| `feature/sales-analytics-module` | `feat: add sales analytics module with confirmed orders and gmv` |
| `feature/sales-tab-ui` | `feat: activate sales tab with gmv and orders analytics` |
| `feature/overview-gmv-orders-kpi` | `feat: add gmv and orders to overview kpi row` |
| `feature/product-line-revenue` | `feat: add line-item gmv and units sold attribution` |
| `feature/sales-benchmark-extension` | `feat: extend analytics benchmarks to sales tab` |

## Codex Model Guidance

Codex 5.6 Sol Ultra **required** for 2A and 2D (metric-semantics fidelity; SQL with money on the line) and recommended for 2B/2C (labeling discipline is correctness here, not polish). 2E is procedural but 0D-5's safety rules make careless execution expensive — Sol Ultra recommended. All prompts: human-owned branching/commits, honest runtime-vs-inspection reporting.

## Cross-Phase Risks

| Risk | Mitigation |
|---|---|
| Dedup rule subtly wrong (the flagship number) | §2/§6 written to be falsifiable; independent hand-SQL verification is a hard 2A validation step; fixture project covers every edge |
| Approximate values leaking into confirmed surfaces | Type-level `basis` discriminant; AOV confirmed-only; acceptance #3 greps + fixture renders |
| Currency mixing / accidental blending | Per-currency-only aggregation; no blended field exists in the type; acceptance #4 grep for FX/blends |
| Overview statement count vs pool 10 worsens | Measured in 2C + rebaselined in 2E; finding filed; fix deferred to the 0D-5 §14/§17 evidence path |
| 0D-5 baseline invalidated silently | 2E cuts a new baseline of record per §18's own seeder-change rule; both kept; expected deltas documented |
| Blueprint "Revenue" vs shipped "Sales" naming confusion | Mapping stated (§5); tab is activated, never renamed |
| Contract line-revenue vs order-GMV conflation (F3) | §8 labels are acceptance criteria; `sum(items)` never reconciled against `amount` |
| Scope creep into F4/refunds ("data is right there") | §15 stop list; payment events used **only** as order evidence, never as payment analytics |
| Range-boundary double counting misread as a bug | §6 consequence documented + helper copy in the UI; spot-check included in 2A matrix |

## Final Definition of Done

All §14 criteria hold; five branches merged with pasted validation matrices; the fixture set from §13 is recorded in the 2A PR for Phase 9 to adopt as golden tests; the new benchmark baseline of record is committed with the Phase-2 deltas explained; the debt/findings registers are updated (Overview pool observation, any budget breaches); and Phase 3 can start by consuming order identity for B3/B4 without touching Phase 2 code.

---
*Prepared read-only at commit `817dec9` (branch `feature/benchmark-runner`, clean tree). No source files were modified; no permanent planning documents were modified; this workflow file is the only planning artifact created.*
