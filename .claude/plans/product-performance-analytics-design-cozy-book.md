# EventPulse — Final Analytics Blueprint (v2, Corrected & Permanent)

This document supersedes v1 and is the permanent analytics roadmap. Design only — no implementation, SQL, or code.

---

# Part 0 — Revision Log: Suggestion Decisions

| # | Suggestion | Decision | Reason |
|---|---|---|---|
| 1 | Rename "AI Insights" → "Automated Commerce Insights" | **Accepted** | Matches the honesty principle already in the design; the old name contradicted "no AI/ML claims." |
| 2 | Orders = COUNT DISTINCT order_id, fallback distinct purchasing sessions, never raw event counts | **Accepted + extended** | Correct, and demonstrably needed: the current seed emits `purchase_completed` *and* `payment_completed` in one session — raw counts double-count. **Extension:** GMV must dedupe the same way (one amount per distinct order, not per event), otherwise GMV inflates identically. Fallback bias noted: session fallback *undercounts* multi-order sessions — acceptable, and the UI labels the basis. |
| 3 | Commerce Tracking Contract phase before revenue | **Accepted** | Revenue/attribution correctness is a data-contract problem before it is a query problem. Stays properties-only (no schema change). One refinement added: `items[]` guidance must respect the existing 16KB properties cap. |
| 4 | Separate "sessions that later purchased" from "confirmed product purchases" | **Accepted** | Real correctness flaw: viewing A and B then buying B currently credits both. Session-outcome attribution stays (it's honest *if labeled honestly*); "Units Sold"/"Product Purchases" only with product-attributed purchase evidence (`product_id` or `items[]` on purchase events). |
| 5 | Split Phase 0 into smaller branches | **Accepted (superseded by #13's finer split)** | Matches how this repo actually ships (small reviewable branches). #13's 0A–0D version is adopted as the canonical split. |
| 6 | Metrics Catalog → incremental shared module first | **Accepted** | Prevents a big-bang framework. Start as one documented shared module (`commerce-metrics`-style: aliases, formulas, guarded money parsing, order identity, scope rules); formalize only when dashboard + insights + alerts all consume it. |
| 7 | Project-scoped shopper identity; all-projects uses (projectId, customerId) | **Accepted** | Same `customer_001` on two stores is two people. v1 flagged this as a limitation; v2 makes it the rule. All-projects "Unique Shoppers" is labeled as store-customer pairs. |
| 8 | Repeat Purchase Rate scoped + labeled "in Selected Period", distinct orders | **Accepted** | Removes range ambiguity; consistent with #2. Lifetime returning-buyer metric deferred separately. |
| 9 | Payment failure rate needs a trustworthy denominator, else count only | **Accepted** | Extends the "no fabricated percentages" principle to denominators. Preferred: distinct `payment_attempt_id` (contract addition); fallback: sessions containing completed-or-failed; else show counts without a rate. |
| 10 | Rename Revenue metrics → GMV | **Accepted** | `amount` on purchase events is gross merchandise value, not net revenue. Tab keeps the friendly name "Revenue"; every displayed metric says GMV until refunds/cancellations/net adjustments exist. |
| 11 | Event-specific data-quality rules | **Accepted** | Sharper and cheaper than blanket checks; the proposed rule list is adopted verbatim, plus "unknown commerce event names" and "pre-session events excluded" — both good. |
| 12 | Avoid "real-time" wording | **Accepted with modification** | Accepted for analytics surfaces (they are request-time aggregations → "near-real-time", "computed from ingested events"). **Modification:** alert evaluation genuinely runs at ingestion time, so the existing Alerts copy ("evaluated in real time as matching events are ingested") is factually accurate and stays. |
| 13 | Reordered roadmap (0A–0D, contract, GMV, shoppers, …) | **Accepted** | Strictly better sequencing: in-flight work merges first, structure before content, contract before money. One consequence made explicit: the KPI row ships in 0C with the four metrics available today; GMV & Orders KPIs join in Phase 2. |
| 14 | Postpone Coupon Impact, monetary Top Shoppers, device analytics until contract stable | **Accepted for coupons & monetary ranking; rejected rationale for device** | Coupon Impact needs AOV/order identity → correctly post-contract. Top Shoppers ships in Shopper MVP ranked by orders/sessions; monetary ranking unlocks when GMV data is trustworthy. **Device analytics does not depend on the commerce contract at all** — it reads the stored `userAgent` column; its real dependency is UA parse quality. It was already sequenced in the Behavior phase (post-contract chronologically), so no move needed — but the stated rationale is corrected. |

No suggestion was rejected outright; two rationales were corrected (#12 alerts wording, #14 device dependency), and #2 was strengthened beyond the proposal.

---

# Part 1 — Context & Principles

EventPulse is **commerce analytics for e-commerce and quick-commerce stores** — not a generic Mixpanel clone, not Datadog. Analytics grew card-by-card into 14 cards on one scroll with overlapping stories. This blueprint finalizes the whole module — merges, removals, new features, order of construction — so implementation proceeds phase-by-phase with **no future redesign**.

**Non-negotiable principles (v2 — expanded):**
1. **Sessions are the canonical conversion basis.** Event counts are diagnostic volume, never conversion.
2. **No fabricated data.** Honest empty/degraded states; no percentage without a trustworthy denominator (this now explicitly covers denominators, per #9).
3. **Order identity:** Orders = COUNT DISTINCT `order_id` when present; fallback = distinct purchasing sessions, **visibly labeled** ("order counts approximated by purchasing sessions"); never raw purchase-event counts. **GMV dedupes the same way** — one amount per distinct order.
4. **Money = GMV** until refund/cancellation/net adjustments exist. Labels say GMV.
5. **Shopper identity is project-scoped:** the identity key is `(projectId, customerId)`. All-projects shopper counts aggregate store-customer pairs and are labeled as such.
6. **Product attribution honesty:** session-outcome attribution ("sessions that later purchased") is distinct from confirmed product purchases (requires `product_id`/`items[]` on the purchase event). UI language never claims the stronger form with the weaker data.
7. **Insights are rule-based** and labeled as such — the section is named *Automated Commerce Insights*.
8. **One shared metric-definition module** (incremental, not a framework): aliases, conversion formulas, guarded money parsing, order identity, scope rules. Dashboard, insights, and alerts must consume the same definitions to prevent drift.
9. **Every number obeys the same scope:** tenant → project → time range; "previous period" = the immediately preceding equal-length range.
10. **Wording:** analytics are "near-real-time / computed from ingested events at request time." Only alert evaluation (which runs at ingestion) may say "evaluated in real time as events are ingested."
11. **Progressive Analytics Capability.** A store never has to implement the complete Commerce Tracking Contract to start using EventPulse. A minimal event set (names + customerId/sessionId) immediately receives every analytics feature that can be computed *accurately* from that data; as recommended fields appear in a store's events (`order_id`, `items[]`, `amount`, `payment_attempt_id`, …), richer analytics **unlock automatically** — no product changes, no configuration. The corollary of Principle 2: metrics that cannot be computed accurately stay **unavailable, never estimated or silently approximated**, and every unavailable metric states exactly which tracking fields unlock it. Tracking Health (A3 + I3) surfaces the missing recommended fields so developers always know the next tracking step. Capability tiers, roughly: names-only → funnels/trends/top-events on the events basis; + customerId/sessionId → session conversion, shopper analytics; + product fields → product/category performance; + order_id/amount → GMV, orders, AOV; + items[] → confirmed product purchases/units; + payment_attempt_id → payment failure *rates*. This philosophy governs every future analytics feature. *(Scope note: this defines runtime behavior for customers, not build order — the Part 7 roadmap stays sequential because later analytics depend on earlier infrastructure.)*

---

# Part 2 — Audit of the Current Dashboard (verdicts)

| # | Current card | Verdict | Why |
|---|---|---|---|
| 1 | KPI row (Total Events, Events Today, Unique Event Names, Active Projects, Avg Events/Day) | **Redesign** | Counts events, not business. Owner's 5-second question is "am I selling?" |
| 2 | Shoppers & Sessions | **Merge into KPI row** | Three headline KPIs pretending to be a section. |
| 3 | Previous Period card | **Merge into KPI deltas** | Deltas belong as chips on each KPI, not a standalone card. |
| 4 | Event Health | **Merge with Key Insights** | Two cards, one job: "is anything wrong?" |
| 5 | Key Insights | **Keep (hosts the merge)** | Rule engine is a keeper; rules expand (Part 3 §K). |
| 6 | Session Funnel | **Keep — becomes THE funnel** | Honest conversion story. |
| 7 | Commerce Funnel (event-count) | **Merge as toggle** | One "Conversion Funnel" card, `Sessions | Events` toggle, sessions default; friction chips survive. |
| 8 | Product Performance | **Keep + relabel attribution** | Core value; purchase column relabels to "Sessions that purchased" until line-item data exists (Principle 6). |
| 9 | Category Performance | **Keep** | Pairs with #8. |
| 10 | Event Trend | **Keep** | Overview backbone; purchases overlay later. |
| 11 | Top Events | **Keep, demote to Behavior tab** | Diagnostic, not commerce insight. |
| 12 | Events by Project | **Remove from Analytics** | Header already scopes by project; account Overview owns cross-project. |
| 13 | Recent Activity | **Remove from Analytics** | Events page owns the stream. |
| 14 | Top Property Keys | **Retire** | Key names answer no business question; superseded by Property Segmentation (G2). |

Net: 14 cards → ~7 surfaces on the new Analytics Overview, rest organized into tabs.

---

# Part 3 — Feature Catalog by Section

Format — header: **Name — Tier | Complexity | Placement**; then **Q** (business question) · **M** (metrics) · **V** (visualization) · **I** (insights) · **D** (dependencies).

## A. Core Business Analytics (Analytics → Overview tab)

### A1. Executive KPI Row — MVP | Medium | Overview, top
- **Q:** "How is my store doing right now?"
- **M:** Ships in two stages. Stage 1 (Phase 0C): Sessions · Session Conversion Rate (purchasing sessions ÷ sessions) · Unique Shoppers (project-scoped identity) · Events — each with vs-previous-period delta chips. Stage 2 (Phase 2 adds): **GMV** · **Orders** (distinct order_id, session fallback labeled).
- **V:** Stat cards with ▲/▼/flat delta chips; micro-sparklines later.
- **I:** Delta magnitude feeds the insight engine.
- **D:** Absorbs Shoppers & Sessions + Previous Period cards; sessionFunnel; Phase 1 contract + Phase 2 for money KPIs.

### A2. Event Trend — MVP (exists) | Small enhancement | Overview
- **Q:** "Is activity growing? When are peaks?" **M:** events/bucket; optional purchases-per-bucket overlay. **V:** existing trend + toggled overlay line. **I:** existing spike rules. **D:** purchase aliases (exist).

### A3. Health & Insights Panel — MVP | Small merge + Medium rules | Overview
- **Q:** "Is anything wrong today?"
- **M:** Health score + expanded rule library (§K1) + event-specific data-quality rules (§I3).
- **V:** Score badge as header, severity-styled insight list beneath.
- **I:** This *is* the insight surface. **D:** merges existing two cards.

### A4. Conversion Funnel Snapshot — MVP | Small | Overview
Compact read-only mini-funnel linking to the Conversion tab; same data as E1.

## B. Shopper Analytics (Analytics → Shoppers tab)

### B1. Active Shoppers Trend — MVP | Medium | Shoppers, top
- **Q:** "How many distinct shoppers, and growing?" **M:** daily/weekly/monthly unique `(projectId, customerId)` in range. **V:** trend, granularity follows range. **I:** shopper-count delta rules. **D:** customerId (exists); pre-session rows excluded and disclosed (I3 rule).

### B2. New vs Returning Shoppers — MVP | Medium | Shoppers
- **Q:** "Acquiring or living off repeats?"
- **M:** **New** = customerId whose *earliest event in the selected project* falls inside the range. **Returning** = active in range, earliest event before it. All-projects mode keys on (projectId, customerId).
- **V:** stacked trend + split summary. **I:** "78% new — retention opportunity." **D:** first-seen lookup (index exists).

### B3. Repeat Purchase Rate (Selected Period) — MVP | Small–Medium | Shoppers
- **Q:** "Do buyers buy again *within this period*?"
- **M:** purchasing shoppers with ≥2 **distinct orders** in range (order_id; session fallback labeled) ÷ purchasing shoppers; avg orders per buyer.
- **V:** stat pair + delta. **I:** low-repeat rule. **D:** order identity (Principle 3). Lifetime returning-buyer metric is a separate, later feature — not mixed into MVP.

### B4. Top Shoppers — Advanced | Small | Shoppers
- **Q:** "Who are my most valuable customers?" **M:** ranked by **distinct orders, then sessions** at launch; **GMV ranking unlocks post-contract** when monetary data is trustworthy. **V:** ranked list; note IDs are store-provided pseudonyms. **I:** concentration rule. **D:** order identity; GMV (Phase 2) for monetary mode.

### B5. Shopper Profile Drilldown — Advanced | Medium–Large | Click-through (B4, Events drawer)
- **Q:** "What did this customer do?" (support/VIP/fraud). **M:** sessions, first/last seen, orders, GMV, event timeline. **V:** drawer/page, chronological session groups. **I:** none — investigation tool. **D:** B-series + C-b; establishes the drilldown pattern.

## C. Session Analytics — a lens, not a tab (folded into Conversion + Shoppers)
Standalone "Session Analytics" would duplicate funnel outcomes and shopper frequency. Two features survive:

### C-a. Session Quality Metrics — Advanced | Medium | Shoppers, lower
- **Q:** "How engaged is a typical visit?" **M:** median events/session, median duration (first→last event), sessions per shopper. **V:** stat row; histogram later. **I:** sparse-tracking data-quality rule. **D:** sessionId timestamps (exist).

### C-b. Session Timeline Drilldown — Advanced | Medium | From Events drawer / B5
- **Q:** "What happened in this visit before abandonment?" **M:** ordered events of one session + outcome badge. **V:** vertical timeline. **I:** none. **D:** sessionId (exists).

*Not built separately:* session-outcome donut (funnel tells it), session replay (never-build).

## D. Product Analytics (Analytics → Products tab)

### D1. Product Performance — MVP (exists) | Small relabel | Products, primary
Session-based views/carts/**sessions-that-purchased** per product. **Attribution correction (Principle 6):** the purchase column is labeled *"Sessions that purchased"* (post-interaction purchase sessions), with helper copy; **"Units Sold" / "Product Purchases" appear only where purchase events carry `product_id` or `items[]`.** Enhancements: sorting + in-card search.

### D2. Category Performance — MVP (exists) | — | Products
Same attribution language rules as D1.

### D3. Product Detail Drilldown — Advanced | Medium | Click-through from D1
- **Q:** "Why is this product underperforming?" **M:** per-product trend of views/carts/purchase-outcome sessions, confirmed units where available, stock-outs, GMV. **V:** drawer with mini-trend + stat grid. **I:** product-level correlation rules (later). **D:** D1 + trend bucketing.

### D4. Stock-out Impact — Advanced | Medium | Products
- **Q:** (quick-commerce differentiator) "How much demand is lost to unavailability?" **M:** stock-out/unavailable events per product; sessions that hit stock-out and did not purchase. **V:** ranked bars + trend. **I:** "Milk 1L: 34 stock-out sessions, 0 purchased." **D:** friction aliases + sessionId (exist).

## E. Conversion Analytics (Analytics → Conversion tab)

### E1. Unified Conversion Funnel — MVP (merge) | Medium | Conversion top (+A4 snapshot)
- **Q:** "Where do shoppers drop off?" **M:** 4 steps; **Sessions** basis default (distinct sessions, abandonment counts), **Events** basis toggle (volume diagnostic); friction chips stay. **V:** existing horizontal-bar funnel + basis toggle + biggest-drop badge. **I:** existing drop-off threshold rules — computed on session basis only. **D:** both funnels exist; this is a UI/API merge.

### E2. Abandonment Over Time — MVP | Medium | Conversion
- **Q:** "Is abandonment getting better or worse?" **M:** per bucket: cart-abandonment, checkout-abandonment, payment-failure rates (failure rate obeys §F4 denominator rules). **V:** multi-line trend. **I:** worsening-trend rule. **D:** session funnel × trend bucketing (composition of existing pieces).

### E3. Time to Convert — Advanced | Medium | Conversion
- **Q:** "How long from first view to purchase?" **M:** within-session median/p75 minutes; distribution buckets. **V:** stat + histogram. **I:** impulse-window observations. **D:** sessionId timestamps.

### E4. Custom Funnel Builder — Advanced | Large | Conversion — **postponed pool**
User-defined ordered steps, session-based, saved per project. Build only after fixed funnels are polished; generalizes the E1 component.

## F. Revenue Analytics (Analytics → "Revenue" tab — metrics labeled GMV)

*All F-features degrade honestly without monetary data: "—" + tracking hint. All depend on Phase 1 (Commerce Tracking Contract) + order identity.*

### F1. GMV & Orders Trend — MVP | Medium | Revenue, top
- **Q:** "How much is the store selling, and when?" **M:** GMV per bucket (guarded `amount`, **deduped per distinct order**), distinct-order count per bucket (fallback basis labeled). **V:** GMV bars + orders line. **I:** GMV delta rules. **D:** contract; order identity; guarded numeric parsing (exists).

### F2. AOV — MVP | Small | header stat on F1
GMV ÷ distinct orders, with delta. **I:** "AOV fell while orders rose — discounting?"

### F3. GMV by Category / Product — MVP | Small | Revenue
Ranked GMV lists reusing D1/D2 data; product-level GMV shown only where purchases are product-attributed (Principle 6). **I:** concentration rule.

### F4. Payments Analysis — MVP | Medium | Revenue
- **Q:** "Which payment methods work, which fail, why?"
- **M:** orders/GMV by `payment_method`; **failure rate only with a trustworthy denominator**: preferred distinct `payment_attempt_id`; fallback distinct sessions containing payment_completed-or-failed; otherwise failure **counts only, no rate**. Failure `reason` breakdown.
- **V:** method table (share, failure %) + reasons bars. **I:** "UPI failing 3× card" high-severity rule. **D:** contract (payment_attempted + payment_attempt_id).

### F5. Coupon Impact — Advanced | Medium | Revenue — **post-contract (moved per #14)**
Coupon sessions: conversion & AOV vs non-coupon; top codes. Needs stable order/AOV identity first.

*Postponed:* LTV, refunds (no refund convention; long horizons).

## G. Behavior Analytics (Analytics → Behavior tab)

### G1. Top Events — MVP (exists) | — | Behavior (moved)
### G2. Property Segmentation — Advanced | Large | Behavior, flagship
- **Q:** "Break event X down by property Y" (add_to_cart by category; payment_failed by reason). **M:** value distribution for chosen event+property; optionally session-based. **V:** two pickers + ranked bars. **Replaces Top Property Keys.** **I:** dominant-value rules. **D:** JSONB value extraction pattern (exists).
### G3. Search Analytics — Advanced | Medium | Behavior
- **Q:** "What do shoppers search, and do they find it?" **M:** top queries; zero/low `results_count` queries; search-session conversion vs non-search. **V:** query lists. **I:** "'oat milk' ×120, zero results — assortment gap." **D:** search_performed convention.
### G4. Device & Source Breakdown — Advanced | Small–Medium | Behavior
- **Q:** "Do mobile shoppers convert worse?" **M:** sessions + conversion by coarse device class (stored userAgent) and `source` property. **V:** split bars with conversion %. **I:** device-gap rule. **D:** **userAgent column + coarse UA parsing quality — NOT the commerce contract** (dependency corrected per #14); no fingerprinting.
### G5. Journey Paths (Sankey) — Advanced | Large — **postponed pool**

## H. Retention Analytics (Shoppers tab, advanced section)

### H1. Cohort Retention Grid — Advanced | Large | Shoppers — **postponed until history accrues**
Weekly first-seen cohorts × return activity; needs weeks of (projectId, customerId) history. B3 is the MVP proxy meanwhile. *Folded, not built separately:* churn signals (insight rules), time-between-purchases (a B3 stat).

## I. Technical Analytics (Projects / API Keys pages — NOT Analytics tabs)

### I1. API Key Usage — MVP | Small | API Keys page — events per key over time (data exists).
### I2. Ingestion Health — Advanced | Medium | Project view — accepted vs rejected (400/429/dedup) per day; requires storing rejection counters (the only new write-path in this roadmap).
### I3. Data Quality Rules — Advanced | Small–Medium | feeds A3 panel — **event-specific (per #11):**
- % of product events (view/cart aliases) missing `product_id`
- % of purchase events missing `order_id` / `amount` / `currency`
- % of payment events missing `payment_method`
- % of events using unknown (non-contract) commerce event names
- count/% of pre-session events excluded from session analytics
*Never:* latency/APM/uptime — Datadog's identity, not EventPulse's.

## J. Alerting Analytics (Alerts page)

### J1. Alert Trigger History & Trend — MVP | Small — trigger list + per-alert sparkline (AlertTrigger exists).
### J2. Metric-based Alerts — Advanced | Medium–Large — alert on shared-module metrics (conversion rate, abandonment, GMV, failure rate) with windows. **D:** shared metric module (Part 5) — the reason it exists.
### J3. Anomaly auto-baselines — **postponed pool.** *Delivery channels (email/Slack): separate notifications module, prerequisite for J2's value.*

## K. Automated Commerce Insights *(renamed per #1 — cross-cutting, surfaces in A3)*

### K1. Expanded Rule Library — MVP | Medium
Cross-metric commerce rules: payment-failure-by-method spike, stock-out → lost-session correlation, abandonment deterioration, coupon dependency, shopper concentration, data-quality gaps (I3). Every rule cites real numbers; labeled "rule-based."
### K2. Weekly Digest (templated narrative) — Advanced | Medium — top findings composed into template sentences; dismissible Overview banner, later email. Honest: templated composition, no generation claims.
### K3. ML anomaly/forecasting — **postponed indefinitely.** K4. LLM chat-with-data — **never for now.**

## L. Platform Analytics Capabilities

### L1. Custom Date Range — MVP (platform gap) | Medium | Global header — arbitrary ranges; previous period = immediately preceding equal-length range; all tabs inherit (Phase 0D).
### L2. CSV Export per Card — Advanced | Small–Medium — "export what you see"; product/GMV tables first.
### L3. Saved views / scheduled reports — postponed (after K2 proves appetite). L4. Custom drag-drop dashboards — **never** (destroys curated-opinionated identity; enormous scope). L5. Cross-project comparison mode — postponed; account-Overview "Events by Project" covers the basic need.

---

# Part 4 — NEW: Commerce Tracking Contract (Phase 1 — prerequisite for all money analytics)

Documented event-property conventions + docs page + seed alignment. **Properties-only — no Prisma schema change.** Ingestion stays permissive (contract is recommended, not enforced); I3 rules measure adherence. Per Principle 11, the contract is the **capability ceiling, not an entry requirement**: stores adopt it field-by-field, and each adopted field automatically unlocks the analytics that depend on it — the docs section should present the conventions as an "unlock ladder," not a prerequisite checklist.

| Event | Required-by-convention properties |
|---|---|
| `product_viewed` | product_id, product_name, category, price, currency |
| `add_to_cart` | product_id, product_name, category, price, quantity, currency |
| `checkout_started` | cart_value, currency |
| `purchase_completed` | **order_id**, amount, currency, payment_method, **items[]** |
| `payment_attempted` *(new conventional event)* | payment_attempt_id, payment_method |
| `payment_completed` / `payment_failed` | payment_attempt_id, payment_method, (failed: reason) |

`items[]` line-item shape: `{ product_id, product_name, category, price, quantity }`. **Size note:** properties are capped at 16KB — document a practical line-item guidance (e.g. very large orders may truncate items[]; order_id + amount always take precedence).

Deliverables: docs page section, seed-data alignment (seed purchases gain order_id + items[] so confirmed-product-purchase analytics are demoable), ingestion examples updated. Unlocks: distinct-order counting (#2), confirmed product purchases (#4), payment denominators (#9), GMV analytics (#10).

---

# Part 5 — Shared Metric Definitions (incremental, per #6)

Not an upfront framework. One documented shared module (working name `commerce-metrics`) containing, from day one:
- commerce event **aliases** (single source; today they're duplicated across funnel constants)
- **conversion formulas** (session basis) & funnel step logic
- **guarded monetary parsing** (exists — gets extracted here)
- **order identity rules** (order_id → session fallback, + labeling flag)
- **scope rules** (tenant → project → range; previous-period definition)
- shopper identity key rule `(projectId, customerId)`

Consumers adopt it incrementally: cards first, then Automated Insights, then Alerts (J2 is the forcing function). Formalize into a "catalog" only when all three consume it. Architecture sketch:

```
SDK/API → Ingestion → Event Store
              ↓
   Shared Metric Definitions (incremental module)
   volume lens · session lens · shopper lens · money lens
              ↓                ↓               ↓
      Analytics API      Insights Engine   Alert Evaluator
              ↓                ↓               ↓
   Tabbed dashboard · drilldowns · Health&Insights · digest · exports
```

---

# Part 6 — Final Dashboard Hierarchy

**Sidebar unchanged:** Overview · Events · Analytics · Projects · API Keys · Alerts · Settings.
**Analytics page gains a sub-tab bar:**

| Tab | Content (top → bottom) |
|---|---|
| **Overview** | A1 KPI row → A4 funnel snapshot + A3 Health & Insights → A2 Event Trend → K2 digest (later) |
| **Conversion** | E1 Unified Funnel (friction chips) → E2 Abandonment Over Time → E3 Time to Convert → E4 Custom Funnels (later) |
| **Revenue** | F1 GMV & Orders (F2 AOV in header) → F4 Payments Analysis → F3 GMV by Category/Product → F5 Coupon Impact (later) |
| **Products** | D1 ↔ D2 → D4 Stock-out Impact → (D3 drilldown via click) |
| **Shoppers** | B1 Active Shoppers → B2 New vs Returning + B3 Repeat Purchase (Selected Period) → B4 Top Shoppers → C-a Session Quality → H1 Cohorts (later) → (B5/C-b via click) |
| **Behavior** | G1 Top Events → G2 Property Segmentation → G3 Search Analytics → G4 Device & Source |

Account **Overview** keeps account stats + recent projects/keys + Events-by-Project. **Events** page gains "view session"/"view shopper" links in the drawer. **Alerts** gains J1→J2. **API Keys/Projects** gain I1/I2. Copy sweep: "real-time" → "near-real-time / from ingested events" on analytics surfaces (alerts wording stays).

---

# Part 7 — Final Ordered Implementation Roadmap (independently shippable phases)

*Unaffected by Principle 11: progressive capability describes how the shipped product behaves for customers at any tracking level; the build order below stays strictly sequential because later analytics depend on earlier infrastructure.*

| Phase | Scope | Contents | Size |
|---|---|---|---|
| **0A** | Land in-flight work | Finish & merge current Product Performance branch, **including the D1/D2 attribution relabel** ("Sessions that purchased") | S |
| **0B** | Analytics IA | Sub-tabs (Overview/Conversion/Revenue/Products/Shoppers/Behavior); move existing cards to tabs; remove Recent Activity, Events by Project, Top Property Keys from Analytics. **No new calculations.** | M |
| **0C** | Card consolidation | Merge funnels into E1 (toggle); merge Health+Insights (A3); KPI row v1 absorbs Shoppers & Sessions + Previous Period (Sessions · Conversion · Shoppers · Events, with deltas) | M |
| **0D** | Scope & comparison rules | L1 custom date range; previous-period = preceding equal-length range; all tabs inherit one scope; extract first pieces of the shared metric module | M |
| **1** | Commerce Tracking Contract | Part 4: conventions, order identity, items[], payment_attempted, docs, seed alignment | S–M |
| **2** | GMV & Orders MVP | F1, F2, F3; KPI row gains GMV + Orders; confirmed Units Sold appears in D1/D3 where items[] present | M |
| **3** | Shopper MVP | B1, B2, B3, B4 (order/session ranking; GMV ranking if data present) | M |
| **4** | Conversion depth | E2, E3; K1 rule expansion incl. I3 data-quality rules; F4 Payments Analysis | M |
| **5** | Drilldowns | D3 product, B5 shopper, C-b session, C-a session quality | M–L |
| **6** | Behavior | G2 segmentation, G3 search, G4 device/source; L2 exports | L |
| **7** | Retention | H1 cohorts (history has accrued by now); F5 coupon impact | L |
| **8** | Proactive layer | J1, J2 metric alerts, K2 digest; I1, I2 alongside | M–L |

---

# Part 8 — Build Now / Build Later / Never Build

**Build now (Phases 0A–4):** IA consolidation & funnel/KPI/insights merges · custom date range · Commerce Tracking Contract · GMV/Orders/AOV · GMV by category/product · Payments Analysis · Active/New-vs-Returning/Repeat-Purchase/Top Shoppers · Abandonment Over Time · Time to Convert · expanded rule library + data-quality rules.

**Build later (Phases 5–8 + postponed pool):** product/shopper/session drilldowns · session quality · property segmentation · search analytics · device & source · CSV exports · cohort retention · coupon impact · lifetime returning-buyer metric · alert history & metric-based alerts · weekly digest · ingestion health/API-key usage · custom funnel builder · journey paths · anomaly baselines · saved/scheduled reports · geo analytics (needs IP-lookup dependency) · cross-project comparison mode · LTV & refunds.

**Never build (for this product):**
- Session replay & heatmaps — no capture data; different product category; privacy/storage scope.
- APM / latency / infrastructure observability — contradicts commerce identity.
- A/B experimentation suite — separate product; funnels + segmentation cover the analysis half.
- Demographics / identity enrichment from IP+UA — violates the no-identity-guessing principle.
- LLM chat-with-data — trust/cost/accuracy; rule-based honesty is the brand.
- Custom drag-drop dashboards — destroys the curated, opinionated UX differentiator.
- Full ad/UTM attribution suite — `source` breakdown (G4) is the honest version.

---

# Part 9 — Acceptance / How to Use This Document

- Each phase ships independently into the Part 6 hierarchy — **no future redesign**.
- Before implementing any feature, restate its **Q**; a card that can't state one doesn't ship.
- Every metric lands in the shared metric module once and is reused by cards, insights, and alerts.
- Labeling rules are part of definition-of-done: order-count basis labels, GMV (not revenue), "Sessions that purchased" vs confirmed purchases, project-scoped shopper counts, near-real-time wording, and honest degraded states everywhere (missing amounts, missing sessions, short history).
- Progressive capability (Principle 11) is part of every feature's definition-of-done: the metric computes automatically when its required fields are present, shows an unavailable state naming those exact fields when they're absent, and never estimates in between. Unavailable-state copy is designed alongside the metric, not bolted on.
