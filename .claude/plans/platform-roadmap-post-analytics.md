# EventPulse — Platform Roadmap After Analytics (Phases 9–17)

**Companion to:** `product-performance-analytics-design-cozy-book.md` (the analytics blueprint, Phases 0A–8 — immutable, treated as complete here).
**Status:** Permanent engineering roadmap. Design only — no implementation in this document.

---

## Premise

Analytics Phases 0A–8 are done: honest analytics, tabs, consolidation, the shared metric foundation, the Commerce Tracking Contract, GMV/orders, shopper analytics, conversion depth, drilldowns, behavior, retention, and alerts & automation. EventPulse is a mature commerce analytics *product*.

It is not yet a production-quality event *platform*. The honest current state this roadmap starts from:

- **Zero automated tests.** The safety net is `typecheck` + `build` + manual curl — while the analytics module encodes the subtlest logic in the codebase (order identity, GMV dedup, attribution, null-denominator rules, timezone bucketing).
- **Synchronous ingestion.** Alert evaluation runs inline inside the ingest request; a failure or slow query there taxes the hot path.
- **Single-instance assumptions.** The rate limiter is an in-memory `Map` whose own code comment says it breaks under horizontal scaling.
- **Query-time analytics.** Every dashboard load recomputes raw-SQL aggregations over the full `Event` table. Fine at 10⁴ rows; not at 10⁷.
- **curl-only integration.** No SDK, no batch endpoint, one static docs page.
- **Half-delivered alerts.** Triggers are recorded; nothing is ever sent anywhere.
- **Single-user tenancy, no audit trail, console.log observability.**

This roadmap closes those gaps in dependency order. It deliberately excludes launch/commercialization work (billing, marketplaces, marketing, SSO, compliance, Kubernetes, cloud DevOps) — this is about engineering excellence and portfolio-quality software.

**Standing principles (inherited from the analytics blueprint and binding here):** honest behavior over impressive claims · progressive capability · correctness before optimization · **measure before optimizing** · incremental architecture behind stable interfaces · boring technology until a benchmark disagrees · small reviewable branches, one feature per branch, no commits without review · no premature microservices.

---

# Phase 9 — Testing & Correctness Foundation

## Purpose
Every later phase refactors the ingest hot path, the analytics read path, or both. Doing that with zero regression protection over logic this subtle (order dedup, attribution language, guarded money parsing) is how honest analytics quietly becomes dishonest. Tests come first, not later.

## Merchant Value
Indirect but foundational: "no fabricated data" stops being a promise and becomes an enforced invariant. Regressions in numbers merchants make decisions on are caught before they ship.

## Engineering Value
Establishes the test pyramid, deterministic fixtures, a real-database testing strategy, and CI — the substrate every subsequent phase's acceptance criteria stand on.

## Features
**Core MVP**
- Test runner + scripts wired into the monorepo (`bun test` — see Architecture Decisions).
- **Golden unit tests for the shared metric module** (`commerce-metrics`): event aliases, order-identity rules (distinct `order_id`, session fallback, never event counts), GMV dedup, conversion formulas and null-denominator behavior, guarded numeric parsing (`"1,299"`, `"$12"`, negatives), funnel builders' edge cases (zero first step, friction-only scope, missing top-of-funnel), comparison direction, health scoring.
- **Ingestion integration tests against a real Postgres test database**: auth matrix (401/403), validation matrix (400s incl. customerId/sessionId rules), idempotency replay + concurrent-race path, 429 rate limit, metadata persistence, archived-project block.
- **Analytics API contract tests**: a deterministic mini-fixture dataset (distinct from the demo seed) → assert the full response shape, key invariants (every documented top-level key present; no percentage without a denominator), and exact values for a frozen scenario.
- Test-data factories (`createUser/Project/ApiKey/events`) and per-test DB truncation.
- **CI pipeline** (GitHub Actions): typecheck + build + tests with a Postgres service container, gating every branch.

**Later Enhancements**
- Component tests for degraded/empty card states; Playwright smoke of the dashboard.
- Property-based tests for money parsing; coverage ratchets on `commerce-metrics` only.

## Dependencies
None. This is the base of the graph.

## Risks
- *Snapshot brittleness:* full-body snapshots break on every additive field. Mitigate: assert invariants + targeted fields; snapshot only the frozen-scenario values.
- *Flaky time math:* `NOW()`-relative queries drift. Mitigate: fixtures with pinned `createdAt` relative to an injected clock boundary; test ranges wide enough to be deterministic.
- *Overengineering trap:* chasing coverage %. Cover the money paths and the hot path; skip UI pixel tests.

## Architecture Decisions
- **Real Postgres over mocks.** The codebase is raw-SQL-heavy; mocking Prisma would test nothing real. Tradeoff: slower tests, mitigated by transaction/truncate isolation.
- **`bun test` over Vitest/Jest.** Bun is already the runtime and runs TS natively; zero added dependencies. Tradeoff: smaller ecosystem — acceptable; revisit for web-component testing only if needed.
- **Dedicated test database** created/migrated by a test bootstrap script; never the dev DB.

## Suggested Branch Strategy
`test/metrics-foundation` · `test/ingestion-integration` · `test/analytics-contract` · `chore/ci-pipeline`

## Commit Strategy
1. Test runner + test-DB bootstrap → 2. factories/fixtures → 3. metrics golden tests → 4. ingestion integration tests → 5. analytics contract tests → 6. CI workflow.

## Acceptance Criteria
- CI green is a merge requirement; a deliberately introduced order-double-count bug fails a test.
- Ingestion behavior matrix, metric module, and analytics contract all covered; suite runs < 2 minutes locally.

## Interview Value
Test pyramid design, golden/contract testing, testing raw-SQL systems against real databases, deterministic fixtures, CI gating.

---

# Phase 10A — Async Processing Pipeline

## Purpose
Ingestion currently does four jobs in one request: validate, persist, update key usage, evaluate alerts. Decoupling *accept* from *process* is the architectural centerpiece of the platform — it unblocks reliability (retries, DLQ), performance (rollups in Phase 13), and the outbound platform (Phase 14).

## Merchant Value
Ingestion stays fast and available no matter how heavy downstream processing gets; side-effects (alerts, later deliveries and rollups) can never be lost to a transient failure — they retry.

## Engineering Value
Transactional outbox, at-least-once delivery, idempotent consumers, `FOR UPDATE SKIP LOCKED` job claiming, dead-letter queues, graceful shutdown — the canonical async-systems toolkit, built justifiably small.

## Features
**Core MVP**
- **Postgres-backed job table (transactional outbox).** Ingest inserts the Event *and* an `event.ingested` job in one transaction — no dual-write window, no new infrastructure.
- **Worker runtime** as a separate process in the monorepo (`apps/server` worker entrypoint): batch-claims jobs via `FOR UPDATE SKIP LOCKED`, executes handlers, exponential backoff on failure, max-attempts → `dead_letter` status, stuck-job reclaim (visibility timeout), graceful shutdown on SIGTERM.
- **Alert evaluation moves off the hot path** into an idempotent worker handler (keyed by eventId; the existing cooldown makes re-delivery safe). The inline call in the ingest controller is deleted.
- Minimal queue interface (`enqueue / claim / complete / fail`) so the backing store can change later without touching handlers.

**Later Enhancements**
- Swap the poller for Redis/BullMQ **behind the same interface** if measured throughput demands it; delayed/scheduled jobs; per-project fairness; parallel worker pools.

## Dependencies
Phase 9 — refactoring the ingest path without integration tests is reckless.

## Risks
- *Framework-building temptation:* keep the queue interface to four functions; no plugins, no generic job framework.
- *Silent behavior change:* alerts now fire milliseconds later than ingest. Acceptable and honest — document it; the alert copy ("evaluated as events are ingested") remains true.
- *DB contention from polling:* bounded batch size, partial index on pending jobs, tuned poll interval.

## Architecture Decisions
- **Transactional outbox over direct queue writes** — atomicity with the event insert is the entire point. Tradeoff: DB doubles as queue; fine at this scale, and the interface preserves an exit.
- **Postgres queue over Redis/Kafka now** — "boring until a benchmark disagrees." Kafka is deferred (see final section).
- **At-least-once + idempotent consumers** — exactly-once is a myth; every handler documents its idempotency key.
- **Separate worker process over in-process timer** — crash isolation and honest architecture (two run targets: api, worker).

## Suggested Branch Strategy
`feature/job-outbox` · `feature/worker-runtime` · `refactor/alerts-async` · `feature/dead-letter-handling`

## Commit Strategy
1. Jobs table migration + queue module with unit tests → 2. worker runtime + shutdown handling → 3. alert handler + removal of inline evaluation (integration test proves triggers still fire) → 4. retry/backoff + DLQ → 5. runbook notes in repo docs.

## Acceptance Criteria
- `kill -9` on the worker mid-batch loses zero jobs; a poison job dead-letters after N attempts and is visible.
- Ingest latency does not regress; alert integration tests from Phase 9 pass unchanged against the async path.

## Interview Value
Outbox pattern, at-least-once semantics, idempotent consumers, SKIP LOCKED queues, backoff/DLQ design, graceful shutdown.

---

# Phase 10B — Platform Observability (baseline)

## Purpose
The moment work goes asynchronous, `console.log` stops being enough — a queue you can't see is an outage you can't explain. This phase ships the *operational minimum* alongside the pipeline; the polished layer waits for Phase 16.

## Merchant Value
Indirect: faster diagnosis, fewer silent failures, and the transparency that backs the platform's honesty claims.

## Engineering Value
Structured logging with correlation, a metrics surface, health endpoints — the difference between "it runs" and "it's operable."

## Features
**Core MVP**
- **Structured JSON logging** (pino): request-id middleware, child loggers, one log line per request (id, route, status, latency), and the correlation id propagated *into job payloads* so a request can be traced through its async consequences.
- Central error-handling middleware: one structured error event per failure, clean 500s, no stack leaks.
- **Health endpoints:** `/health/live` (process up) and `/health/ready` (DB reachable, queue not stalled).
- **Metrics module:** in-process counters/histograms exposed at `/metrics` in Prometheus text format (no Prometheus server required) — ingest accepted/rejected, request latency, queue depth, oldest-pending-job age, attempts, DLQ size.
- Slow-query logging via Prisma event hooks (threshold-based).

**Later Enhancements**
- OpenTelemetry tracing; error-group fingerprinting; the in-app ops dashboard (both live in Phase 16).

## Dependencies
Phase 10A (the worker is the thing most worth observing); logging/request-id pieces can land in parallel with late 10A branches.

## Risks
- *Vanity metrics:* every metric must answer an operational question ("is the queue keeping up?"). No dashboards of noise.
- *Scope creep into Phase 16:* baseline only — no tracing backends, no UI.

## Architecture Decisions
- **pino over winston** — JSON-native, minimal overhead. **Pull-based `/metrics` text over push** — zero infrastructure, standard format, scrapable later. **Correlation id as a first-class job field** — cheap now, priceless in Phase 14 delivery debugging.

## Suggested Branch Strategy
`feature/structured-logging` · `feature/health-endpoints` · `feature/runtime-metrics`

## Commit Strategy
1. Logger + request-id middleware → 2. error middleware → 3. health endpoints → 4. metrics module + queue instrumentation → 5. slow-query hook.

## Acceptance Criteria
- Every API request emits exactly one structured line with correlation id; the same id appears on the job it enqueued.
- `/metrics` exposes queue depth/lag; inducing a worker stall is visible within one poll interval.

## Interview Value
Structured logging, correlation ids across async hops, RED-style metrics, liveness vs readiness, pull-based metrics exposition.

---

# Phase 11 — Ingestion Hardening & Batch API

## Purpose
A platform ingests in batches, never silently loses data, and rate-limits durably. Today's intake is single-event, reject-and-forget, with a per-process limiter.

## Merchant Value
One request for N events (the prerequisite for any real SDK); invalid data is *quarantined and visible* instead of vanishing; limits survive restarts and are fair.

## Engineering Value
Batch semantics with partial success, a data dead-letter (quarantine) distinct from the job DLQ, durable rate limiting, and a replay mechanism that Phase 13 will reuse for backfill.

## Features
**Core MVP**
- Shared validator extraction (single + batch paths use one validation module — refactor first, behind Phase 9's tests).
- **`POST /api/events/batch`**: up to N events (start: 100), **per-item results** (stored / duplicate / quarantined, with reasons) — partial success, never all-or-nothing; per-item idempotency keys.
- **Quarantine table** for invalid items: raw payload + reason + TTL, surfaced through the existing Ingestion Health analytics (I2). Hard 400 remains only for malformed JSON/auth on the envelope.
- Optional client **`occurredAt` timestamp** with bounded clock-skew clamp (required by SDK offline buffering in Phase 12); server time remains authoritative beyond the skew window.
- **Durable rate limiting:** replace the in-memory Map with Postgres counter buckets behind the existing limiter interface; `Retry-After` on 429.
- Request gzip support + explicit batch body-size limits (413 with guidance).
- **Replay tool** (CLI script): re-enqueue quarantined or historical events through the pipeline.

**Later Enhancements**
- Redis token-bucket limiter *if measured contention demands it*; per-project limit overrides; larger batch tiers; backpressure signaling.

## Dependencies
10A (quarantine review and replay ride the pipeline), 10B (limiter/batch metrics), 9 (validator refactor safety).

## Risks
- *Partial-success ambiguity:* the per-item response contract is documented before code; SDK consumes it verbatim.
- *Quarantine as landfill:* TTL + per-project caps + visibility, or it becomes an unbounded liability.
- *Timestamp trust:* clamp skew (e.g. ±48h), label clamped events — never let client clocks corrupt trend buckets silently (honesty principle).

## Architecture Decisions
- **Quarantine (accept-and-flag) over hard rejection for batch items** — data loss is worse than dirty data you can see; pairs with Progressive Capability (bad tracking is a fixable state, not a failure).
- **Postgres rate limiting over Redis now** — measure first; the interface already exists from the in-memory version, so the swap is contained.
- **Per-item idempotency preserved in batches** — the existing `(apiKeyId, idempotencyKey)` constraint remains the source of truth.

## Suggested Branch Strategy
`refactor/shared-event-validation` · `feature/batch-ingest` · `feature/ingest-quarantine` · `feature/durable-rate-limit` · `feature/event-replay`

## Commit Strategy
1. Validator extraction (tests unchanged) → 2. batch endpoint + per-item contract + tests → 3. quarantine table/migration + wiring → 4. occurredAt + skew clamp → 5. durable limiter swap → 6. replay CLI.

## Acceptance Criteria
- A 100-event batch with mixed validity: valid stored, duplicates flagged, invalid quarantined with reasons; replaying the identical batch inserts nothing new.
- Rate-limit state survives a server restart; 429s carry `Retry-After`.

## Interview Value
Batch API design, partial-failure semantics, data quarantine vs job DLQ, rate-limiter algorithms and storage tradeoffs, clock-skew handling.

---

# Phase 12 — Official TypeScript SDK & Developer Experience

## Purpose
curl is the only integration path — the biggest credibility gap after analytics. The SDK is also how the Commerce Tracking Contract becomes the path of least resistance, directly powering Progressive Analytics Capability: easy rich tracking → automatically richer analytics.

## Merchant Value
Drop-in tracking with batching, retries, sessions, and offline buffering handled; **typed commerce helpers** (`productViewed`, `addToCart`, `purchaseCompleted({ order_id, items })`) that make contract-complete events the default, not an aspiration.

## Engineering Value
Real client-library engineering: dual browser/Node builds, size budgets, lifecycle semantics, resilient delivery — a different discipline from server code, and it shows.

## Features
**Core MVP**
- `packages/sdk` in the monorepo — `@eventpulse/sdk`, zero runtime dependencies, ESM + CJS builds, browser + Node targets.
- Core API: `init({ apiKey, endpoint })`, `track(name, properties)`, `identify(customerId)`, automatic **sessionId lifecycle** (generate, persist, rotate after 30 min inactivity), typed contract helpers for every Commerce Tracking Contract event.
- **Delivery engine:** in-memory batch queue → `/api/events/batch`; flush on interval/size/`beforeunload` (sendBeacon/`fetch keepalive`); retry with exponential backoff honoring `Retry-After`; automatic per-event idempotency keys; offline buffer (localStorage, capped) replayed with `occurredAt`.
- Debug mode (log, don't send); SDK unit test suite (mocked fetch, fake timers); bundle **size budget < 6KB gzipped** enforced in CI; semver from day one.

**Later Enhancements**
- React provider/hooks wrapper; sandbox/test-mode API keys with data segregation (small server addition — deliberately not MVP); additional languages (deliberately deferred, see final section).

## Dependencies
Phase 11 (batch endpoint, per-item contract, `occurredAt`, `Retry-After`).

## Risks
- *Scope creep:* no plugin system, no auto-capture DOM magic — explicit tracking only (fits the honest-data identity).
- *Contract drift between SDK types and server conventions:* single source — export the contract definitions from one shared package consumed by both SDK and docs.
- *Session semantics disputes:* document rotation rules precisely; they define what "session conversion" means downstream.

## Architecture Decisions
- **Monorepo package over separate repo** — shared contract types, atomic changes. Tradeoff: publishing ergonomics later; acceptable pre-launch.
- **Explicit events over auto-capture** — auto-capture generates plausible garbage; EventPulse's analytics are only as honest as its input.
- **sendBeacon on unload, fetch otherwise** — reliability at page exit without holding requests open.

## Suggested Branch Strategy
`feature/sdk-core` · `feature/sdk-commerce-helpers` · `feature/sdk-delivery-engine` · `feature/sdk-session-lifecycle`

## Commit Strategy
1. Package scaffold + builds + size-budget CI → 2. core track/identify + tests → 3. session lifecycle + persistence → 4. delivery engine (batch/retry/offline) → 5. contract helpers generated from shared definitions → 6. README + recipes.

## Acceptance Criteria
- A demo storefront page instrumented only with the SDK produces contract-complete events that light up every analytics tab.
- Network killed → events buffer; restored → flush with correct `occurredAt`; duplicates impossible (idempotency verified server-side).
- Bundle ≤ budget; SDK tests green in CI.

## Interview Value
SDK/API design, client-side batching and backoff, offline-first buffering, session semantics, dual-format packaging, bundle-size engineering, semver.

---

# Phase 12.5 — Developer Documentation & Playground

## Purpose
A platform that must be explained in person isn't finished. Docs, a live event inspector, and an integration playground turn the SDK + contract into a self-serve experience — and give Progressive Capability its user interface.

## Merchant Value
Integrate in minutes without help; *see* events arrive live with contract-validation feedback; always know the next tracking field to add and what it unlocks.

## Engineering Value
Docs-as-code (rendered from the shared contract definitions, so they cannot drift), an SSE streaming endpoint, and onboarding UX design.

## Features
**Core MVP**
- **Docs revamp** (in-app): Quickstart (SDK-first, curl secondary), API reference (single + batch, per-item results, errors, rate limits, idempotency), and a **Tracking Contract "unlock ladder" page** — each contract field mapped to the analytics it unlocks (rendered from the shared contract module, per Principle 11's framing).
- **Live Event Inspector:** SSE stream of a project's latest events with per-event contract badges (which recommended fields are present/missing) — the integration feedback loop.
- **Tracking Playground:** send sample contract events with your own key from the dashboard (clearly labeled `source: playground`), with copy-paste SDK snippets per event type.
- **Per-project unlock-ladder status page:** reuses I3 data-quality output — "product_id ✓ → Product Performance unlocked; add items[] → Units Sold."

**Later Enhancements**
- Generated OpenAPI spec + reference; public versioned docs site (pre-launch it stays in-app).

## Dependencies
Phase 12 (SDK to document), Phase 11 (batch/inspector source), analytics I3 (ladder data).

## Risks
- *Docs drift:* the only defense is generation from the shared contract source — hand-written tables are forbidden for contract content.
- *Playground pollution:* labeled events, filterable in analytics; never fabricate — playground events are real events, honestly marked.

## Architecture Decisions
- **SSE over WebSocket** for the inspector — one-way stream, auto-reconnect, plain HTTP; WebSocket buys nothing here.
- **Docs rendered from code** — contract definitions are the single source for SDK types, server conventions, and docs tables.

## Suggested Branch Strategy
`feature/live-event-inspector` · `feature/tracking-playground` · `feature/docs-revamp` · `feature/unlock-ladder-page`

## Commit Strategy
1. SSE endpoint + inspector UI → 2. contract badges → 3. docs restructure + generated contract tables → 4. playground → 5. unlock-ladder page.

## Acceptance Criteria
- A developer new to the repo integrates the demo store from docs alone in under 15 minutes.
- Inspector shows an ingested event within ~2 seconds with correct badges; ladder page reflects real project state.

## Interview Value
SSE streaming, docs-as-code, developer onboarding design, feedback-loop UX.

---

# Phase 13 — Rollups, Retention & Query Performance

## Purpose
Analytics recomputes raw-table aggregations per request. This phase makes dashboards fast at millions of events — but only where a benchmark proves the need. It begins by *measuring*, honoring "measure before optimizing."

## Merchant Value
Dashboards stay sub-second as data grows; history is retained affordably and remains queryable.

## Engineering Value
Real data engineering: benchmark methodology, incremental pre-aggregation with self-healing reconciliation, a read-path router, and equivalence proofs that the fast path and the honest path agree.

## Features
**Core MVP**
- **Benchmark harness first:** synthetic generator to 5–10M events; scripted p50/p95 capture per analytics tab; results committed. Every rollup below must cite the benchmark that justifies it.
- **Daily rollup tables** (maintained by an `event.ingested` worker handler): project × day × event-name counts; session-day and product-day rollups matching the heaviest tab queries.
- **Nightly reconciliation job:** recomputes recent windows from raw events and repairs drift — the self-healing guarantee.
- **Query router:** closed days from rollups, today/uncovered ranges from raw; **Phase 9's analytics contract tests rerun against the router to prove number-for-number equivalence.**
- Index audit (EXPLAIN-driven) + keyset pagination for the events list.

**Later Enhancements**
- Monthly table partitioning; retention policies with archive-then-drop (JSONL export of expiring partitions); session-level aggregate table; backfill of new rollups via Phase 11's replay.

## Dependencies
10A (workers maintain rollups), 9 (equivalence tests), 11 (replay = backfill), 10B (query timing metrics feed the benchmark).

## Risks
- *Premature aggregation:* a rollup for a query nobody finds slow is pure liability. The benchmark gates every table.
- *Dual-source drift* (the classic lambda problem): one write path (worker) + one healer (reconciliation) + equivalence tests — never a third path.
- *Boundary bugs:* day/timezone edges follow the blueprint's established session-timezone convention exactly.

## Architecture Decisions
- **Incremental counters + periodic reconciliation (hybrid)** over pure incremental (drifts) or pure recompute (defeats the purpose).
- **Plain tables over materialized views** — incremental updates and partial coverage need row-level control.
- **Postgres over a columnar/warehouse engine** — deferred until Postgres measurably fails (see final section).

## Suggested Branch Strategy
`feature/perf-benchmark-harness` · `feature/daily-rollups` · `feature/analytics-query-router` · `feature/rollup-reconciliation` · `feature/event-retention` (later)

## Commit Strategy
1. Harness + baseline numbers committed → 2. rollup schema + worker handler → 3. backfill via replay → 4. router behind a flag + equivalence suite → 5. reconciliation job → 6. flag removed, after/before numbers documented.

## Acceptance Criteria
- Documented before/after: p95 of the slowest tab under a set target (e.g. < 300ms at 10M events).
- Equivalence suite green: router answers == raw answers on the frozen fixture.
- Intentionally corrupting a rollup counter is healed by the next reconciliation run.

## Interview Value
Pre-aggregation and incremental view maintenance, read/write path separation, reconciliation/self-healing, benchmark methodology, partitioning and retention, keyset pagination.

---

# Phase 14 — Notifications, Webhooks & Outbound Platform

## Purpose
Alerts currently record `AlertTrigger` rows and deliver **nothing** — a half-finished merchant promise. Once 10A exists, reliable delivery is cheap; this phase finishes alerts and opens EventPulse's first outbound integration surface.

## Merchant Value
Alerts reach the merchant (email, signed webhooks) instead of waiting to be noticed; triggers can drive the merchant's own systems.

## Engineering Value
The delivery half of distributed systems: HMAC signing, SSRF defense, retry/disable policies, delivery observability — textbook material implemented for real.

## Features
**Core MVP**
- **Delivery jobs on the pipeline:** alert trigger → one `notification.deliver` job per configured channel; at-least-once with idempotent delivery ids.
- **Webhook channel:** per-project endpoints; HMAC-SHA256 signature + timestamp header (Stripe-style, verification snippet in docs); retries with backoff → DLQ; auto-disable after N consecutive failures with visible channel health; **SSRF defenses** (deny private/link-local ranges, no redirects, strict timeouts, response-size caps).
- **Email channel:** local SMTP catcher (Mailpit) pre-launch — no external provider; templated alert emails; weekly digest (K2) delivery reuses this channel.
- **Delivery log UI:** attempts, status codes, latency, next retry; per-channel test-fire button.

**Later Enhancements**
- Slack channel; outbound event-stream webhooks (forwarding raw events — heavier, needs volume controls); secret rotation; per-channel filter rules.

## Dependencies
10A (reliable jobs), 10B (delivery metrics + correlation ids), analytics Phase 8 (alerts exist).

## Risks
- *SSRF is the headline risk* — merchant-supplied URLs fetched from your server. The deny-list/timeout/no-redirect suite is non-negotiable and tested.
- *Building a Zapier:* two channels, period. An integration catalog is a different product.
- *Email deliverability rabbit hole:* local catcher only until launch work begins — explicitly out of scope here.

## Architecture Decisions
- **HMAC + timestamp over asymmetric signatures** — simple to verify, industry-standard, replay-resistant with timestamp tolerance.
- **At-least-once + delivery-id idempotency** — receivers are told to dedupe; documented contract.
- **Auto-disable with visible health over infinite retries** — honest failure beats silent queue bloat.

## Suggested Branch Strategy
`feature/notification-channels` · `feature/webhook-delivery` · `feature/webhook-signing` · `feature/email-channel` · `feature/delivery-log-ui`

## Commit Strategy
1. Channel config model + UI stub → 2. delivery job handler + retry policy → 3. webhook sender + signing + SSRF suite (with tests) → 4. email channel + templates → 5. delivery log UI + test-fire → 6. docs (verification guide).

## Acceptance Criteria
- Alert fires → webhook arrives with a signature that verifies using the documented snippet; receiver-down scenario retries then DLQs, UI shows the trail, channel auto-disables.
- SSRF test suite (private IPs, redirects, slow-loris endpoint) all blocked.
- Digest email renders in the local catcher.

## Interview Value
Webhook signing/verification, SSRF defense, at-least-once delivery with idempotent receivers, retry/disable policies, delivery observability.

---

# Phase 15 — Collaboration & Governance

## Purpose
One `User` owns everything and nothing is audited. Real merchant analytics is a team activity; real platforms can answer "who changed this?"

## Merchant Value
Invite the team safely: analysts read, operators edit, admins manage keys — and every sensitive change has an accountable trail.

## Engineering Value
Multi-tenancy remodeling, deny-by-default RBAC, append-only auditing, and a non-trivial live data migration — done without breaking a working product.

## Features
**Core MVP**
- **Audit log first** (deliberately ordered before teams — it's cheap, high-value, and useful even solo): append-only table + UI page covering auth events, key create/revoke, project archive/restore, alert CRUD, settings changes — actor, action, target, timestamp, correlation id.
- **Workspace model:** Workspace → members (role) → projects; migration auto-creates a workspace per existing user (zero behavior change for solo users).
- **Fixed roles** — viewer (read analytics/events), editor (+ alerts, projects), admin (+ keys, members). Deny-by-default authorization middleware; no custom roles.
- **Invitations:** email-token flow (reuses Phase 14's email channel).

**Later Enhancements**
- Per-project role scoping; ownership transfer; scoped dashboard API tokens (distinct from ingest keys). *(Enterprise SSO/SCIM: excluded by scope.)*

## Dependencies
9 (auth-touching refactors need the test matrix), 14 (invite email). **The audit-log slice depends only on Phase 9 and may be pulled forward beside 10A — recommended.**

## Risks
- *RBAC sprawl:* three fixed roles; custom roles are a trap at this stage.
- *Migration risk:* the workspace backfill runs against real dev data; rehearse on a copy, ship with a rollback plan.
- *Authorization bugs:* centralize checks in one middleware; role × endpoint integration matrix in tests.

## Architecture Decisions
- **Workspace-level roles over project-level** now — one dimension of complexity at a time; the model leaves room for project scoping later.
- **Append-only audit** (no UPDATE/DELETE, enforced) — the log's value *is* its immutability.
- **Deny-by-default** — unlisted route/role combinations fail closed.

## Suggested Branch Strategy
`feature/audit-log` · `feature/workspace-model` · `feature/rbac-middleware` · `feature/team-invitations`

## Commit Strategy
1. Audit table + write helper + coverage of sensitive mutations → 2. audit UI → 3. workspace schema + backfill migration (rehearsed) → 4. RBAC middleware + role matrix tests → 5. invitations flow.

## Acceptance Criteria
- Every sensitive mutation writes exactly one audit row (asserted in tests); viewer receives 403 on key revocation; solo users notice nothing post-migration.
- Role × endpoint matrix fully green.

## Interview Value
Multi-tenant data modeling, RBAC with deny-by-default, append-only audit design, live data migration strategy.

---

# Phase 16 — Advanced Self-Observability

## Purpose
10B made the platform loggable; this makes it *operable* — and closes the loop with the most satisfying move available: EventPulse monitoring itself with EventPulse.

## Merchant Value
Indirect: a platform that detects its own degradation before merchants do, and the transparency to show it.

## Engineering Value
SLI thinking, synthetic monitoring, error fingerprinting, and true dogfooding that exercises the public pipeline end-to-end.

## Features
**Core MVP**
- **Internal ops dashboard** (admin-gated page): ingest rate, error rate, queue depth/lag, DLQ size, delivery success rate, slow queries — reading 10B metrics and job tables.
- **Error tracking:** structured errors grouped by fingerprint (route + error class + normalized message) with first/last seen and counts, in a UI.
- **Dogfooding:** the platform emits its own operational events (`job.failed`, `webhook.auto_disabled`, `quarantine.spike`) into an internal "EventPulse Ops" project **through the public ingest API** — its own analytics and alerting then apply to itself.
- **Pipeline canary:** a synthetic event every N minutes with an end-to-end assertion (ingested → processed → visible); a stall raises an ops alert via Phase 14 channels.

**Later Enhancements**
- OpenTelemetry tracing request → job → delivery; per-tenant usage rollups (events/storage per project — groundwork that would serve billing later *without building billing*).

## Dependencies
10B (metrics), 10A (things to observe), 14 (ops alerts delivery), 15 (admin gating).

## Risks
- *Becoming Datadog:* the analytics blueprint's never-build list bans merchant-facing APM. This is **internal-only** and stays that way.
- *Cardinality explosions:* no per-event-name metrics labels; aggregate dimensions only.

## Architecture Decisions
- **Dogfood via the public API, not direct inserts** — anything else is theater; the canary must traverse the same path merchants use.
- **Fingerprinted error groups over raw logs** — signal over volume.

## Suggested Branch Strategy
`feature/ops-dashboard` · `feature/error-tracking` · `feature/self-ingestion` · `feature/pipeline-canary`

## Commit Strategy
1. Error fingerprint table + capture hook → 2. ops dashboard page → 3. self-ingestion emitter + internal project bootstrap → 4. canary + stall alert.

## Acceptance Criteria
- An induced worker stall triggers a canary alert through a real Phase 14 channel within one canary interval.
- One grouped entry per unique induced failure; ops page reflects queue lag live.

## Interview Value
SLIs and canaries/synthetic monitoring, error fingerprinting, dogfooding architecture, observability without external vendors.

---

# Phase 17 — Schema Registry & Advanced Data Quality

## Purpose
The Commerce Tracking Contract is convention-only. Mature event platforms *know* the shape of their data, notice when it drifts, and can optionally govern it. This is the capstone: Segment-Protocols-class capability, EventPulse-sized.

## Merchant Value
A live, auto-discovered schema of everything the store sends; drift alerts before dashboards quietly rot ("`price` became a string on Tuesday"); optional enforcement when a team wants guarantees.

## Engineering Value
Schema inference over semi-structured data, evolution tracking, and governance modes — advanced data-platform design grounded in the existing pipeline.

## Features
**Core MVP**
- **Schema inference in the pipeline:** an `event.ingested` handler incrementally maintains per-project registries — event name → observed property keys, coarse types (string/number/boolean/object/array/null), presence %, first/last seen (top-K keys capped per event name); nightly reconciliation, same hybrid as rollups.
- **Schema browser UI** (per project): event names, their properties, types, presence, sample values.
- **Drift detection rules feeding Automated Commerce Insights + alerts:** unknown event name appears; historically-present property (≥X%) disappears; type flips; contract-relevant field regresses.
- **Contract conformance score** per project — extends the Phase 12.5 unlock ladder into a single trackable number.

**Later Enhancements**
- Enforcement modes per project — **observe (default) → warn → block-to-quarantine** (reusing Phase 11's quarantine); user-defined expected schemas beyond the commerce contract; schema-to-TypeScript export feeding SDK typegen.

## Dependencies
10A (inference handler), 11 (quarantine for block mode), 12.5 (ladder surface), analytics I3 (quality rules to extend), 13's hybrid maintenance pattern as the template.

## Risks
- *Type inference over JSON is inherently fuzzy:* coarse types only; never claim precision the data can't support (honesty principle applies to metadata too).
- *Registry cardinality:* top-K keys, caps, and TTL on never-seen-again names.
- *Governance foot-gun:* **default is observe-only forever** — blocking ingestion by default would violate Progressive Capability; block mode is an explicit, per-project, admin-gated opt-in.

## Architecture Decisions
- **Incremental inference + nightly reconcile** — proven pattern from Phase 13, reused rather than reinvented.
- **Row-modeled registry over JSONB blobs** — queryable by the drift rules and the UI.
- **Three-mode governance ladder** (observe/warn/block) — mirrors the progressive philosophy: capability unlocks, never gates.

## Suggested Branch Strategy
`feature/schema-inference` · `feature/schema-browser` · `feature/schema-drift-rules` · `feature/contract-conformance`

## Commit Strategy
1. Registry schema + inference handler + reconcile → 2. browser UI → 3. drift rules + insight/alert wiring → 4. conformance score + ladder integration → 5. (later) enforcement modes.

## Acceptance Criteria
- Renaming a property in the demo store surfaces a drift insight within one reconciliation cycle; the browser reflects true observed schema.
- Conformance score moves when contract fields are added/removed; block mode (when built) quarantines rather than drops, behind explicit opt-in.

## Interview Value
Schema inference and evolution, data contracts, drift detection, governance mode design, applying one incremental-maintenance pattern across features.

---

# Overall Dependency Graph

```
Phase 9  Testing Foundation
   │
   ├────────────────────────────────────────────┐
   ▼                                            │
Phase 10A  Async Pipeline ── Phase 10B  Observability (baseline)
   │              │                   │
   │              ▼                   │
   │        Phase 11  Ingestion Hardening & Batch
   │              │                   │
   │              ▼                   │
   │        Phase 12  TypeScript SDK  │
   │              │                   │
   │              ▼                   │
   │        Phase 12.5  Docs & Playground
   │                                  │
   ├── Phase 14  Webhooks & Notifications ◄─ (10A + 10B)
   │        │
   │        ▼
   ├── Phase 15  Collaboration & Governance  (audit-log slice needs only 9)
   │
   ├── Phase 13  Rollups & Performance  (10A workers + 9 equivalence + 11 replay)
   │
   ├── Phase 16  Advanced Self-Observability  (10B + 14 + 15-admin)
   │
   └── Phase 17  Schema Registry  (10A + 11 + 12.5 + 13's pattern)
```

# Recommended Implementation Order

**9 → 10A → 10B → 11 → 12 → 12.5 → 14 → 13 → 15 → 16 → 17**, with the **audit-log slice of 15 pulled forward** to run beside 10A/10B (it needs only Phase 9 and pays for itself immediately).

Why this order, and where it deliberately deviates from phase numbering:
- **9 first, non-negotiable** — every later phase refactors load-bearing paths.
- **10A/10B as one arc** — a pipeline without eyes is an outage generator; they ship together.
- **11 → 12 → 12.5 as the DX arc** — each is the direct prerequisite of the next (batch → SDK → docs of both), and together they produce the most visible product leap.
- **14 before 13 (deviation):** webhook/email delivery *completes an existing half-built merchant feature* at low cost once the pipeline exists. Rollups are a larger investment whose need is data-volume-gated — and Phase 13's benchmark harness can be run early and cheaply at any time to detect when that gate opens. Optimizing queries nobody has measured as slow, before finishing a feature merchants can see, would invert "correctness before optimization."
- **15 → 16 → 17 as the maturity arc** — teams, then operating the platform like a team would, then governing data like a platform should. 17 is last because it composes patterns proven in 10A, 11, 12.5, and 13.

# Things Deliberately Deferred

| Deferred | Why | Revisit trigger |
|---|---|---|
| **Kafka / external message brokers** | The Postgres outbox meets current scale with zero new infrastructure; the queue interface preserves the exit. | Sustained throughput or consumer-fanout the outbox measurably can't serve. |
| **Kubernetes / cloud deployment / production DevOps** | Excluded by scope; nothing here depends on it. | Launch decision. |
| **Microservices split** | One deployable API + one worker is honest for this team size; a service split now would be résumé-driven architecture. | Independent scaling or team-boundary needs that a modular monolith can't express. |
| **Data warehouse / columnar store (ClickHouse etc.)** | Phase 13's rollups + partitioning extend Postgres a long way; two databases is a big complexity step. | Benchmarks failing *after* rollups/partitioning are in place. |
| **Multi-language SDKs** | TS covers browser + Node, the realistic integration surface pre-launch; each language is a permanent maintenance tail. | Real external demand. |
| **AI/ML features (anomaly ML, forecasting, LLM chat)** | Consistent with the analytics blueprint: rule-based honesty is the brand; ML adds cost and trust risk without strengthening fundamentals. | Mature-product bet, post-launch at earliest. |
| **Exactly-once delivery semantics** | Not achievable in general; at-least-once + idempotent consumers is the honest, standard contract. | Never — the pattern is the answer. |
| **Enterprise IAM (SSO/SCIM), compliance programs** | Excluded by scope (launch/enterprise work). | Commercialization. |
| **Integration marketplace / plugin system** | Two delivery channels + signed webhooks are the extensibility primitives; a catalog is a different product. | Post-launch ecosystem demand. |
| **GraphQL / public query API** | The dashboard API + CSV exports (L2) cover current consumers; a public API is a compatibility commitment to defer. | External consumers exist. |

# Guiding Principles (beyond Phase 17)

1. **Tests are the contract.** Behavior worth having is behavior a test asserts — the analytics honesty rules live in the suite, not in memory.
2. **Measure, then optimize.** No performance work without a committed benchmark showing the problem and, afterward, the improvement.
3. **Interfaces before infrastructure.** Swap Postgres-queue→Redis, or Postgres→columnar, behind interfaces that already exist; never let infrastructure choices leak into handlers.
4. **One write path, one healer.** Wherever derived data exists (rollups, registries), exactly one incremental writer plus one reconciliation loop — never a second ad-hoc path.
5. **At-least-once + idempotent everything.** Every consumer, every delivery, every replay documents its idempotency key.
6. **Honesty extends to the platform itself:** quarantine over silent drops, visible failure over infinite retries, observe-only governance by default, coarse claims when data is coarse.
7. **Progressive capability applies to platform features too:** minimal integration works immediately; richer integration unlocks more; nothing breaks by default.
8. **Boring technology, small branches, one feature per branch, nothing merges without review** — the process that built the analytics module is the process that builds the platform.
9. **Dogfood relentlessly.** EventPulse monitors EventPulse; the demo store exercises the SDK; the canary rides the public API.
10. **Build only what strengthens the core.** Any proposed feature must strengthen correctness, reliability, developer experience, or operability — features that merely photograph well are declined.
