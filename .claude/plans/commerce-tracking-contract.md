# EventPulse Commerce Tracking Contract — v1 (2026-07)

**Status:** Authoritative specification for every SDK, ingestion endpoint, and analytics consumer EventPulse ever builds.
**Companions (fixed, not modified by this document):**
- Analytics blueprint: `product-performance-analytics-design-cozy-book.md` (Part 4 sketched this contract; Principle 11 governs it)
- Platform roadmap: `platform-roadmap-post-analytics.md` (Phases 11/12/12.5/17 implement its transport, SDK, docs, and governance)

**Scope note:** This is architecture and product design — no implementation. Where this document refines the blueprint's Part 4 sketch, the refinement is called out explicitly with rationale.

---

## 0. Contract Design Principles

These extend the ten blueprint principles; every rule below traces to one of them.

1. **Events are facts, not API calls.** An event states something that happened in the store. Facts are never rejected for being incomplete — an incomplete fact is a *less useful* fact (Progressive Capability), not an invalid one.
2. **The contract is append-only.** Events outlive software. New events and fields may be added; existing meanings are never changed; nothing that once ingested cleanly may ever start failing. Deprecation means "stop recommending," never "stop accepting."
3. **The contract is a capability ceiling, not an entry requirement.** (Blueprint Part 4, verbatim intent.) Merchants adopt it field-by-field; each field unlocks the analytics that depend on it, automatically.
4. **Flat properties, one nested exception.** Event properties are flat snake_case scalars, plus exactly one structured field: `items[]` on order-scoped events. Flatness keeps JSONB extraction simple, the 16KB cap meaningful, and the schema registry (Phase 17) tractable.
5. **Pseudonymous by design.** EventPulse never wants PII. `customerId` is a merchant-issued pseudonym; the contract bans emails, names, phone numbers, and street addresses in any field.
6. **Money is honest.** Every monetary field travels with a currency; amounts are never silently converted, netted, or reconciled; a number EventPulse can't trust becomes a labeled gap, not a guess.
7. **Every field must power a named metric.** A property with no analytics consumer (current or blueprint-planned) doesn't enter the contract — the taxonomy analog of "a card that can't state its business question doesn't ship."

---

## 1. The Envelope (transport layer — owned by the ingestion API, not this taxonomy)

Every event, single or batched, is wrapped in the same envelope:

```json
{
  "name": "add_to_cart",
  "customerId": "cust_8f3ka92",
  "sessionId": "sess_01j9x2m4",
  "occurredAt": "2026-07-11T14:03:22Z",
  "properties": { }
}
```

| Field | Status | Rules |
|---|---|---|
| `name` | **Envelope-required** | 1–120 chars, trimmed, no control characters. Free-form allowed; contract names get contract analytics. |
| `customerId` | **Envelope-required** | 1–120 chars, pseudonymous (see §4 Customer). SDK auto-generates `anon_…` ids when the merchant hasn't identified. |
| `sessionId` | **Envelope-required** | 1–120 chars; one shopping visit (see §4 Session). |
| `properties` | Optional | Plain JSON object, ≤ 16KB serialized. Flat scalars + `items[]` only by convention; unknown keys are always accepted. |
| `occurredAt` | Optional *(Phase 11+)* | Client event time, ISO-8601. Clamped to ±48h of server time; clamped events are stored and flagged, never dropped. Server receipt time remains authoritative beyond the window. |
| `Idempotency-Key` header (or `idempotencyKey` body field) | Optional, strongly recommended | Per-event UUID; scoped per API key; duplicates return the original event with `duplicate: true`. |

**Two meanings of "required" — the single most important definition in this document:**
- **Envelope-required** → the request fails with a 400 (single) or the item is rejected/quarantined (batch). Only the three fields above.
- **Contract-required** → the event ingests regardless, but cannot serve its primary analytics purpose without the field; Tracking Health flags it and names the unlock. *Nothing in §5's tables ever causes rejection by default.*

---

## 2. Event Taxonomy

### Naming convention
`object_action`, past tense, snake_case (`product_viewed`, `payment_failed`). **One grandfathered exception:** `add_to_cart` (and `remove_from_cart`) keep their shipped, industry-standard imperative names (GA4 uses the same). Renaming them to satisfy convention purity would violate append-only stability — consistency matters less than permanence once a name has shipped.

### Tier 1 — Core Funnel (the four events every store should send first)

| Event | Why it exists (business question) |
|---|---|
| `product_viewed` | "Which products attract interest?" Top of every funnel; feeds Product Performance. |
| `add_to_cart` | "What do shoppers commit interest to?" Intent signal; cart analytics; funnel step 2. |
| `checkout_started` | "Who gets to the till?" Commitment signal; abandonment analytics; funnel step 3. |
| `purchase_completed` | **The order fact.** Everything money — GMV, orders, AOV, product revenue — reads from here. |

### Tier 2 — Payment (unlocks failure *rates*, not just counts)

| Event | Why |
|---|---|
| `payment_attempted` | The trustworthy **denominator**. Without it, payment failure percentages are forbidden (blueprint suggestion #9). |
| `payment_completed` | The payment success fact — distinct from the order fact; ties to it via `order_id`. |
| `payment_failed` | Checkout's sharpest friction, with machine-readable reasons. |

### Tier 3 — Discovery & Engagement (optional; each feeds a planned Behavior/Product analytic)

| Event | Why |
|---|---|
| `page_viewed` | Traffic context and entry analysis. Explicitly **not** a funnel step — EventPulse is commerce analytics, not a pageview counter. |
| `category_viewed` | Category interest; top of Category Performance. |
| `product_list_viewed` | Listing impressions (collections, search results) — bridges search/category to product views. |
| `search_performed` | Demand signal; zero-results = assortment gaps (Search Analytics, G3). |
| `cart_viewed` | Cart engagement depth; refines abandonment analysis. |
| `remove_from_cart` | Hesitation signal with reasons — why carts shrink. |
| `wishlist_added` / `wishlist_removed` | Deferred intent. Defined now; analytics deferred (no card exists yet — the contract may lead analytics, never trail it). |
| `coupon_applied` | Promo usage → Coupon Impact (F5). |
| `coupon_denied` | Promo *friction* — the failed half F5 needs for honest coupon analysis. |

### Tier 4 — Fulfillment & Friction (the quick-commerce differentiators)

| Event | Why |
|---|---|
| `item_out_of_stock` | Lost demand — Stock-out Impact (D4) is a flagship analytic. |
| `item_unavailable` | Availability friction distinct from stock (area, hours, sync). |
| `delivery_fee_shown` | Fee-friction exposure at decision time. |
| `eta_shown` | Delivery-promise exposure. |
| `order_delivered` | Fulfillment completion; enables promise-vs-actual ETA analytics later. |

### Tier 5 — Post-purchase (defined now, analytics deliberately deferred)

| Event | Why define it before analytics exist |
|---|---|
| `refund_issued` | The blueprint defers refund analytics *because no convention exists*. Defining the convention now means data accumulates so the analytics are retroactively possible — Progressive Capability applied to time. |
| `order_cancelled` | Same reasoning; order lifecycle completeness. |

### Reserved names (future spec meaning — do not repurpose)
`subscription_started`, `subscription_renewed`, `subscription_cancelled`, `customer_alias`. Merchants may send any custom event name freely; only these reserved names must not be used with a different meaning.

### Events deliberately NOT defined
- **`customer_signed_up` / login events** — new-vs-returning shoppers derive from `(projectId, customerId)` first-seen; a redundant event invites drift between two sources of truth.
- **Autocaptured clicks/scrolls/DOM events** — auto-capture generates plausible garbage; explicit events only (honesty extends to inputs).
- **Email/notification engagement events** — a different domain (messaging analytics), not commerce.

### Canonical names and accepted aliases

| Canonical | Accepted aliases (read-time normalized, accepted forever) | Status |
|---|---|---|
| `product_viewed` | product_view, view_product, product_detail_viewed, product.opened | aliases deprecated for new integrations |
| `add_to_cart` | added_to_cart, cart_added, item_added_to_cart | " |
| `checkout_started` | start_checkout, checkout_initiated, begin_checkout | " |
| `purchase_completed` | order_completed, checkout_completed, checkout.completed, order_placed | " |

The SDK emits canonical names only. Aliases exist so hand-rolled integrations keep working forever (append-only principle); the schema registry (Phase 17) surfaces alias usage as a gentle upgrade nudge, never an error.

---

## 3. Commerce Object Model

Entities are *logical*; their wire representation is flat properties (Principle 4). No entity requires a schema change — everything lives in `Event.properties` plus the envelope.

| Entity | Identity key | Wire representation | Notes |
|---|---|---|---|
| **Customer** | envelope `customerId` | envelope only | Merchant-issued pseudonym, stable per shopper *per project* (shopper identity is `(projectId, customerId)` — blueprint Principle 5). SDK generates `anon_<uuid>` until `identify()` is called. **No PII, ever.** |
| **Session** | envelope `sessionId` | envelope only | One shopping visit. SDK rules: generated on first event, persisted, rotated after 30 min inactivity or 24h max age; **survives the anon→identified transition** (the session is the bridge across an identity switch). Server-side integrations mint their own stable per-visit ids. |
| **Product** | `product_id` | `product_id`, `product_name`, `category`, `price`, `currency`, `brand?` | `product_id` is the analytics grouping key — it must be stable across events and match the merchant's catalog (SKU or parent id, merchant's choice, but *consistent*). |
| **Variant / SKU** | `variant_id`, `sku` | optional refinements on product events | `product_id` groups; `variant_id`/`sku` refine. Analytics aggregate on `product_id` v1; variant analytics are a future unlock that costs nothing to prepare for. |
| **Category** | `category` (string) | single flat label v1 | Hierarchies deferred: `category_path[]` is a reserved future field. One honest level beats a speculative tree. |
| **Cart** | `cart_id` (optional) | snapshots: `cart_value`, `cart_size`, `currency` | The cart is represented by *state snapshots on events*, not a mutable object. `cart_id` is reserved-optional now to make future cart-recovery analytics possible. |
| **Order** | `order_id` | on purchase/refund/cancel/deliver events | **The** dedup key: Orders = COUNT DISTINCT `order_id`; GMV dedupes one `amount` per order (blueprint Principle 3). Must be unique per project and identical across all events describing the same order (`purchase_completed`, `payment_*`, `refund_issued`, …). |
| **Line item** | `items[].product_id` | `items[]: { product_id*, product_name, category, price, quantity, variant_id?, sku?, seller_id? }` | Unit `price` × `quantity` per line. `sum(items)` may legitimately differ from `amount` (fees, discounts, shipping) — **both are stored; neither is reconciled or fabricated.** Product revenue = line revenue, labeled as such; order GMV = `amount`. |
| **Payment** | `payment_attempt_id` | `payment_attempt_id`, `payment_method`, `reason` (on failure) | One id per attempt; retries are new attempts. The id is what makes failure *rates* honest. |
| **Coupon** | `coupon_code` | `coupon_code`, `discount_amount`, `currency` | Code granularity only; campaign modeling is out of scope. |
| **Money** | — | `amount` / `price` / `cart_value` / `delivery_fee` / `discount_amount` + `currency` | See Money rules below. |
| **Address / Geo** | — | `city`, `region?`, `country_code?` on delivery-relevant events only | **Deliberately minimal.** No street addresses, no postal codes (PII / precision-fingerprinting risk). City-level is all quick-commerce analytics need. |
| **Inventory** | — | *not modeled* | Represented only through friction events (`item_out_of_stock`, `item_unavailable`). EventPulse is analytics, not an inventory system — modeling stock levels would be scope theft. |
| **Seller** | `seller_id` (reserved-optional) | on product/order events | The single field that makes marketplace analytics possible later without redesign (§11). |

### Money rules (Principle 6 made concrete)
- **Decimal major units** (`129.00`, `3.99`), max 2 decimal places, non-negative in every field except `refund_issued.amount` (which is positive and *means* refund). **Design decision vs Stripe-style integer cents, made deliberately:** EventPulse amounts are analytics-grade, not ledger-grade — we never move money. Decimals match the shipped convention, JSON ergonomics, and the guarded-numeric parser. Tradeoff acknowledged: float precision at extreme scale; mitigated by 2dp bound and server-side numeric aggregation.
- **`currency` is contract-required wherever any money field appears** — ISO-4217 uppercase (`USD`, `INR`).
- **No conversion, ever.** Mixed-currency projects get per-currency aggregates (dominant currency headline, labeled); a converted total would be fabricated data.

---

## 4. Identity Lifecycle (Customer × Session)

1. Anonymous shopper arrives → SDK mints `customerId = anon_<uuid>` (persisted per device) and `sessionId`.
2. Merchant calls `identify("cust_881")` → subsequent events carry the merchant id; **the current `sessionId` is retained**, bridging the transition within session analytics.
3. **No retroactive merge in v1.** Pre-identification history stays under the anon id. This is the honest choice: identity stitching (Segment-style aliasing) is a large correctness-critical system, and a half-built version silently fabricates shopper counts. `customer_alias` is a reserved event name for a future, properly-built merge.
4. Logout/user-switch → merchant calls `reset()`: new anon id **and** new session.

Consequence, stated honestly in docs and Tracking Health: stores that identify late will overcount "unique shoppers" slightly (anon + identified counted separately). The unlock hint: "identify as early as possible."

---

## 5. Event Property Reference

Legend: **R** = contract-required (event ingests without it, but its primary analytics stay locked and Health flags it) · **Rec** = recommended (unlocks richer analytics) · **O** = optional · **D** = deprecated. `currency` is implied **R** wherever a money field is present.

### Tier 1 — Core funnel

**`product_viewed`** — powers: funnel step 1, Product Performance views
| Field | Tier | Powers |
|---|---|---|
| product_id | **R** | product-level anything |
| product_name | Rec | readable dashboards (falls back to id) |
| category, price + currency | Rec | Category Performance; price-band analytics later |
| variant_id, sku, brand, source | O | future refinements; source-of-discovery |

```json
{ "name": "product_viewed", "customerId": "anon_9f2", "sessionId": "sess_71",
  "properties": { "product_id": "sku_123", "product_name": "Organic Apples",
    "category": "Grocery", "price": 129.00, "currency": "INR", "source": "search" } }
```

**`add_to_cart`** — powers: funnel step 2, units, cart analytics
| Field | Tier |
|---|---|
| product_id | **R** |
| quantity, price + currency, category, product_name, cart_value | Rec |
| variant_id, sku, cart_size, cart_id, source | O |

**`checkout_started`** — powers: funnel step 3, abandonment value
| Field | Tier |
|---|---|
| *(none hard — the event itself is the signal)* | — |
| cart_value + currency, cart_size | Rec |
| items[] (cart snapshot → future abandoned-cart contents), delivery_fee, eta_minutes, coupon_code, cart_id | O |

**`purchase_completed`** — powers: orders, GMV, AOV, funnel step 4; with items[]: product revenue
| Field | Tier | Powers |
|---|---|---|
| order_id | **R** | distinct-order counting; GMV dedup (Principle 3) |
| amount + currency | **R** | GMV, AOV |
| items[] | **Rec** | confirmed product purchases, units sold, product/category revenue |
| payment_method | Rec | Payments Analysis |
| coupon_code, discount_amount, delivery_fee, cart_size, channel, store_id, seller_id | O | coupon impact; retail/marketplace dimensions |

> **Refinement of blueprint Part 4, stated openly:** the sketch listed `items[]` as required-by-convention. This contract classifies it **Recommended**, because Principle 11's own ladder places `items[]` on a *higher rung* than `order_id`/`amount` (GMV unlocks before product revenue). Requiring it would turn a ladder into a cliff. `order_id` + `amount` + `currency` are the purchase core.

```json
{ "name": "purchase_completed", "customerId": "cust_881", "sessionId": "sess_71",
  "properties": { "order_id": "ord_2091", "amount": 1299.00, "currency": "INR",
    "payment_method": "upi", "coupon_code": "FRESH20", "discount_amount": 100.00,
    "items": [
      { "product_id": "sku_123", "product_name": "Organic Apples", "category": "Grocery", "price": 129.00, "quantity": 2 },
      { "product_id": "sku_456", "product_name": "Milk 1L", "category": "Dairy", "price": 5.49, "quantity": 1 } ] } }
```

*16KB guidance:* very large orders may truncate `items[]` to the top ~60 lines; `order_id` + `amount` always take precedence over line completeness (blueprint Part 4 note).

### Tier 2 — Payment

**`payment_attempted`** — R: payment_attempt_id · Rec: payment_method, order_id, amount + currency
**`payment_completed`** — Rec: order_id (**must equal the `purchase_completed` order_id when both are sent — that equality is what makes order dedup work**), payment_attempt_id, payment_method, amount + currency
**`payment_failed`** — Rec: payment_attempt_id, payment_method, reason, order_id, amount + currency
`reason` suggested enum (free-form accepted): `card_declined | insufficient_funds | gateway_timeout | authentication_failed | bank_declined | wallet_auth_failed | other`

```json
{ "name": "payment_failed", "properties": { "payment_attempt_id": "pay_77a1",
    "payment_method": "upi", "reason": "bank_declined", "amount": 1299.00, "currency": "INR",
    "order_id": "ord_2091" }, "customerId": "cust_881", "sessionId": "sess_71" }
```

### Tier 3 — Discovery & engagement

| Event | R | Rec | O |
|---|---|---|---|
| `page_viewed` | — | page_path, page_type (`home\|category\|product\|cart\|checkout\|other`) | source · *(no full URLs / query strings — PII)* |
| `category_viewed` | category | — | source |
| `product_list_viewed` | — | category *or* query | products_count, list_name, source |
| `search_performed` | query | results_count | category, source |
| `cart_viewed` | — | cart_value + currency, cart_size | cart_id |
| `remove_from_cart` | product_id | quantity, cart_value + currency | reason (`changed_mind\|price_check\|delivery_fee\|size_uncertain\|other`) |
| `wishlist_added` / `wishlist_removed` | product_id | product_name, category, price + currency | — |
| `coupon_applied` | coupon_code | discount_amount + currency, cart_value | — |
| `coupon_denied` | coupon_code | reason (`expired\|min_cart_not_met\|invalid\|already_used\|other`) | cart_value + currency |

### Tier 4 — Fulfillment & friction

| Event | R | Rec | O |
|---|---|---|---|
| `item_out_of_stock` | product_id | product_name, category | reason |
| `item_unavailable` | product_id | reason (`store_closed\|delivery_area_unavailable\|inventory_sync_delay\|other`) | product_name, category, city |
| `delivery_fee_shown` | delivery_fee + currency | cart_value, free_delivery_threshold | city |
| `eta_shown` | eta_minutes | city, fulfillment_mode (`instant\|scheduled\|express`) | — |
| `order_delivered` | order_id | actual_delivery_minutes | city, eta_minutes (as promised) |

### Tier 5 — Post-purchase (analytics deferred; data accumulates now)

| Event | R | Rec | O |
|---|---|---|---|
| `refund_issued` | order_id, amount + currency (positive; means refund) | reason, items[] (refunded lines) | refund_id |
| `order_cancelled` | order_id | reason | amount + currency |

### Deprecated (accepted forever, flagged by Health, absent from new docs)
- `customer_id` / `session_id` **inside properties** — superseded by envelope fields (pre-session-tracking style).
- Dot-form event names (`product.opened`, `checkout.completed`) and non-canonical aliases — see §2 alias table.
- *(No deprecated properties yet — this section exists so the mechanism ships with v1.)*

---

## 6. Versioning & Evolution

- **Contract versions are date-stamped** (`v1 (2026-07)`), Stripe-style, with a changelog section appended to this document. The version describes *the document*, not the events — events never carry a version field, because **facts don't have versions; specifications do.** The schema registry (Phase 17) observes what shape a project actually sends; a version-per-event would be a second, driftable source of truth.
- **Additive changes** (new events, new optional/recommended fields, new suggested enum values): allowed any time, no version ceremony beyond the changelog.
- **Meaning changes: never.** A field that must change meaning gets a *new name*; the old one is deprecated.
- **Deprecation lifecycle:** (1) marked Deprecated here + changelog → (2) removed from docs/SDK surface (SDK major version if a helper signature changes) → (3) Tracking Health shows a gentle upgrade note → (4) **accepted at ingestion forever.** There is no step 5. Backward compatibility is absolute at the wire level (Principle 2).
- **SDK versioning is independent semver**; the SDK reports itself via `X-EventPulse-SDK: ts/1.4.2` (observability only — the server never branches on it).
- The machine-readable source of truth is the shared contract module (platform Phases 12/12.5): SDK types, docs tables, validation hints, and registry expectations are all *generated from it*, so the spec cannot drift from the software.

---

## 7. Validation Philosophy

Three layers, from hard to soft — only the first can ever say no:

**Layer 1 — Envelope (hard, unchanged from shipped behavior):** malformed JSON, missing/invalid `name`/`customerId`/`sessionId`, oversized properties, auth failures → 400 / per-item quarantine in batches. This protects the *system*, not the contract.

**Layer 2 — Contract conformance (observational, default forever):** missing contract-required/recommended fields, deprecated usage, alias names, unknown event names → **stored untouched**, measured by I3 data-quality rules, surfaced in Tracking Health with unlock hints. Phase 17 later adds opt-in per-project `warn` and `block-to-quarantine` modes — `observe` remains the default permanently (Progressive Capability forbids gating by default).

**Layer 3 — Value sanity (metric-layer honesty):** stored as sent; *excluded from specific metrics* with visible flags:

| Case | Behavior |
|---|---|
| Unknown fields | Accepted, observed by registry — tomorrow's contract candidates come from real usage. |
| Malformed money (`"1,299"`, `"$12"`, text) | Stored; excluded from money aggregates via guarded parsing; Health: "N purchase events have unparseable amounts." |
| **Negative amounts** (outside refunds) | Stored; **excluded from GMV** (a negative sale is a refund wearing the wrong event); flagged with the exact fix ("send refund_issued instead"). |
| Missing `order_id` on purchases | Order/GMV fall back to purchasing-session basis, **visibly labeled** (blueprint Principle 3); Health names the unlock. |
| Missing `product_id` on product events | Event feeds funnels/volume; excluded from Product Performance; Health shows the affected %. |
| **Multiple currencies** | Per-currency aggregation; dominant-currency headline labeled "INR only — 3% of orders in other currencies"; **never converted** (no fabricated FX). |
| Duplicates | First defense: per-event idempotency keys (envelope). Second: order-level dedup at the metric layer (distinct `order_id` absorbs re-sent purchase facts and the purchase/payment overlap). |
| `null` values | Treat as absent. SDK omits nulls; hand-rolled nulls don't count as "field present" for Health or unlocks. |
| Clamped `occurredAt` | Stored at clamped time, flagged; trend integrity beats client clocks. |

The through-line: **rejection is for threats to the system; measurement is for gaps in the data.** Merchants fix tracking because the product shows them exactly what it costs them, not because a 400 forced them.

---

## 8. Progressive Capability Ladder (Principle 11, field by field)

Each rung is cumulative and unlocks *automatically* — no configuration, no plan gates.

| Rung | You send | Analytics that unlock |
|---|---|---|
| 0 | Any event names (envelope only) | Event volume, trends, Top Events, event-count funnel (diagnostic basis) |
| 1 | Canonical funnel names | Conversion Funnel (events basis), funnel drop-off insights, friction chips |
| 2 | *(envelope already includes customerId/sessionId)* | **Session** funnel & conversion rate, Shoppers & Sessions, abandonment analytics, session drilldowns |
| 3 | + `product_id` (name/category/price) | Product Performance, Category Performance, stock-out impact, "sessions that purchased" attribution |
| 4 | + `order_id` on purchases | **Orders** (distinct, exact), repeat purchase rate, honest AOV denominator |
| 5 | + `amount` + `currency` | **GMV**, AOV, GMV trends & by-category, money KPIs |
| 6 | + `items[]` | **Confirmed product purchases, units sold, product/category revenue** (the "Sessions that purchased" label upgrades to real purchase attribution) |
| 7 | + `payment_attempt_id` (+ payment events) | Payment failure **rates** by method, payment funnel |
| 8 | + `coupon_code` / fee / ETA fields | Coupon impact, delivery-fee & ETA friction analytics |
| 9 | + `refund_issued` convention | (Future) net adjustments, refund analytics — data accumulates from the day you send it |

Every locked card in the dashboard states its rung: *"Add `order_id` to purchase events to unlock exact order counts — currently approximated from purchasing sessions."*

---

## 9. SDK Expectations (specification — implementation is platform Phase 12)

| Concern | Contract-level requirement |
|---|---|
| **Sessions** | Auto-generate, persist, rotate at 30 min inactivity / 24h max; survive `identify()`; reset on `reset()`. Rotation rules are *part of this contract* because they define what "session conversion" means. |
| **Identity** | `identify(customerId)` with merchant pseudonyms; auto `anon_<uuid>` before that; no retroactive merge (§4); `reset()` on logout. |
| **Typed helpers** | One helper per Tier 1–4 event, signatures generated from this contract — helper types make contract-required fields *compiler-required*, which is how the ladder becomes the path of least resistance. |
| **Batching** | Queue → `/api/events/batch` (≤100/request); flush on size/interval/page-exit (sendBeacon / fetch keepalive). |
| **Offline buffering** | localStorage (capped, FIFO drop-oldest with a visible drop counter in debug); replay with original `occurredAt`. |
| **Retry** | Exponential backoff + jitter; honor `Retry-After`; give up only past buffer caps — and say so in debug. |
| **Deduplication** | Auto UUID idempotency key per event, preserved across retries/replays — duplicates are structurally impossible from the SDK. |
| **Version header** | `X-EventPulse-SDK: <lang>/<semver>` on every request — telemetry only. |
| **Never** | Auto-capture DOM events, collect PII, fingerprint devices, or send silently in debug mode. |

---

## 10. Tracking Health (grades, scoring, and how missing fields count)

Health is the **runtime measurement of contract conformance**, computed per project over the selected range, surfaced in the Health & Insights panel (A3) and the unlock-ladder page (12.5).

### Grades

| Grade | Meaning (crisp definition) |
|---|---|
| **Excellent** | Full ladder through rung 7: exact orders, GMV, line items, payment denominators; quality-rule violation rate < 2%; all four core funnel events recent. |
| **Good** | Money analytics unlocked (rungs 4–5) and funnel complete; gaps only in higher rungs (`items[]`, `payment_attempt_id`) or minor violations (< 10%). |
| **Fair** | Funnel + sessions work (rungs 1–3) but money analytics locked — no `order_id`/`amount` — or a core funnel event is missing. |
| **Poor** | Events flow but the funnel can't compute: top-of-funnel missing, or > 30% of commerce events fail their contract-required field, or heavy deprecated/alias usage. |
| **Broken** | No events in range, ingestion dominated by envelope rejections, or all events pre-date session tracking. |

### Scoring model
Start at 100; weighted deductions from event-specific I3 rules — **a missing field's weight is proportional to what it locks**, and every deduction carries its unlock text:

- Core funnel event absent (per event): −15 · `order_id` missing on > 20% of purchases: −15 · `amount`/`currency` missing: −15 · `product_id` missing on > 20% of product events: −10 · no `items[]` at all: −8 · no `payment_attempt_id` with payment events present: −6 · unparseable money > 5%: −8 · deprecated/alias usage: −3 · unknown-name majority: −5 · clamped timestamps > 5%: −3.
- Floors: a project that has honestly *not adopted* higher rungs can still reach **Good** — absence of optional richness is a smaller deduction than *inconsistent presence* (80% of purchases with `order_id` and 20% without is worse than 0%, because it corrupts dedup). Inconsistency multiplies the deduction ×1.5.
- Grade bands: ≥ 90 Excellent · 75–89 Good · 50–74 Fair · 25–49 Poor · < 25 or hard conditions above → Broken.

Health never shames; every line is a ladder rung: *what's missing → what it locks → the one-line fix.*

---

## 11. Error Reporting (what merchants actually see)

**Machine-readable reason codes** (batch per-item results, quarantine records, Health findings — one shared taxonomy):
`envelope.missing_customer_id` · `envelope.invalid_name` · `envelope.payload_too_large` · `contract.missing_order_id` · `contract.missing_product_id` · `contract.missing_currency` · `contract.deprecated_field` · `contract.alias_event_name` · `value.unparseable_money` · `value.negative_amount` · `value.mixed_currency` · `value.clamped_timestamp` · `duplicate.idempotency_key`

**Surfaces and copy tone** (name the field → the impact → the fix; never scold):

- *Batch response item:* `{ "index": 3, "status": "quarantined", "code": "envelope.missing_customer_id", "hint": "customerId is required on every event — see /docs#identity" }`
- *Health finding:* "32% of `add_to_cart` events are missing `product_id`. Product Performance is computed from the 68% that include it. Fix: pass `product_id` in the addToCart() helper."
- *Locked metric card:* "Exact order counts are approximated from purchasing sessions. Add `order_id` to `purchase_completed` to unlock exact Orders and GMV dedup."
- *Live Inspector badge (12.5):* per-event chips — `product_id ✓ · price ✓ · currency ✗ (GMV excluded)`.
- *Weekly digest line:* "Tracking Health slipped Good → Fair: `amount` disappeared from purchase events on Jul 8 (deploy?)."

Anti-patterns, banned: silent exclusion (every exclusion is visible somewhere), generic errors ("invalid event"), and blaming copy.

---

## 12. Documentation Philosophy

1. **Teach the ladder, not the reference.** The docs' spine is §8's rung table: "send these 4 events → get funnels; add this field → unlock this tab." Reference tables exist, but the narrative is capability, not compliance.
2. **SDK-first, curl-second.** Every example shows the typed helper first (where the contract is compiler-enforced), the raw payload second (where it's convention).
3. **Generated, never hand-written, for contract content.** Field tables, enums, and examples render from the shared contract module (12.5) — the docs *cannot* disagree with the SDK or the validator.
4. **Every field documents what it powers.** No field description without its "unlocks:" annotation — if we can't write one, the field shouldn't exist (Principle 7).
5. **Honest notes are first-class.** The docs say plainly: no identity merge in v1, no FX conversion, session-fallback labeling, items[]-vs-amount non-reconciliation. Limitations documented before merchants discover them are trust; after, they're bugs.
6. **Recipes over concepts:** "Track a grocery checkout," "Track out-of-stock," "Go from Fair to Good" — task-shaped pages mapping to real merchant moments.

---

## 13. Future-proofing (flexibility without overengineering)

The extension mechanism is always the same — **reserved names + optional dimensions on the existing flat model**, never a redesign:

| Future domain | What v1 already reserves | What it deliberately doesn't build |
|---|---|---|
| **Subscriptions** | `subscription_started/renewed/cancelled` reserved names; renewals are ordinary `purchase_completed` events with a recurring `order_id` series | No billing-cycle object model, no MRR metrics — until a subscriptions analytics phase exists |
| **Marketplace** | `seller_id` optional on product/order events and `items[]` | No seller accounts, payouts, or commission modeling |
| **Quick commerce** | Already first-class: ETA/fee/fulfillment_mode/city/order_delivered | Courier/route telemetry — logistics, not commerce analytics |
| **Physical retail** | `channel` (`online\|app\|pos`), `store_id` optional on purchases; `occurredAt` + batch API absorb POS batch imports | No POS hardware integration layer |
| **Identity stitching** | `customer_alias` reserved | The merge system itself — until it can be built correctly |
| **Category trees** | `category_path[]` reserved | Hierarchy analytics before flat categories are proven |

The bet, stated plainly: a flat, append-only, registry-observed property model absorbs new *dimensions* indefinitely; what it cannot absorb is changed *meanings* — and §6 bans those outright. That is the entire future-proofing strategy, and it is enough.

---

## 14. Governance of This Document

- Changes require a version bump + changelog entry; additive-only per §6.
- The shared contract module is the machine twin of this document; divergence between them is a bug in the module, not the spec.
- Implementation begins in analytics Phase 1 (blueprint Part 7) for docs/seed/conventions, platform Phase 12 for SDK enforcement, and platform Phase 17 for registry-measured governance.

**Changelog**
- **v1 (2026-07):** Initial contract. Refines blueprint Part 4: `items[]` reclassified required→recommended (Principle 11 ladder consistency); adds Tier 3/5 events, reserved names, identity lifecycle, money rules, validation layers, health grading, and error-code taxonomy.
