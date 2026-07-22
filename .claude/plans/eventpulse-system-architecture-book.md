# EventPulse System Architecture Book

**Status:** Canonical, permanent engineering handbook for EventPulse. This is the top of the document hierarchy.
**Purpose:** Explain *why* EventPulse is built the way it is, so implementation plans can reference this book instead of re-deriving the architecture. This book explains decisions; it does not prescribe implementations.
**Authority:** This book is subordinate to the seven permanent documents it references (§22). Where this book and a source document appear to disagree, the source document wins and this book is corrected. This book never redefines a metric, a contract rule, or a phase — it explains them and points to where they live.
**Scope discipline:** Architecture (WHY and WHAT-shape), never implementation (HOW). No code, no schemas, no branch plans, no metric formulas beyond what is needed to explain a decision.

---

## 1. Vision

**Why EventPulse exists.** Commerce teams — especially ecommerce and quick-commerce stores — drown in analytics tools that are confident and wrong. Dashboards blend currencies, estimate orders from event counts, invent conversion rates without trustworthy denominators, and guess shopper identity from IP addresses. EventPulse exists to be the opposite: a commerce analytics product that a merchant can *trust the number on*, because every number states its basis, names its gaps, and refuses to fabricate what it cannot measure.

**What it solves.** A store sends events (product views, add-to-carts, checkouts, purchases). EventPulse turns those into honest funnels, product/category performance, shopper behavior, and — as tracking matures — GMV, orders, and AOV. It answers concrete merchant questions ("Where do shoppers drop off?", "How much did I sell, and when?", "Which products get looked at but never bought?") and, crucially, tells the merchant *what to track next* to unlock the next answer.

**Who it is built for.** Two audiences at once. The **merchant/analyst** reads dashboards and needs honesty over flash. The **developer** integrates tracking and needs a contract that rewards incremental adoption rather than demanding a big-bang integration. The product is designed so the developer's path of least resistance produces the analyst's trustworthy data.

**Why analytics quality matters more than feature count.** A wrong GMV number is worse than an absent one: the merchant makes decisions on it. The product's entire differentiation is trust — "rule-based honesty is the brand" (blueprint Part 8). A competitor can always ship more charts; EventPulse wins by being the tool whose charts you don't have to second-guess. Features are sequenced behind that guarantee, never ahead of it.

Every architectural decision in this book traces back to that guarantee. A few examples of the linkage, to make the pattern visible before the details:

- *Append-only storage* (§7) exists so history is stable and comparisons are trustworthy.
- *Null-not-zero* (§2.3) exists so a gap in tracking is visible as a gap, not disguised as a measured zero.
- *No FX conversion* (§13, contract) exists so money is never fabricated by an invented exchange rate.
- *Benchmark-before-optimize* (§11) exists so performance claims are measured, not asserted.
- *Rule-based insights, never AI* (§8) exist so every observation is explainable and deterministic.

None of these is primarily a performance, storage, or tooling decision; each is a *trust* decision wearing an engineering hat. That is the lens for reading the rest of this book: when a choice looks conservative or slow-moving, it is almost always buying trust, and trust is the thing being optimized.

---

## 2. Core Principles

These principles recur across every planning document. They are not stylistic preferences; each exists because violating it would break the trust guarantee or the ability to evolve safely.

**2.1 Append-only philosophy.** Events are *facts* — statements that something happened in the store — not API calls to be validated into submission (contract §0). Facts are never retroactively changed and never rejected for incompleteness. The contract is append-only: new events and fields may be added, existing meanings are never changed, and nothing that once ingested cleanly may ever start failing (contract §6). *Why:* events outlive the software that reads them; a store that integrated last year must keep working forever. Meaning-changes masquerading as "improvements" are how analytics platforms silently corrupt historical comparisons. The escape hatch for genuine change is a *new name*, never a redefinition.

**2.2 Honest analytics.** Never fabricate a metric, a fallback, a test result, or a verification claim (standards §3.2). A rate is never computed without a trustworthy denominator; a fallback basis is always labeled; "confirmed" and "estimated" are distinct in code and UI. *Why:* the product is trust. One fabricated number, discovered, costs more credibility than ten honest "unavailable" states earn.

**2.3 Unavailable over fabricated (null ≠ zero).** A metric that cannot be computed is `null`/absent with an explanation naming the exact fields that unlock it — never a fake zero, never a silent estimate (standards §3.8, blueprint Principle 11). Zero means "measured as zero"; null means "cannot be computed." Both ends — SQL mapping and React rendering — preserve the distinction. *Why:* zero and null answer different questions, and conflating them lies to the merchant. "You sold nothing" and "I can't count your sales yet" must never look the same.

**2.4 Deterministic behavior.** Same inputs → same outputs; explicit `ORDER BY` with tiebreakers on anything limited; injected/recorded time where feasible (standards §3.10). *Why:* dashboards that reshuffle between refreshes destroy trust, and non-deterministic tests/benchmarks are worthless. Determinism is also what makes the benchmark baselines (0D-5) and behavior-preserving refactors (0D-3, 0M) verifiable at all.

**2.5 Compatibility-first evolution.** The API envelope and the tracking contract are append-only; response changes are additive; removing or renaming anything requires a deprecation window and coordinated types (standards §10, contract §6). *Why:* EventPulse has external integrators (merchant tracking code, future SDKs). Breaking them is a trust event. Backward compatibility is *absolute* at the wire level.

**2.6 Progressive capability.** A store never has to implement the whole contract to start. A minimal event set (names + customerId/sessionId) immediately gets every analytic that can be computed *accurately* from it; richer fields (`order_id`, `amount`, `items[]`, `payment_attempt_id`) unlock richer analytics automatically, with no configuration (blueprint Principle 11, contract §3/§8). The contract is a **capability ceiling, not an entry requirement.** *Why:* it aligns the developer's incremental path with the analyst's data quality — adoption is rewarded rung by rung instead of gated behind an all-or-nothing integration.

**2.7 Multi-tenant isolation.** Every data access is scoped to the owning `userId` (and project where applicable), written per-query and reviewed; cross-tenant leakage is a ship-stopping bug (standards §5, §12). *Why:* tenant isolation is not a feature, it is a correctness and security invariant; a single unscoped query is a data breach.

**2.8 Explainability.** Every metric carries its basis and its gaps to the surface: order-count basis labels, GMV-not-Revenue wording, "Sessions that purchased" vs confirmed purchases, per-currency labeling, tracking-health unlock hints (blueprint Principle 3/Part 9, contract §10/§11). *Why:* an explainable wrong-looking number is debuggable by the merchant; an unexplained one is a support ticket and a trust loss.

**2.9 Engineering simplicity / no premature abstraction.** The second duplication is a signal; the third is a refactor. Frameworks require three real consumers (standards §3.6). No new dependency without justification; prefer zero-dep solutions (standards §12). *Why:* EventPulse is deliberately a small, legible codebase (~16k TS lines). Speculative abstraction is the main way small codebases become unmaintainable ones, and every abstraction is a thing future contributors must learn.

**2.10 Reviewability.** Small, single-purpose branches; one feature = one reviewable diff; no unrelated changes; behavior-preserving refactors verified by response-diff harnesses (standards §3.3/§14). Thin controllers and domain-owned logic exist so a reviewer can audit tenant-scoping and metric-correctness in isolation. *Why:* with zero automated tests until Platform Phase 9, human review *is* the safety net; a diff that needs a tour guide cannot be reviewed for the subtle correctness properties (scoping, null-not-zero, ordering) that matter most.

**How the principles interlock.** These ten are not independent; they reinforce one another, which is why the platform can hold all of them at once. Append-only storage (2.1) is what makes read-time interpretation and honest historical comparison *possible* — you cannot safely reinterpret data that mutates under you. Honest analytics (2.2) and unavailable-over-fabricated (2.3) are the same commitment at two layers: the metric layer refuses to compute what it can't trust, and the presentation layer refuses to hide that refusal. Determinism (2.4) is the precondition for both reviewability (2.10) and the benchmark-first performance stance (§11) — non-deterministic output can be neither diffed nor baselined. Progressive capability (2.6) is what lets compatibility-first evolution (2.5) coexist with a growing feature set: new capability is always additive, so nothing old breaks. Multi-tenant isolation (2.7) and engineering simplicity (2.9) together explain the single-scope-authority design (§8): one place to get tenancy right is simpler *and* safer than many. The practical test for any proposed change is whether it can satisfy all ten simultaneously; if it forces a trade between, say, a new feature and honest analytics, honest analytics wins and the feature is reshaped or deferred (§18).

---

## 3. Overall Platform Architecture

```
   Browser (merchant's storefront / server)
        │  emits events
        ▼
   SDK  (future — Platform Phase 12; today: hand-rolled HTTP + curl)
        │  HTTP POST, API-key auth
        ▼
   API  (Express routes + middleware)
        │
        ▼
   Ingestion  (envelope validation · idempotency · rate limit · persist · alert side-effect)
        │
        ▼
   Database  (PostgreSQL — append-only Event store + tenant/project/key/alert models)
        │
        ▼
   Analytics Engine  (AnalyticsScope → domain query modules → pure builders → per-tab composers)
        │
        ▼
   Dashboard  (Next.js — tabbed, lazy-loaded, per-scope cached)
        │
        ▼
   Alerts  (threshold rules evaluated at ingestion; delivery hardening is future)
        │
        ▼
   Future platform components  (async pipeline · observability · batch/quarantine · SDK · docs/playground · rollups · webhooks · RBAC/audit · schema registry)
```

**Layer responsibilities.**

- **Browser / merchant source.** Originates events. Owns nothing about EventPulse's correctness except sending consistent identifiers (the contract puts `order_id` consistency and pseudonymous `customerId` on the merchant).
- **SDK.** *Future* (Phase 12). Its job is to make contract-complete events the path of least resistance via typed helpers, and to own sessionization, batching, retries, and offline buffering. Today merchants integrate by raw HTTP; the contract already specifies SDK behavior so the SDK, when built, cannot drift from it.
- **API.** Express routing, CORS, JWT auth for dashboard routes, API-key auth for ingestion. Thin: it routes and authenticates, it does not compute.
- **Ingestion.** The one write path for events. Validates only the *envelope* (system safety), applies idempotency, rate-limits per key, persists, and fires a best-effort alert evaluation that can never fail the write. Contract conformance is *measured*, not enforced, here.
- **Database.** PostgreSQL. The `Event` table is the append-only source of truth; commerce structure lives in a JSONB `properties` column, not in normalized tables. Tenancy, projects, API keys, and alerts are relational.
- **Analytics Engine.** Read-side. One shared `AnalyticsScope` defines tenant/project/time for every query; focused domain modules own SQL + row types + mapping; pure builders turn rows into domain metrics; per-tab composers assemble exactly what a tab needs.
- **Dashboard.** Next.js/React/Tailwind. Tabbed analytics with per-tab lazy loading and per-scope in-memory caching; presentational cards receive typed props and render honest states.
- **Alerts.** Threshold rules evaluated synchronously at ingestion today (a documented tradeoff, §18); durable async delivery is future (Phases 10A/14).
- **Future components.** Everything in the platform roadmap (Phases 9–17) attaches at one of these seams without redesign — that non-redesign property is itself an architectural goal (§19).

---

## 4. Request Lifecycle

A single ingestion request, end to end, and why each stage exists.

1. **Merchant → API.** A `POST` to the ingestion endpoint carries a raw API key (header) and a single event body (`name`, `customerId`, `sessionId`, optional `properties`, optional idempotency key). *Why single-event today:* batch transport is deliberately deferred to Phase 11; the single path is simpler and sufficient until an SDK needs batching.
2. **API-key authentication & authorization.** The raw key is hashed and looked up; a revoked key (403) or an archived project (403) stops here, before anything is stored. *Why:* authentication precedes all work; nothing is persisted for a paused project, and ownership is never taken from the request body (standards §5/§12).
3. **Rate limiting.** Per-key, in-memory today. Rejected requests (429) touch neither storage nor alerts. *Why here:* cheap rejection before expensive work; durable/distributed limiting is Phase 11.
4. **Envelope validation (the only hard gate).** `name`/`customerId`/`sessionId` shape rules, `properties` must be a plain object, serialized size ≤ 16 KB. Malformed → 400. *Why only the envelope:* validation Layer 1 protects the *system*; it never rejects an event for missing *contract* fields (that is measurement, not rejection — contract §7).
5. **Idempotency.** The client's idempotency key, scoped per API key, deduplicates retries; a duplicate returns the original event with `duplicate: true` (200), and a concurrent race resolves through a database unique constraint. *Why:* transport retries must never inflate counts; dedup at ingest is the first of two defenses (order-level dedup at the metric layer is the second).
6. **Storage.** The event is inserted verbatim — properties stored untouched, name case-preserved. Server receipt time is authoritative (`occurredAt` is Phase 11). *Why verbatim:* append-only honesty and read-time interpretation both depend on the stored row being exactly what the merchant sent.
7. **Alert side-effect.** A best-effort, never-throwing alert evaluation runs after the write. *Why isolated:* a side-effect must never turn a stored event into a failed request; this contract is mandatory for anything similar until the async pipeline (Phase 10A) moves it off the hot path.
8. **Analytics (read side, later and separately).** When a dashboard tab loads, `AnalyticsScope` is built from the request's tenant/project/range, domain modules run scoped queries, builders compute honest metrics, and a composer returns exactly the tab's payload.
9. **Dashboard.** The tab renders confirmed values, labeled fallbacks, or an unavailable state naming the unlock fields.

The write path and the read path are deliberately decoupled: writes are permissive and cheap; reads are where interpretation, scoping, and honesty live.

**Why this split is load-bearing.** Concentrating interpretation on the read side means a merchant's *already-ingested* history improves the day EventPulse ships a smarter reader — a new alias, a corrected dedup rule, a new metric all apply retroactively to stored facts, with no backfill and no migration. If interpretation happened at write time (normalizing names, computing derived fields, rejecting non-conforming events), that history would be frozen at the interpretation level of the day it arrived, and every reader improvement would require reprocessing or would simply not reach old data. The permissive write path is therefore not laziness; it is the mechanism that makes progressive capability (§2.6) work across time, not just across fields. The cost — that reads carry all the interpretation weight, including the guarded parsing and dedup that dominate the heavier queries — is a measured, deliberate performance tradeoff (§11), not an oversight.

---

## 5. Event Lifecycle

The lifetime of one event, and the architectural commitment at each stage.

- **Creation.** The merchant asserts a fact. The contract's taxonomy (Tiers 1–5) gives canonical names, but any custom name is welcome (Rung 0 analytics). Identity (`customerId`, `sessionId`) is pseudonymous and merchant-issued.
- **Validation.** Only the envelope can reject (system safety). Contract conformance is *observed* — Phase 1 validators classify missing/malformed contract fields as warnings, never rejections.
- **Storage.** Appended immutably to the `Event` table. Properties preserved as JSONB; name preserved as sent. The row is never updated or reinterpreted at rest.
- **Aggregation.** Read-time only. Scoped queries count, group, dedupe, and bucket. Aliases are normalized *here* (`LOWER(name) IN (...)`), not at write time. Order identity dedupes to distinct `(projectId, order_id)`; GMV dedupes to one amount per order.
- **Comparison.** Every scoped window has a previous-period counterpart (preceding equal-length range) computed from the same event history, so deltas are honest and same-basis.
- **Visualization.** The dashboard renders the event's contribution inside funnels, trends, product/category stats, shopper counts, and — as tracking matures — GMV/orders. Always with basis labels.
- **Historical retention.** Events accumulate indefinitely today; there is no ad-hoc deletion (standards §9). *Why:* history is the asset — refund/cohort/retention analytics defined now (contract Tier 5, blueprint Phase 7) become possible *retroactively* precisely because data was accumulating before the analytics existed.
- **Future archival.** Retention/partitioning/archive-then-drop is designed (Phase 13), not improvised. Rollups will replace hot full-scan paths; raw events may age into partitions. Until then, no automatic deletion may be added.

**Why the lifecycle has no "correction" or "delete" stage.** A merchant cannot edit or delete an event after it is sent; there is no update path and no ad-hoc deletion. This is deliberate and follows directly from append-only (§2.1). A world that needs corrections is served instead by *new events* — a `refund_issued` corrects a sale, an `order_cancelled` corrects an order — so the correction is itself a dated fact in the timeline rather than a mutation that erases what was true before it. The consequence a merchant sees: GMV is gross and does not retroactively shrink when a refund arrives; the refund is a separate, later fact whose analytics are deferred until the convention has accumulated data. This is more honest than in-place correction, which would silently change historical numbers a merchant may already have acted on, and it is the timeline analog of the no-meaning-changes rule: the past is immutable; the present appends to it.

---

## 6. Multi-Tenant Model

**How tenancy works.** A `User` owns `Project`s; each project owns `ApiKey`s, `Event`s, and `Alert`s. Every event carries `userId` and `projectId`. There is no shared data across users.

**Isolation rules.** Every event-touching query filters by `userId`, plus a project fragment where applicable; the filter is written per-query and visibly, and reviewed (standards §5/§9). Controllers never accept a `userId` from the request body; a client-supplied `projectId` is always ownership-checked. This is enforced architecturally by a single scope authority (§8): `AnalyticsScope` is the *only* place tenant/project/time SQL is constructed, so no analytics query can invent its own (weaker) scope.

**Ownership.** Resources belong to the authenticated user; project-scoped operations verify the resource belongs to that user before acting.

**Project scope.** The default analytics lens. A request may target one project or "all projects" (of that user). All-projects aggregates are per-user, never cross-user, and identity metrics that span projects are labeled aggregates (e.g. shopper identity is `(projectId, customerId)` — the same `customerId` in two projects is two shoppers).

**Workspace scope.** Today a "workspace" is effectively the user account. There is no separate team/workspace entity yet.

**Cross-project analytics.** Supported as the "all projects" scope, with the labeling rules above. It never merges tenants and never merges identities across projects.

**Future organizations.** Multi-user workspaces, roles, and audit logs are Platform Phase 15 (with the audit-log slice pulled forward per the roadmap's recommended order). The current single-owner model is a deliberate simplification that the tenancy invariant (`userId` on every row and query) lets Phase 15 extend without reworking existing queries.

**Why the invariant, not a middleware, enforces isolation.** Tenant isolation could in principle be enforced by a request-scoped middleware that injects a filter. EventPulse instead makes it a *per-query written invariant* funneled through one scope authority (§8). The difference matters: a middleware is a single point that is either present or absent, and a query that bypasses it (a raw admin query, a new endpoint that forgets it) leaks silently. A written-and-reviewed invariant, by contrast, makes the filter visible in every query's diff, and the single-scope-authority design means there is exactly one place that constructs the ownership SQL — so a reviewer's question is always the same ("does this query take the scope and use its fragments?"), and a query that doesn't is conspicuous. Isolation is thus enforced by *legibility* (you can see it in every query) plus *centralization* (there's only one way to get it right), which together are more robust for a small, review-gated codebase than an invisible middleware would be.

---

## 7. Data Model Philosophy

**Why events stay append-only.** See §2.1. Immutability is what makes historical comparison trustworthy and read-time reinterpretation safe: a stored fact never changes under a query.

**Why JSON properties are preserved verbatim.** Commerce structure (product, order, payment, coupon, line items) lives in a flat JSONB `properties` column, not in normalized tables (contract §3: "no entity requires a schema change — everything lives in `Event.properties` plus the envelope"). *Why:* the taxonomy must be extensible without migrations — a new dimension is a new property key, observed by the future schema registry, never a schema change. Flatness (one nested exception, `items[]`) keeps JSONB extraction simple, the 16 KB cap meaningful, and the registry tractable.

**Why the schema evolves slowly.** Relational tables exist only for genuine entities with lifecycles and relationships (User, Project, ApiKey, Event, Alert, AlertTrigger). Commerce "entities" are logical, not physical. *Why:* every table is a migration, an index decision, and a coupling; the JSONB model absorbs commerce evolution without any of that, and normalization is added only when a genuine relational need appears (it hasn't).

**Why read-time interpretation exists.** Meaning is applied when data is read, not when written: aliases normalized in queries, money guarded-parsed in SQL, order identity deduped at aggregation. *Why:* it keeps the write path permissive (append-only honesty) and lets interpretation *improve over time* without rewriting stored data — a store's old events gain new analytics the day EventPulse ships a new reader.

**Why canonical aliases exist.** Hand-rolled integrations send `product_view`, `view_product`, `product_detail_viewed`; the contract accepts all of them forever and normalizes at read time to a canonical name (contract §2). *Why:* append-only compatibility — an integration must keep working forever — combined with the desire to nudge (not force) upgrades. Aliases are also observability: seeing alias usage is how Tracking Health suggests the canonical upgrade.

**Why tracking capability evolves gradually.** The progressive-capability ladder (§2.6) is a data-model stance as much as a product one: the model stores whatever arrives, and richer analytics attach as richer fields appear. *Why:* it decouples merchant integration effort from EventPulse's analytics roadmap — both can advance independently against the same stable store.

**What the data model deliberately refuses.** The philosophy is as much about what is *not* modeled:

- *No physical commerce entities.* Product, order, cart, payment, coupon are logical entities represented as properties, never tables. The moment one becomes a table, every new dimension on it becomes a migration and the JSONB flexibility is lost for that entity.
- *No derived/computed columns at write time.* The store holds what the merchant sent, not what EventPulse inferred. Derivation is a read-time concern so it can improve retroactively.
- *No cross-project or cross-tenant identity resolution.* Shopper identity is strictly `(projectId, customerId)`; the same id in two projects is two shoppers, and merging them (Segment-style aliasing) is a deferred, correctness-critical system the model reserves a name for but does not half-build.
- *No inventory, catalog, or ledger modeling.* EventPulse observes commerce through events; it is not a system of record for stock, prices, or money movement. Friction events (`item_out_of_stock`) represent inventory's *analytics shadow*, not inventory itself.

Each refusal keeps the model small and append-safe. The bet, stated plainly in the contract, is that a flat append-only property model absorbs new *dimensions* indefinitely, and the only thing it cannot absorb — changed *meanings* — is banned outright.

---

## 8. Analytics Engine

Architecture only; formulas live in the blueprint and the phase workflows.

**Modules.** The read side is decomposed into focused domain modules (event activity, trend, comparison, commerce funnel, session funnel, shopper summary, product performance, health/insights, and — Phase 2 — sales). Each owns its SQL, its raw row types, and its mapping. *Why:* a 1,700-line analytics monolith (the pre-0D-3 state) was a permanent merge-conflict funnel and untestable in place; decomposition made each query independently reviewable, timeable (0D-5), and testable (future Phase 9).

**Scope.** `AnalyticsScope` is the single authority for tenant/project/time. Every fetcher takes it as its mandatory first argument and uses only its SQL fragments for ownership and range; no query composes its own scope. *Why:* one place to audit tenant safety (§6), one definition of "previous period," and one timezone convention — scope drift across queries would be both a correctness bug and a security risk.

**Builders.** Pure, Express-free functions turn rows into domain metrics (funnels, health, comparisons, product performance). *Why:* purity makes them the natural unit test target for Phase 9 and keeps HTTP concerns out of metric logic (standards §5).

**Comparison.** A shared previous-period mechanism (preceding equal-length range) computed from the same event history via scope fragments. *Why:* reused, honest, same-basis deltas everywhere instead of per-card reinvention.

**Trend engine.** Range-aware bucketing (hour/day/month) with a data-dependent all-time granularity, generated over a `generate_series` skeleton so empty buckets are real zeros, not gaps. *Why:* deterministic, gap-free trends that respect the database-session timezone convention (§20) without per-value timezone reinterpretation.

**Health.** Runtime measurement of contract conformance (grades, unlock hints) — the merchant-facing "what to track next." *Why:* it operationalizes progressive capability; it is the surface that turns a missing field into a fixable, quantified nudge.

**Insights.** Rule-based observations (spikes, drop-offs, worsening trends) — never AI, never prediction (blueprint Principle 7). *Why:* explainable, deterministic, defensible; "Automated Commerce Insights," not a black box.

**Tab composition.** Per-tab composers each run their own `Promise.all` and return exactly the tab's payload; the controller switches on a required `tab` parameter. *Why:* only the active tab's queries run (the static Sales-until-Phase-2 tab ran zero), keeping each request minimal and each tab independently cacheable and measurable.

**Future Sales.** Phase 2 activates the Sales/Revenue tab with confirmed Orders (distinct `order_id`), confirmed GMV (one amount per order), and AOV — per-currency, no FX, with a labeled session fallback for orders that never blends into confirmed values. *Why here and not earlier:* it is the first *consumer* of the Phase 1 contract module's order-identity and money rules; building it earlier would have meant inventing order identity ad hoc in SQL.

**Why the engine is decomposed the way it is (and not another way).** Two decompositions were rejected on the road to the current shape. *Tab-shaped folders* (an `overview/` module, a `conversion/` module) were rejected because the data does not cut that way — event-activity rows feed both Overview and Behavior *and* the health/insight builders; a tab-shaped layout would force cross-folder imports that misrepresent the real dependency graph. *A generic query-builder / repository layer* was rejected as a premature abstraction (2.9): there is one database, one query style, and no second consumer that a generic layer would serve — it would add indirection a reviewer must learn without removing any real duplication. The chosen shape — flat domain modules, each owning one coherent slice of SQL, all consuming one scope object, all producing plain builders — is the smallest structure that makes each query independently reviewable for tenant-safety and independently timeable for the benchmarks. The composers sit on top precisely so that "what a tab needs" is expressed once, in one place, rather than smeared across the modules that happen to supply it.

**The two-defenses model against double-counting.** A recurring hazard in commerce analytics is counting the same real-world event twice: the seed itself emits both `purchase_completed` and `payment_completed` for one order, and merchants retry requests. The engine defends in two independent layers. The *first* defense is transport idempotency at ingest (§4): a retried request with the same idempotency key returns the original, so identical requests never become two rows. The *second* defense is metric-layer dedup at read: Orders count distinct `(projectId, order_id)` and GMV takes one amount per order, so even genuinely distinct events describing one order (the purchase fact and the payment fact) collapse to one order and one amount. Neither defense alone is sufficient — idempotency cannot dedup two *different* events about one order, and metric dedup cannot help metrics that have no order key — which is exactly why both exist and why the contract makes `order_id` the load-bearing dedup key.

---

## 9. Dashboard Architecture

**Why tabs exist.** Analytics is organized into Overview / Conversion / Sales / Products / Shoppers / Behavior (blueprint Part 6 calls the money tab "Revenue"; the implementation shipped it as "Sales" — same tab, money labeled GMV; see §4-inconsistencies in the final report). *Why:* each tab answers a distinct merchant question and maps to a distinct backend composer, so the IA and the data-fetch boundary coincide.

**Why lazy loading exists.** Only the active tab's request fires; switching tabs fetches on demand. *Why:* opening Overview should not execute the heaviest product CTEs or the funnel queries; the static Sales tab (pre-Phase-2) issued zero requests. The unit of user-visible latency is the tab request, which is also the unit the benchmarks measure.

**Caching philosophy.** In-memory, per-scope, session-lifetime: a loaded tab's data persists while the scope key is unchanged; revisiting renders instantly with no request. Any scope change (project, preset, custom range) discards the whole cache. *Why:* the simplest cache that removes redundant refetches without introducing TTLs, storage, or a dependency (React Query was explicitly rejected — one consumer, one invalidation rule). Staleness is bounded and explicit via manual refresh.

**Refresh philosophy.** Refresh reloads the *current tab only*; a failed tab shows an in-panel error and never erases sibling tabs' loaded data. *Why:* minimal work, isolated failure, no full-page reloads.

**Unavailable-state philosophy.** A locked metric renders an honest unavailable state naming the exact fields that unlock it (progressive capability made visual). Empty states are calm and instructive ("Send events like…"), never fake-positive, never "0 insights." *Why:* the unavailable state is a feature — it is the merchant's next-step guide, not an error.

---

## 10. API Philosophy

**Error envelopes.** One shape: `{ success: true, data }` / `{ success: false, message }` (standards §10). *Why:* a single predictable contract for every client; changing the envelope is a versioning event, not a casual edit.

**Authentication.** Two schemes for two audiences: hashed **API keys** for ingestion (machine-to-machine, keys shown once, stored hashed), **JWT** for dashboard routes (human sessions). *Why:* ingestion and dashboard have different threat models and lifecycles; conflating them would weaken both.

**Versioning & compatibility.** Responses evolve additively; fields are never renamed in place; removals require a deprecation window and coordinated web types (standards §10, MIRROR rule §15). The ingestion contract is append-only — nothing that ingests today may start failing. *Why:* external integrators and a future SDK depend on wire stability; compatibility is absolute (§2.5).

**Extensibility.** New capability arrives as new additive fields (e.g. Phase 1 readiness, Phase 2 `salesKpis`) and new tab values, never as breaking reshapes. Metric metadata (basis, direction, labels) travels *in* the response so the client never has to infer a metric's trustworthiness. *Why:* labeling is a correctness requirement, not a client concern (§2.8).

**Why responses are shaped the way they are.** Nullable-for-unavailable, discriminated unions for state, per-currency arrays instead of blended totals, basis discriminants the UI must branch on — the response shape *encodes* the honesty rules so an unlabeled or fabricated render is structurally hard to produce. *Why:* pushing honesty into the type system is cheaper and safer than trusting every UI author to remember it.

**The shape-encodes-the-rule pattern, concretely.** Three recurring shapes make dishonesty hard to write:

- *Nullable metrics.* A value that can be unavailable is typed `number | null`, not `number` defaulted to 0. A UI author who wants to render it must handle the null branch, and the honest empty/unlock copy is the natural thing to put there. The type makes "forgot to handle unavailable" a compile error, not a silent zero.
- *Discriminated basis.* The sales payload carries a `basis` discriminant (`confirmed` vs `session-approximate`). Because the confirmed and approximate values live under different, non-interchangeable shapes, there is no code path that renders an approximate number where a confirmed one is expected without going through the branch that also carries the "approximated by…" label.
- *Per-currency arrays.* Money is an array of per-currency slices, never a scalar total. There is no field to put a blended number *in* — the no-FX rule is enforced by the absence of a place to violate it.

The general principle: when a rule is important enough to be load-bearing (honesty, no-FX, tenant scope), prefer to make its violation *unrepresentable in the type* over documenting it and hoping. Documentation is for humans who read it; types are for the compiler that checks everyone.

---

## 11. Performance Philosophy

**Current approach.** Correctness before cleverness; measure before optimizing (standards §3.1). No performance work ships without a number showing the problem, and a number showing the fix helped (standards §16, "no measurement → not performance work").

**Current constraints (known, measured or measurable).** All analytics run as raw SQL over the append-only `Event` store; funnel/alias filters use `LOWER(name)` (no covering index); the period-comparison query scans the user's full history by design (range lives in `FILTER`); the connection pool default (max 10) is smaller than the all-projects Overview fan-out (up to ~11–14 statements). These are documented, not yet fixed.

**Why optimization is delayed.** Two phases changed the analytics fetch architecture (0D-3 decomposition, 0D-4 lazy loading) while deliberately claiming *no* latency numbers — statement counts are facts, latency is not, until measured. Optimizing before decomposition/lazy-loading would have optimized a shape that no longer exists.

**Benchmark-first approach.** Phase 0D-5 builds a reproducible, per-tab, per-query baseline (deterministic tiered datasets, pinned environment, cold/warm distributions, EXPLAIN plans) and a findings table that *ranks* candidate optimizations by evidence. Only then may a future branch add an index or rewrite a query, and only clearing an explicit evidence bar (a number, a plan showing the pathology, a selectivity argument, a write-path cost acknowledgement, before/after on the bench tier).

**Measurement before optimization.** This is the load-bearing performance principle: rollups (Phase 13) are explicitly benchmark-gated; indexes are baseline-gated; even "obviously safe" rewrites are frozen during measurement. *Why:* the intuitive slow query is often not the real one (the comparison full-scan vs. the "scary" product CTEs); guessing taxes the ingestion hot path (every Event index slows writes) for possibly no gain.

**The evidence bar, concretely.** A future optimization branch is not authorized by a hunch or even by a slow-looking plan alone. It must clear five gates, all from the committed baseline rather than an ad-hoc run: (1) a *number* — the query exceeds its budget, or dominates a tab that does, at the primary tier; (2) a *plan* — the EXPLAIN shows the specific pathology the change would fix (a low-selectivity sequential scan, an external-merge sort, hash batches spilling), attributable to the thing being changed rather than a generic "a scan exists"; (3) a *selectivity argument* — for an index, that its leading columns actually select a small fraction of scoped rows; (4) a *write-path acknowledgement* — every Event index's maintenance cost on ingestion is named and, once an ingestion baseline exists, measured; (5) a *before/after* on the same bench tier and seed. This bar exists because the cheapest way to make analytics slower overall is to add an index that helps one read and quietly taxes every write. Rollups (Phase 13) sit at the top of this ladder: they are the designed answer for hot full-scan aggregations, but they are gated on the baseline proving the full-scan is actually hot, because a rollup is a whole new consistency and backfill surface that is only worth its cost against a measured problem.

**Why single-flight, not load testing.** The 0D-5 baseline measures one request at a time by design. Concurrency/soak testing is deliberately excluded because the async pipeline it would stress (Phase 10A) does not exist yet, and because single-user latency is the honest first question ("is a tab fast for one merchant?") before the multi-user one. The known pool-vs-fan-out constraint (the all-projects Overview issues more concurrent statements than the default pool holds) is *recorded and quantified* by the baseline as a finding, not fixed inside the measurement phase — measuring a system and changing it in the same breath is how baselines lie.

---

## 12. Security Philosophy

**Tenant isolation.** The absolute invariant (§2.7, §6): every query scoped, no cross-tenant cache key or path, client-supplied ids ownership-checked. A leak is ship-stopping.

**API keys.** Raw value shown once, stored hashed; masked values never copyable as real; server logs never print raw keys. *Why:* keys are bearer credentials for ingestion; minimizing their exposure surface is non-negotiable.

**JWT.** Dashboard auth; the signing secret fails fast at boot (extended to all required env vars in Phase 0M). *Why:* a missing/weak secret must fail loudly at startup, not silently at request time.

**PII.** EventPulse is pseudonymous by design — `customerId` is a merchant pseudonym; the contract bans emails, names, phones, street addresses in any field (contract §5). IP/user-agent are stored for event-drawer debugging only and must *never* derive identity (blueprint never-build; standards §12). PII handling is documentation-and-convention in Phase 1 (no ingestion-time rejection code exists for it, and inventing one would extend the contract); detection is future (Health/registry). *Why:* not wanting PII is a design stance — it removes a whole class of privacy risk and regulatory surface.

**Rate limiting.** Per-key today (in-memory, single-instance, self-documented); durable/distributed is Phase 11. *Why:* basic abuse protection now, correct multi-instance protection when the platform needs it.

**Future auditing.** Audit logs and RBAC are Phase 15 (audit slice pulled forward). SSRF defenses are pre-committed for any future URL-fetching feature (webhooks, Phase 14). *Why:* security features are designed into their phases, not bolted on.

**The layered defense summary.** Security in EventPulse is not one mechanism but a stack, each layer covering a different failure:

- *Authentication* answers "who is calling" — API key (hashed, ingestion) or JWT (dashboard).
- *Authorization / ownership* answers "may they touch this resource" — every project-scoped operation verifies the resource belongs to the caller.
- *Tenant scoping* answers "what data may this query see" — the written, centralized invariant (§6) that no query escapes.
- *Input limits* answer "how much / what shape" — body-size caps, field-length caps, the 16 KB properties cap, control-character rejection.
- *Pseudonymity by design* answers "what if data leaks anyway" — there is no PII to leak, because the contract bans it and the product never derives identity from IP/UA.

The design intent is that no single layer is the whole defense: even a scoping bug is contained by the fact that there is no cross-tenant PII to expose, and even a leaked API key is limited to one project's ingestion, shown once and stored hashed so the database itself never holds the usable value.

---

## 13. Database Philosophy

**Why PostgreSQL.** A mature relational engine with first-class JSONB, window functions, `FILTER`, CTEs, and `generate_series` — exactly the toolkit honest commerce analytics needs (distinct-count identity, per-currency aggregation, gap-free trends). *Why not a specialized analytics store:* the data volumes and the trust-over-scale priority make a single well-understood database the right call until benchmarks prove otherwise (and even then, rollups inside Postgres come before any warehouse).

**Why Prisma.** Typed schema, migrations, and a client that still allows raw parameterized SQL for the analytics queries that need Postgres-specific features. *Why:* type safety at the model layer plus full SQL expressiveness where analytics demands it — parameterized always, never string-concatenated (standards §9).

**Why JSONB.** Commerce structure is stored as flat JSONB properties, not normalized tables (§7). *Why:* schema-free extensibility for an append-only, registry-observed property model; the cost (no covering index on nested keys) is a measured performance concern (§11), not a modeling mistake.

**Index philosophy.** Indexes accompany *access patterns*, added with evidence. Existing indexes cover the tenant/time and identity access patterns; expression indexes on `LOWER(name)` and JSONB GIN are *candidates* the 0D-5 baseline will confirm or kill. No index is added speculatively — every Event index taxes the ingestion hot path. *Why:* indexing is a write-cost/read-benefit tradeoff that must be measured, especially on the hot write path.

**Migration philosophy.** Additive by default; nullable columns for backfill-later data; migration + code committed together; destructive changes require human approval, rehearsal, and a rollback note (standards §9). *Why:* the append-only, compatibility-first stance extends to the schema — migrations that could break ingestion or history are gated hard.

**Why normalization is intentionally limited.** See §7. Logical commerce entities do not get physical tables; the JSONB model absorbs their evolution. Normalization is added only for genuine relational entities with lifecycles. *Why:* every table is coupling and migration cost; the model deliberately trades relational purity for evolutionary freedom.

---

## 14. Frontend Philosophy

**Why Next.js/React/Tailwind.** A server-component-first React framework with file routing and a utility CSS system — enough structure for a real dashboard, little ceremony. Default to server components; `"use client"` only where state/effects/browser APIs require it. *Why:* keep the rendered surface lean and the interactive surface explicit. (Note: this project's Next.js version has breaking changes vs. common training data — contributors consult the in-repo Next docs before writing framework code.)

**Component ownership.** Pages stay thin; container components (`*Overview.tsx`) own fetching and state; presentational cards receive typed props and render, staying hook-free where possible. *Why:* a clean split between "gets data / manages state" and "renders honestly" makes both independently reviewable and the cards reusable.

**Hook ownership.** Data-fetching follows one established pattern (`useCallback` + `useEffect` + discriminated `FetchState`); the per-tab analytics hook centralizes scope-keyed caching and stale-response protection. *Why:* one pattern reused identically beats many bespoke variants; the discriminated union makes loading/error/success states exhaustive.

**State ownership.** Global/scope state lives in a header context; page data state lives in the page container; presentational components own only trivial local UI state. URL owns bookmarkable state (active tab, custom range). *Why:* a clear ownership hierarchy prevents prop-drilling and effect-driven state mirroring (a lint-enforced ban).

**When shared hooks are justified.** A shared hook/primitive requires three real consumers (§2.9). The per-tab data hook earned its place; a general fetch/auth helper was consolidated in Phase 0M only once the duplication (7× base URL, 5× auth headers) was proven and load-bearing. *Why:* abstraction follows demonstrated duplication, never anticipation.

**The honest-state obligation on the frontend.** Because honesty is the product (§1), the frontend carries a specific obligation the backend cannot discharge alone: every card must render all of its states — loading, error, empty, partial, and unavailable — and each must be honest. An empty state names the action that fills it; an unavailable state names the fields that unlock it; a partial state (e.g. GMV computed from the orders that carried money) states its coverage. This is why presentational cards are kept thin and typed: a card whose props are `metric: number | null` plus a labeled basis has the information it needs to be honest, and the discriminated-union fetch state (`loading | error | success`) makes the non-success branches impossible to forget. The frontend's job is not to make numbers look good; it is to make sure a number never appears without its context.

---

## 15. Backend Philosophy

**Controller responsibilities.** Controllers do HTTP only: parse/validate input, call logic, shape the response, catch → structured 500. New *pure* logic (metric builders, validators, scoring) lives in importable, Express-free modules. *Why:* thin controllers are reviewable for auth/scoping at a glance, and pure logic is the Phase 9 test target; the pre-0D-3 analytics monolith and the pre-0M 522-line ingestion controller are the anti-patterns Phase 0M/0D-3 exist to fix.

**Analytics module ownership.** Each domain module owns its SQL, row types, and mapping, and consumes `AnalyticsScope`; aliases and numeric helpers come from one shared source; composers orchestrate. *Why:* single-responsibility modules with one scope authority make tenant-safety and metric-correctness auditable per file.

**Validation ownership.** Envelope validation (system safety, hard) is isolated in ingestion modules; contract validation (conformance, soft/observational) is a separate pure module consumed at read/measure time. The two never blur — only the envelope can reject (contract §7). *Why:* mixing "reject to protect the system" with "measure to help the merchant" is exactly how permissive-ingestion platforms accidentally start rejecting valid facts.

**Why controllers stay thin.** See §2.10 and above: reviewability with zero automated tests, testability once Phase 9 lands, and a clean seam for the async pipeline (Phase 10A) to move side-effects off the request. *Why:* thin controllers are the precondition for safely evolving everything behind them.

---

## 16. Engineering Workflow

**Planning.** Every phase gets a design/workflow document before code. Product semantics come from the blueprint/contract; engineering practice from the standards; sequencing from the roadmap. Plans reference this book for architecture instead of re-explaining it.

**Implementation.** One phase, one branch family, small single-purpose diffs. Branches are created/switched by the human owner; agents confirm a clean tree and never branch/switch/commit without instruction (standards §14/§18).

**Validation.** Typecheck + build + focused lint + `git diff --check`, plus documented manual/API verification (until Phase 9 tests exist). Behavior-preserving refactors additionally use response-diff harnesses (byte-identical proofs). Honesty is mandatory: state exactly what was runtime-verified vs. inspected (standards §18.7).

**Review.** Human review is the safety net (no automated tests yet). The PR checklist covers scope, tenant isolation, analytics semantics (distinct-session basis, real denominators, null-not-zero, alias source, deterministic ordering), edge cases, performance, a11y, and no-new-duplication (standards §15).

**Merge.** Human-owned; no agent-initiated merges/rebases/force-pushes; validation green or explicitly accepted (standards §14).

**Benchmark.** Performance-relevant changes rerun the 0D-5 matrix against the committed baseline; a seeder change cuts a new baseline of record (both kept). Optimization requires the evidence bar (§11).

**Maintenance.** Bounded maintainability sweeps (Phase 0M) clear verified debt (lint gate, dead code, duplication, oversized mixed-concern files) *between* feature phases, with explicit stop conditions so cleanup never becomes endless. Line counts are review *signals*, never hard rules — "review for extraction, do not split automatically."

**Future phases.** The roadmap (Phases 9–17) drains the debt register in scheduled order; nothing preempts a scheduled phase opportunistically.

**How Claude and Codex work together.** A planning/architecture agent (Claude) produces phase workflows and handoff prompts; an implementation agent (Codex) executes one strictly-scoped branch at a time under those prompts, inspecting before editing, preserving behavior, running validation, and reporting honestly without committing. This book and the workflow documents are the shared source of truth that keeps the two aligned.

**Worked example: how a new analytics metric is added.** This walkthrough is the canonical shape of feature work; it references the layers above rather than re-specifying them. A new metric moves through the architecture in a fixed order:

1. **Question first (blueprint).** The metric must state its merchant question ("a card that can't state one doesn't ship"). Its definition — basis, denominator, degraded state, labels — is settled in the blueprint/contract, not invented in code.
2. **Definitions before computation (shared metric module).** Any alias set, money rule, or identity rule the metric needs lives in the one shared module, added there if absent, never inlined into a query.
3. **Scoped query in a domain module.** The metric's SQL takes `AnalyticsScope` as its first argument, uses only scope fragments for ownership/time, parameterizes all values, and carries an explicit deterministic `ORDER BY` if it limits. It lives beside its row type and mapping.
4. **Pure builder.** Row-to-metric logic is an Express-free function that models unavailability as `null`, never zero, and carries the metric's basis/label. This is the unit that Phase 9 will test.
5. **Composer wiring.** The relevant tab composer adds the fetch to its `Promise.all` and the built value to its payload. If the metric belongs to a new response field, the type is additive and MIRRORed to the web side in the same change.
6. **Honest rendering.** The presentational card renders confirmed, labeled-fallback, and unavailable states, with the unlock copy for the last.
7. **Verification.** Typecheck/build/lint, plus documented manual/API verification (and a benchmark rerun if the query is performance-relevant). The PR reports what was runtime-verified vs inspected.

The point of the fixed order is that correctness is established layer by layer: the definition is right before the SQL exists, the SQL is scoped before it is wired, and the honesty is in the type before it reaches a human's screen.

---

## 17. Phase Evolution

Each phase exists to unlock the next; the ordering is dependency-driven, not arbitrary.

- **0A — Land Product Performance.** Finished the in-flight attribution work and the "Sessions that purchased" relabel. *Unlocks:* an honest product-analytics baseline to reorganize.
- **0B — Analytics IA.** Introduced the sub-tab structure (Overview/Conversion/Revenue/Products/Shoppers/Behavior); moved existing cards, no new calculations. *Unlocks:* a per-tab boundary that later phases fetch and measure along.
- **0C — Card consolidation.** Merged funnels (one component, basis toggle), merged Health+Insights, built the KPI row v1 with previous-period deltas. *Unlocks:* the consolidated surfaces Phase 2 extends with GMV/Orders.
- **0D — Scope & comparison + decomposition.** Custom date ranges; one shared scope for all tabs; and the analytics decomposition arc: **0D-2** shared `AnalyticsScope`, **0D-3** query-module decomposition (thin controller), **0D-4** per-tab lazy loading, **0D-5** performance baselines. *Unlocks:* a modular, scoped, measured analytics engine — the precondition for trustworthy new metrics.
- **0M — Maintainability sweep.** Lint-to-zero (so lint can gate), dead-code removal, fetch/auth consolidation, env fail-fast, and ingestion-controller extraction. *Unlocks:* a reviewable ingestion path — the hard prerequisite for Phase 1 wiring.
- **1 — Commerce Tracking Contract.** The contract represented in code (single alias source, money rules, order-identity constants, warning taxonomy), observational validators (never rejecting), readiness reporting (rung detection), docs, and seed alignment. Properties-only; no schema change. *Unlocks:* the definitions Phase 2 consumes and the readiness surface merchants follow.
- **2 — GMV & Orders MVP.** Activates the Sales tab: confirmed Orders (distinct `order_id`), confirmed GMV (one amount per order), AOV; per-currency, no FX; labeled session fallback; F3 category/product line-GMV and D1 units where `items[]` present; Overview KPI gains GMV/Orders. *Unlocks:* the money foundation Shopper MVP (Phase 3) and Conversion depth (Phase 4) build on.
- **Future roadmap (Platform Phases 9–17).** 9 testing foundation → 10A async pipeline (Postgres outbox) → 10B observability (structured logs, request IDs, error middleware) → 11 batch ingestion + quarantine + `occurredAt` + durable rate limiting → 12 TypeScript SDK → 12.5 docs/playground → 14 webhooks/notifications (delivery hardening) → 13 rollups (benchmark-gated) → 15 collaboration/RBAC + audit → 16 self-observability → 17 schema registry. The roadmap's recommended execution order deviates from the numbering (notably 14 before 13, audit slice pulled forward) — the roadmap document is authoritative on order.

Each phase leaves the product fully working; none requires a future redesign to accommodate the next (blueprint Part 9).

**Why the ordering is dependency-driven, not value-driven.** A naive roadmap would front-load the highest-value merchant features (GMV, payments, retention). EventPulse deliberately does not, because each of those features is only *trustworthy* once its substrate exists. GMV (Phase 2) depends on order identity and money rules being represented in code (Phase 1), which depends on the ingestion controller being reviewable enough to wire them into (Phase 0M), which is most safely done after the analytics engine is decomposed, scoped, and baselined (Phase 0D). Building GMV first would have meant order-identity logic scattered through ad-hoc SQL, wired into an unreviewable controller, with no baseline to catch the performance regression — three ways to ship a number that looks right and drifts. The roadmap's shape is the honesty principle applied to *sequencing*: build the floor before the room. The same logic governs the platform phases — tests (9) before the async refactor they protect (10A), observability (10B) before the batch surface it must diagnose (11), the SDK's contract (Phase 1) years before the SDK itself (12).

**The two maintainability phases, and why they're phases.** 0D (the analytics decomposition arc) and 0M (the cross-cutting sweep) are the only phases whose *deliverable is reviewability itself* rather than a feature. They exist as first-class phases, not as work smuggled into feature branches, because the codebase has no automated tests: a large refactor mixed with a feature is unreviewable for the correctness properties that matter, and the standards forbid exactly that mixing (no unrelated changes in feature branches). 0M in particular is time-boxed with explicit stop conditions so that "clean up the codebase" — an infinitely expandable task — cannot delay Phase 1 indefinitely; when the critical and high-value debt is cleared, remaining cosmetics go to the debt register and the phase ends.

---

## 18. Tradeoffs

What EventPulse intentionally does *not* do, and why the omission is a decision, not a gap.

- **No session replay / heatmaps.** No capture data, different product category, privacy/storage scope. Honesty extends to inputs — explicit events only, never auto-captured DOM.
- **No APM / infra observability.** Contradicts the commerce-identity focus; self-observability (Phase 16) is a different, later concern.
- **No A/B experimentation.** A separate product; funnels + segmentation cover the analysis half.
- **No IP/UA identity enrichment or demographics.** Violates the no-identity-guessing principle; IP/UA are debugging fields only.
- **No LLM chat-with-data / predictions / forecasts.** Trust, cost, and accuracy make rule-based honesty the brand; insights are deterministic rules, never AI (blueprint Principle 7).
- **No custom drag-drop dashboards.** The curated, opinionated IA is a differentiator; generic dashboards destroy it.
- **No FX conversion, ever.** A converted total is fabricated data; mixed currencies stay per-currency, labeled (contract §3).
- **No synchronous everything forever.** Alert evaluation runs on the ingest hot path *today* as a documented tradeoff; the async outbox (Phase 10A) is the designed escape, not an afterthought.
- **No batch/SDK/occurredAt yet.** Single-event, server-time, curl-first is deliberately sufficient until an SDK needs the rest (Phases 11/12).
- **No premature optimization.** Known constraints (LOWER(name), comparison full-scan, pool<fan-out) are measured before fixed (§11).
- **No big-bang metrics framework.** One incremental shared module, formalized only when dashboard + insights + alerts all consume it (blueprint Part 5).
- **No automated tests yet — but honestly so.** The single largest gap (standards §17), scheduled as Phase 9, mitigated meanwhile by thin controllers, pure builders, response-diff harnesses, and documented manual verification. The tradeoff is named, not hidden.

Every "later" here is a scheduled phase with a reason, not a backlog wish.

---

## 19. Future Architecture

High-level direction only; the roadmap owns the detail.

The platform's future is a sequence of seams already present in today's architecture being filled without redesign:

- **A safety substrate first (9, 10A, 10B).** Tests and CI make refactors safe; a Postgres transactional outbox moves side-effects (alerts, future webhooks) off the request; structured logging + request IDs + centralized error handling make failures diagnosable once async work exists. These harden the *substrate* before new surface is built on it.
- **Ingestion maturity (11, 12, 12.5).** Batch transport with per-item quarantine (accept-and-flag over reject, pairing with progressive capability), optional client `occurredAt` with clamp, durable rate limiting; then the typed TypeScript SDK that makes contract-complete events the default; then a docs/playground surface generated from the shared contract module so docs cannot drift from the software.
- **Scale and reach (14, 13, 15).** Webhook/notification delivery (with SSRF defenses pre-committed); benchmark-gated rollups that replace hot full-scan paths with monthly aggregates and enable retention/partitioning; collaboration/RBAC with an audit log.
- **Governance (16, 17).** Self-observability (EventPulse watching itself) and a schema registry that observes what each project actually sends, surfacing alias usage and per-project enforcement modes (observe → warn → block-to-quarantine), always observe-by-default.

The through-line: a flat, append-only, registry-observed event model absorbs new *dimensions* indefinitely; what it refuses to absorb is changed *meanings*. That is the entire future-proofing strategy, and it is deliberately enough (contract §13).

---

## 20. Architecture Decision Records

The permanent decisions, each with its reason and the alternative it rejected. These are stable; changing one is a platform-level event. The "rejected" clause matters as much as the reason — it records what the decision is *not*, so a future contributor doesn't re-propose a settled question.

1. **Append-only event store.** Events are immutable facts. *Why:* stable history, safe read-time reinterpretation, trustworthy comparisons (§2.1). *Rejected:* mutable events / "correct in place," which would freeze historical comparisons and make read-time reinterpretation unsafe.
2. **JSONB commerce properties, not normalized tables.** Commerce entities are logical, stored flat in `properties`. *Why:* schema-free extensibility; no migration per new dimension (§7, §13). *Rejected:* normalized product/order/line-item tables, which turn every new dimension into a migration and every read into a join, for relational purity the product doesn't need.
3. **Read-time alias interpretation.** Names stored verbatim; canonicalized in queries. *Why:* forever-compatible integrations + upgrade observability (§7). *Rejected:* write-time normalization, which would destroy alias-usage visibility (the upgrade nudge) and freeze old data at the alias table of its ingestion day.
4. **No FX conversion.** Money stays per-currency, dominant-currency headline labeled. *Why:* a converted total is fabricated (§2.2, contract §3). *Rejected:* a blended multi-currency total, which is invented data no exchange-rate choice can make honest.
5. **Unavailable over fabricated (null ≠ zero).** Can't-compute is null + named unlock fields. *Why:* zero and null answer different questions; conflating them lies (§2.3). *Rejected:* zero-filling missing metrics, the single most common way analytics tools silently mislead.
6. **Tab-scoped analytics endpoints.** One required `tab` parameter → one composer. *Why:* the fetch boundary matches the IA; only needed queries run (§8, §9). *Rejected:* one monolithic summary endpoint returning every tab's data (the pre-0D-4 state), which ran the heaviest queries on every page including the static one.
7. **Per-tab lazy loading + per-scope cache.** Active tab fetches on demand; scope change invalidates all. *Why:* minimal work, isolated failure, no dependency (§9). *Rejected:* React Query / a caching library, whose dedup/TTL/background-refetch features answer problems this single-consumer, single-invalidation-rule surface doesn't have.
8. **Benchmark before optimization.** No perf work without a measured number; rollups/indexes are baseline-gated. *Why:* the intuitive slow query is often wrong; guessing taxes the write path (§11). *Rejected:* optimizing during the decomposition/lazy-loading arc, which would have tuned a request shape that no longer exists.
9. **Single AnalyticsScope authority.** All tenant/project/time SQL built in one place. *Why:* auditable tenant safety, one "previous period," one timezone convention (§6, §8). *Rejected:* per-query scope assembly, where one query silently weakening its `userId` filter is a data breach no reviewer would reliably catch.
10. **Thin controllers, domain-owned logic.** HTTP in controllers; pure logic in modules. *Why:* reviewability now, testability at Phase 9, clean async seam later (§15). *Rejected:* fat controllers (the pre-0M 522-line ingestion handler, the pre-0D-3 1,700-line analytics monolith), unreviewable and untestable in place.
11. **MIRROR rule instead of a shared types package (for now).** Server/web response types edited together with pointer comments. *Why:* a shared package is a real decision with real cost; the third-consumer rule isn't met yet (§14, standards §4). *Rejected:* a premature shared package, and its opposite (unmarked duplicate types with no drift signal at all).
12. **Idempotency via DB unique `(apiKeyId, idempotencyKey)`.** Dedup at ingest with race-safe resolution. *Why:* retries must never inflate counts; the constraint is the source of truth (§4). *Rejected:* application-level dedup checks alone, which race under concurrency; the DB constraint is the only authority that can't be out-raced.
13. **Confirmed order identity = distinct `(projectId, order_id)`.** Case-sensitive, tenant-scoped. *Why:* the merchant owns id consistency; distinctness absorbs re-sent purchase/payment facts (blueprint Principle 3, contract §3). *Rejected:* counting orders from raw purchase-event volume, which double-counts the purchase/payment overlap; and case-folding ids, which would merge genuinely distinct merchant ids.
14. **GMV dedup: one amount per distinct order.** Representative-event selection, never per-event sums. *Why:* per-event money double-counts identically to per-event orders (blueprint Principle 3). *Rejected:* summing amounts across an order's events; and "latest event wins," which lets a re-sent event silently rewrite historical GMV (corrections belong to refund/cancel events, whose analytics are deferred).
15. **Progressive capability ladder.** Runtime behavior (metrics unlock as fields appear); build order stays sequential. *Why:* decouples merchant integration effort from the analytics roadmap (§2.6). *Rejected:* gating analytics behind full-contract adoption, which would punish incremental integrators and contradict append-only permissiveness.
16. **Database-session timezone convention.** Naive timestamps, `date_trunc`/`NOW()` in SQL, no `AT TIME ZONE` reinterpretation. *Why:* one consistent, documented bucketing convention across all range queries (§8). *Rejected:* per-query timezone reinterpretation, which would make two trends on the same data disagree depending on which query wrote the SQL.
17. **Incremental shared metric module, not an upfront framework.** Aliases/formulas/parsing/identity/scope centralized only as consumers appear. *Why:* prevents a big-bang framework; abstraction follows three real consumers (§2.9, blueprint Part 5). *Rejected:* an upfront metrics-catalog framework built before dashboard, insights, and alerts all consume it.
18. **Zero-dependency bias.** No new library without justification; prefer built-ins. *Why:* a small legible codebase; every dependency is a liability (§2.9). *Rejected:* reaching for a library per problem (React Query, a validation framework, an FX library) — each rejected on its own merits against a built-in solution.
19. **Server time authoritative; `occurredAt` deferred.** Ingest stamps receipt time; client event-time is Phase 11 with a clamp. *Why:* single-event, server-time is sufficient until an SDK needs offline replay (§4, contract §1). *Rejected:* accepting client timestamps now, which invites clock-skew corruption of trends before there's an SDK or a clamp to defend against it.
20. **Synchronous alert evaluation now, async outbox later.** Best-effort, never-throwing on the hot path today; Phase 10A moves it off. *Why:* a documented interim tradeoff with a designed escape (§18). *Rejected:* building the async pipeline speculatively before tests (Phase 9) make that refactor safe, and its opposite (letting an alert failure fail the write).
21. **String-literal unions over enums; discriminated unions for state.** `HealthStatus`, `FetchState`, sales `basis`. *Why:* lightweight, exhaustive, and pushes honesty (labeled basis) into the type system (§10, standards §4). *Rejected:* TS `enum`s (heavier, no structural benefit here) and boolean-pair state flags (which permit impossible states like loading+error).
22. **Envelope-required vs contract-required distinction.** Only the envelope (name/customerId/sessionId, size, auth) can reject; contract gaps are measured, never rejected. *Why:* permissive ingestion + progressive capability; the system protects itself without punishing incomplete facts (§5, contract §7). *Rejected:* validating contract completeness at ingest, which would turn the capability ladder into an entry gate and start rejecting valid facts.

*(22 architecture decisions.)*

---

## 21. Glossary

Canonical definitions; where a term has a precise metric definition, the authoritative source is named.

- **Event.** An immutable fact the merchant sends: envelope (`name`, `customerId`, `sessionId`, optional `properties`, optional idempotency key) + server receipt time. Stored append-only.
- **GMV (Gross Merchandise Value).** The money label for confirmed sales: one guarded `amount` per distinct order, per currency, never converted. Labeled "GMV," never "Revenue." Gross — refunds not deducted in Phase 2. (Blueprint Principle 3 / F1; contract §3.)
- **Orders (confirmed).** `COUNT(DISTINCT (projectId, order_id))` over the order-fact event family, tenant-scoped. Never raw purchase-event counts. (Blueprint Principle 3; Phase 2 workflow §2.)
- **Session fallback (approximate orders).** When `order_id` is absent, distinct purchasing sessions, *visibly labeled* "approximated by purchasing sessions," never merged into confirmed values, never feeding AOV. (Blueprint Principle 3.)
- **AOV (Average Order Value).** Confirmed GMV ÷ money-bearing confirmed orders, per currency, confirmed basis only. Unavailable on the approximate basis. (Blueprint F2; Phase 2 workflow §2.3.)
- **Session.** One shopping visit, identified by envelope `sessionId`; SDK rules (30-min inactivity / 24h max, survives identify, resets on reset) are contract-defined because they define what "session conversion" means. (Contract §4/§9.)
- **Customer / shopper.** A merchant-issued pseudonym (`customerId`); shopper identity is `(projectId, customerId)` — the same id in two projects is two shoppers. No PII, no cross-project merge in v1. (Contract §4; blueprint Principle 5.)
- **Capability (progressive).** The set of analytics computable *accurately* from a store's current fields; each additional field unlocks a higher rung automatically. (Blueprint Principle 11; contract §8 ladder rungs 0–9.)
- **Tracking Health.** The runtime measurement of contract conformance per project/range — grades (Excellent…Broken), weighted by what each missing field locks, each deduction carrying its unlock hint. (Contract §10.)
- **Insight.** A rule-based, deterministic observation (spike, drop-off, worsening trend, GMV delta) — never AI, never prediction. (Blueprint Principle 7 / feature I-series.)
- **Analytics Scope.** The single request-level authority for tenant (`userId`), project, and time range/comparison, exposing SQL fragments every analytics query must use. (Engine §8; 0D-2/0D-3.)
- **Representative event.** For a confirmed order, the single event chosen (by name priority → earliest receipt time → id tiebreak, among money-valid events) to supply the order's one amount/currency and trend bucket. Its exact rule is fixed in the Phase 2 workflow. (Phase 2 workflow §2.2/§6.)
- **Envelope-required vs contract-required.** Envelope-required (name/customerId/sessionId) can cause a 400; contract-required fields never reject — their absence is measured and surfaced. (Contract §1/§7.)
- **Basis (confirmed vs session-approximate).** A discriminant traveling in the sales response so the UI cannot render an unlabeled approximation. (Phase 2 workflow §2.4/§10.)
- **MIRROR rule.** Server and web copies of a shared response type are edited together, each pointing at the other by comment, until a shared package is justified. (Standards §4.)
- **Debt register.** The evidence-backed list of known technical debt (standards §17); items leave only by being fixed, with the fixing branch noted.
- **Idempotency key.** A client-supplied per-event identifier (header or body), scoped per API key by a database unique constraint, that makes retried ingestion requests return the original event rather than create a duplicate. Transport-level identity, distinct from `order_id` (business-fact identity). (Ingestion §4.)
- **Alias.** A non-canonical event name accepted forever and normalized to its canonical form at read time (e.g. `product_view` → `product_viewed`). Aliases exist so hand-rolled integrations never break; their usage is observable so the product can nudge upgrades. (Contract §2.)
- **Guarded parsing.** Read-time numeric extraction that only casts a JSONB value to a number when it matches a strict pattern, so malformed money/quantity is *classified as unparseable and excluded with a flag*, never silently coerced to zero. (Standards §9; blueprint Principle 6.)
- **Previous period / comparison.** The preceding equal-length range for the current scope, computed from the same event history through the scope's comparison fragments, so every delta is honest and same-basis. (Engine §8.)
- **Trend granularity.** The bucket size (hour/day/month) a trend uses, chosen from the range and, for all-time, from the data's own span; buckets are generated over a series skeleton so empty buckets are real zeros. (Engine §8.)
- **Composer.** A per-tab orchestration function that runs the fetchers a tab needs (in one `Promise.all`) and assembles exactly that tab's response payload. The controller selects a composer by the required `tab` parameter. (Engine §8.)
- **Builder.** A pure, Express-free function that turns raw query rows into a domain metric, modeling unavailability as `null` and carrying the metric's basis/label. The Phase 9 unit-test target. (Backend §15.)
- **Rung.** A level on the progressive-capability ladder (0–9); each rung names the field(s) that unlock a tier of analytics, and Tracking Health reports which rungs a project has reached. (Contract §8.)
- **Envelope vs contract validation (Layers 1–3).** Layer 1 (envelope) is the only layer that can reject — it protects the system. Layer 2 (contract conformance) and Layer 3 (value sanity) observe and label, never reject. (Contract §7.)
- **Quarantine.** *Future (Phase 11).* Accept-and-flag handling for invalid *batch* items — store the item with a reason code rather than reject the whole batch. Does not exist today; single-event ingestion has no quarantine.
- **Rollup / Outbox.** *Future.* A rollup is a benchmark-gated pre-aggregated table that replaces a hot full-scan path (Phase 13). An outbox is the transactional table that moves side-effects (alerts, webhooks) off the ingestion hot path (Phase 10A). Named here so the terms are anchored; neither exists yet.

---

## 22. Reading Order

For a new engineer, the fastest path to productive context:

1. **This book (§§1–2, 20).** Vision, principles, and the decision records — the *why* frame everything else hangs on.
2. **Analytics blueprint** (`product-performance-analytics-design-cozy-book.md`). The product's spine: metric definitions, the 11 principles, the dashboard IA, and the Part 7 phase roadmap. Read Parts 1–4, 7–9 closely.
3. **Commerce Tracking Contract** (`commerce-tracking-contract.md`). The event taxonomy, property reference, money rules, validation layers, capability ladder, and health grading. The authoritative source for anything about what merchants send.
4. **Engineering Quality Standards** (`eventpulse-engineering-quality-standards.md`). How code is written/reviewed/shipped: typing, tenant-scoping, SQL safety, thin controllers, git/agent discipline, and the debt register.
5. **This book (§§3–15).** The layer-by-layer architecture, now that the product and contract vocabulary is in place.
6. **Platform roadmap** (`platform-roadmap-post-analytics.md`). Phases 9–17 and their recommended execution order — the future substrate.
7. **The phase workflows** (`analytics-query-performance-phase-0d5.md`, `phase-0m-and-phase-1-implementation-workflow.md`, `phase-2-gmv-orders-implementation-workflow.md`), read only when working on or adjacent to those phases. These are implementation-level and reference this book for architecture.

Rule of thumb: read the blueprint/contract/standards to understand *what and why*; read this book to understand *how the system is shaped*; read a workflow only when you are about to implement it.

---

## 23. Future Document Policy

To keep the document set non-overlapping, each document owns exactly one axis. New documents must fit this map or they don't get created.

| Document | Owns | Never contains |
|---|---|---|
| **Architecture Book** (this) | *Why* the system is shaped as it is; principles, layer responsibilities, decision records, glossary, reading order | Metric formulas, contract field tables, branch plans, phase specs (references them) |
| **Analytics Blueprint** | *What* analytics exist: metric definitions, dashboard IA, the 11 principles, the analytics phase roadmap (0A→8) | Engineering practice, contract wire-details, implementation steps |
| **Commerce Tracking Contract** | *What* merchants send: taxonomy, property reference, money rules, validation layers, capability ladder, health grading, error codes | Analytics UI, code architecture, phase branch plans |
| **Engineering Quality Standards** | *How* code is written/reviewed/shipped; typing, scoping, SQL, git/agent rules, debt register | Product semantics, metric definitions, phase specs |
| **Platform Roadmap** | *What* platform capabilities come after analytics (Phases 9–17) and their order | Analytics metric definitions, implementation-level steps |
| **Implementation Workflow** (per phase) | *How* to implement one phase: branch sequence, exact scope, Codex prompts, validation matrices | Architecture explanation (references this book), metric redefinition (references blueprint/contract) |
| **Benchmark / Performance Plan** | *How* performance is measured: datasets, matrix, metrics, EXPLAIN, budgets, findings | Optimizations (it produces the evidence bar; the fix is a later branch) |

**Non-duplication rules.** (1) An architecture *why* lives here and is *referenced*, never re-explained, by workflows. (2) A metric definition lives in the blueprint/contract and is referenced, never restated with different wording, anywhere else. (3) A phase's *how* lives in exactly one workflow document. (4) When two documents appear to conflict, the axis owner wins (metric → blueprint/contract; practice → standards; order → roadmap; architecture → this book) and the other document is corrected to reference it. (5) A new document is justified only if it owns an axis none of the above covers; otherwise it is a section in an existing owner.

---

*Prepared read-only against the permanent document set and the repository at the current session state. This book explains existing decisions and introduces no new architecture; where the sources were inconsistent, the authoritative owner was followed and the discrepancy is recorded in the accompanying report. No source files and no existing planning or specification documents were modified; this architecture book is the only artifact created.*
