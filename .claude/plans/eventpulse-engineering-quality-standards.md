# EventPulse Engineering Quality Standards

**Status:** Permanent, authoritative engineering-contribution standard for all contributors — human and AI (Claude, ChatGPT, Codex).
**Audit basis:** repository state at commit `95c3c4e` (branch `refactor/analytics-kpi-summaries`), sampled 2026-07. Every finding below was verified against actual code; none is assumed.

---

## 1. Purpose

This document governs **how code is written, reviewed, and shipped** in EventPulse. It complements — and never duplicates — the three permanent product documents:

| Document | Owns |
|---|---|
| Analytics blueprint (`product-performance-analytics-design-cozy-book.md`) | *What* analytics exist, metric definitions, dashboard IA, phase order |
| Platform roadmap (`platform-roadmap-post-analytics.md`) | *What* platform capabilities come after analytics (Phases 9–17) |
| Commerce Tracking Contract (`commerce-tracking-contract.md`) | *What* merchants send: taxonomy, properties, validation philosophy |

This document owns the fourth axis: **code quality, architecture discipline, and contribution rules**. Where those documents define a metric or phase, this one defines how the code implementing it must be built. On conflict, product-semantics questions defer to the three documents; engineering-practice questions defer to this one.

---

## 2. Current Codebase Assessment

~16,400 lines of TypeScript across `apps/server` (Express + Prisma + raw SQL) and `apps/web` (Next.js + Tailwind), Turborepo + Bun. Maturity: **strong product logic and discipline, pre-production engineering substrate** — exactly what the platform roadmap's Phase 9–10B premise says.

### Strengths (verified)
- **Strict TypeScript everywhere** (`"strict": true` in both apps); `any` is effectively absent from reviewed code; raw-SQL results are typed via row interfaces.
- **Injection-safe SQL throughout**: every sampled query uses `Prisma.sql`/`Prisma.join` parameter binding; no string concatenation found.
- **Tenant scoping is consistently present**: every analytics/event query samples `WHERE "userId" = ${userId}` plus project fragments.
- **Honest-analytics discipline is real in code**: null-guarded denominators, labeled fallbacks, honest empty states match the blueprint's principles.
- **Ingestion hardening exists**: idempotency via DB unique constraint with race handling, rate limiting, revoked/archived checks, metadata capture, secret hashing (keys shown once, stored hashed).
- **Secrets hygiene**: only `.env.example` files tracked; `JWT_SECRET` fails fast at boot (`utils/jwt.ts` throws).
- **Consistent visual system**: `GlowCard`/`Icon` shared primitives, coherent dark design language, accessibility patterns improving in recent work (aria-hidden decorative icons, text-plus-color status).

### Critical (act soon; some already scheduled)
1. **Zero automated tests, zero CI.** No `*.test.*` files, no `.github/workflows`. The codebase's most subtle logic (order identity, GMV dedup, attribution, funnels) is protected only by `tsc` and manual curl. *Scheduled as Platform Phase 9 — the schedule is correct; nothing risky should preempt it.*
2. **`analytics.controller.ts` is a 1,747-line monolith**: 18 raw-SQL sites, 32 type/interface declarations, alias tables, five metric builders, and HTTP handling in one file. Every analytics phase touches it; merge-conflict and regression surface grows each time. *Extraction of a shared metrics module is already planned (blueprint Part 5 / Phase 0D).*
3. **No centralized error handling, no request IDs, unstructured logging.** `server.ts` registers routes and a `console.log` request line only; 26 `console.*` call sites; every controller carries its own try/catch → 500. *Scheduled as Platform Phase 10B.*

### Important (name-and-contain now, fix in phases)
4. **Duplicate type definitions across the API boundary**: `CommerceFunnel`, `SessionFunnel`, `AnalyticsHealth`, `AnalyticsInsight` are declared independently in `apps/server/src/controllers/analytics.controller.ts` and `apps/web/.../analytics-types.ts`; `ShopperSummary`/`PeriodComparison` exist only on the web side while the server returns the shape inline. Nothing detects drift.
5. **Commerce alias tables duplicated inside the analytics controller** (`"product_viewed"` appears in 5 separate constants/lists). The Tracking Contract names a single alias source as the goal.
6. **Frontend data-plumbing duplication**: `API_BASE`/`authHeaders()` re-declared in ~11 files; 15 dashboard components hand-roll `useEffect`+`fetch`+state-machine logic; localStorage token access scattered.
7. **14 pre-existing ESLint errors + 1 warning** (`react/no-unescaped-entities`, `react-hooks/set-state-in-effect` in settings/overview components) — lint cannot gate anything while red.
8. **In-memory rate limiter** (single-instance only, self-documented in `utils/rateLimit.ts`) and **synchronous alert evaluation inside the ingest request** (`event.controller.ts:388`). *Both scheduled: Phases 11 and 10A.*

### Good practice / future improvement
9. Dead demo scaffolding remains (`events-data.ts`, `dashboard-data.ts` + ~9 unrendered demo components in `dashboard/events` and `dashboard/overview`).
10. `config/env.ts` collects env vars without validation (JWT is the only fail-fast); a missing `DATABASE_URL` surfaces later as a Prisma error rather than a boot error.
11. Several 400–580-line frontend components mix orchestration + presentation (`ProjectView`, `ApiKeysOverview`) — workable, but at the review-trigger threshold defined in §7.

---

## 3. Core Engineering Principles

Permanent, binding on all contributions:

1. **Correctness before cleverness; measure before optimizing.** No performance work without a number showing the problem.
2. **Honest analytics extends to code**: never fabricate a metric, a fallback, a test result, or a verification claim.
3. **Small, reviewable changes.** One feature = one branch = one reviewable diff. If a diff needs a tour guide, split it.
4. **No unrelated changes in feature branches.** Drive-by fixes go to their own branch or the debt register — never smuggled.
5. **Explicit tenant and project scoping in every data access.** Scoping is written per-query, visibly, and reviewed (see §9).
6. **No premature abstractions**: the second duplication is a signal, the third is a refactor. Frameworks require three real consumers.
7. **Thin controllers, domain-owned logic** (target architecture — adopted incrementally, §5).
8. **Unavailable metrics are `null`/absent with an explanation — never fake zero**, never a silently-wrong number.
9. **No silent data loss**: reject loudly (envelope) or store-and-flag (contract); never drop quietly.
10. **Deterministic behavior**: same inputs → same outputs; explicit `ORDER BY`; injected time where feasible.
11. **Backward-compatible contracts**: the API and the Tracking Contract are append-only; breaking changes require a documented deprecation path.
12. **Clear failure modes**: every operation defines what happens when it fails, and that path is as intentional as the success path.

---

## 4. TypeScript Standards

- **`strict` stays on in both apps; never weakened** per-file or per-flag.
- **`any` is banned.** Use `unknown` at trust boundaries (request bodies, JSON columns, fetch results) and narrow explicitly.

```ts
// BAD
const { name } = req.body as any;
// GOOD (existing ingestion pattern — keep it)
const { name } = req.body as { name: unknown };
if (typeof name !== "string") return badRequest("Event name is required…");
```

- **Type assertions (`as T`) only at boundaries** (raw SQL row types, parsed JSON), immediately followed by use — never to silence a checker error mid-logic.
- **Nullable values are modeled, not defaulted**: a metric that may be unavailable is `number | null`, not `number` with 0. (Matches existing funnel percentage types — preserve this.)
- **Discriminated unions for UI state** — the existing `FetchState = {status:"loading"} | {status:"error";…} | {status:"success";…}` pattern is the standard; don't replace it with boolean pairs.
- **String-literal unions over `enum`** (existing codebase convention: `HealthStatus`, `InsightSeverity`). Prisma enums are the one exception (schema-owned).
- **Database numerics**: every `COUNT`/`SUM` from raw SQL arrives as `bigint` (or numeric string) — convert with `Number(...)` exactly once, at the mapping layer, never deep in logic. Money aggregation happens in SQL `numeric`; JS floats only carry final, rounded values.
- **Shared API types**: until a shared package exists (see §19), the server-side response type and `apps/web/.../analytics-types.ts` **must be edited in the same commit**, and the commit message must say so. New duplicated shapes require a `// MIRROR:` comment naming the counterpart file on both sides.
- **Exported interfaces get doc comments when their semantics aren't obvious from the name** (follow `AlertTrigger`-model-style comments already in the schema).
- **Naming**: types `PascalCase`; values/functions `camelCase`; SQL/JSON contract fields `snake_case` (contract-governed); React components `PascalCase.tsx`; multi-word non-component modules `kebab-case.ts` or established `camelCase.ts` (don't churn existing names).

---

## 5. Backend Architecture Standards

**Target dependency direction** (adopt incrementally — no big-bang rewrite):

```
route → middleware (auth / validation) → controller (HTTP only)
      → domain module (metric builders, business rules)
      → query module (raw SQL / Prisma)
      → database
```

**Must follow now:**
- **Controllers do HTTP**: parse/validate input, call logic, shape the response. New *pure* logic (metric builders, validators, scoring) must be an exported function testable without Express — the existing `buildCommerceFunnel`/`buildSessionFunnel`/`validateShopperId` style is the pattern; keep new ones in modules, not inline.
- **No new logic lands in `analytics.controller.ts` if it can live in a module.** The file is at 1,747 lines; it only shrinks from here. Phase 0D's `commerce-metrics` extraction is the designated new home for aliases/formulas.
- **Auth on every non-public route** via the existing middleware; ingestion authenticates by hashed API key. No route ships without an explicit auth decision recorded in the route file.
- **Tenant scoping**: every query filters by `userId` (and project fragment where applicable) — see §9; controllers never accept a `userId` from the request body.
- **Raw SQL only via `Prisma.sql`/`Prisma.join` bound parameters.** String interpolation into SQL is an automatic review rejection.
- **Multi-write consistency uses transactions** — specifically any future write pair like event+outbox (Phase 10A is designed around a transactional outbox; don't pre-build it, don't violate it when it lands).
- **Idempotency**: mutation endpoints that clients may retry must support idempotency keys (ingest already does; webhooks/deliveries will per Phase 14).
- **Retries belong to the async pipeline** (Phase 10A), not to inline request handlers. Until then: best-effort side-effects (alert evaluation) must be `try/catch`-isolated so they can never fail the primary write — the existing `evaluateAlertsForEvent` never-throws contract is mandatory for anything similar.
- **Error handling**: every controller keeps a top-level catch → structured 500 without leaking internals (current pattern), until Phase 10B centralizes it. New code must not invent a third pattern.
- **Pagination**: any list endpoint that can grow unbounded takes a bounded `limit` (with a server-side max, as `getEvents` does). Keyset pagination is the target for large tables (Phase 13); no new `OFFSET` pagination on `Event`.
- **Environment variables**: read once in `config/env.ts`; required vars must fail fast at boot (extend the `JWT_SECRET` pattern to `DATABASE_URL` when next touching config). Never read `process.env` ad hoc in feature code.

**Target-later (do not demand now):** service/repository layer split for existing controllers, DI, request-scoped context objects — these arrive with Phases 9–10B refactors, behind tests.

---

## 6. Analytics Standards

The blueprint (Principles 1–11) and Tracking Contract own metric semantics. Code rules for implementing them:

- **Conversion counts distinct `sessionId`s, never raw event counts.** Event-count views must be labeled as volume/diagnostic (as the funnel toggle does).
- **Shopper identity is `(projectId, customerId)`** — never merge identical customerIds across projects; all-project counts are labeled aggregates.
- **Every analytics query obeys the one shared scope**: tenant → project → time range, using the shared filter fragments — no query invents its own scope interpretation. Time bucketing follows the established session-timezone convention documented in the trend-bucketing comment block; do not introduce `AT TIME ZONE` reinterpretations.
- **Denominators must be real**: no rate is computed without a trustworthy denominator; otherwise return `null` and let the UI show a labeled count (contract §7).
- **Confirmed vs estimated is a labeling requirement in code**: fallback-basis metrics (orders-by-session, sessions-that-purchased) carry a flag or naming that the UI can label; the strong claim is never emitted with weak data.
- **GMV/currency**: dedupe one amount per distinct `order_id`; guarded numeric parsing for all money; per-currency aggregation; **no FX conversion anywhere in code**.
- **`null` ≠ `0`**: zero means "measured as zero"; `null` means "cannot be computed" — both ends (SQL mapping and React rendering) must preserve the distinction.
- **Alias canonicalization comes from one source** (today: the controller's constants; after Phase 0D: the shared metrics module). Never inline an event-name string into a query — reference the alias constant.
- **Deterministic ordering**: every `GROUP BY`+`LIMIT` query has an explicit `ORDER BY` (including a tiebreaker where ties are likely) so dashboards don't shuffle between refreshes.
- **Metric provenance**: any new metric lands with (a) its blueprint reference (feature ID like D4/F1), (b) its formula in a code comment or module doc, (c) its degraded state defined.
- **SQL review requirement**: any new or modified analytics SQL requires reviewer sign-off on scoping, alias source, ordering, and null behavior (see §15) — and, once Phase 9 exists, a golden test.

---

## 7. Frontend Architecture Standards

- **Boundaries**: pages (`app/**/page.tsx`) stay thin; container components own fetching/state (`*Overview.tsx` pattern); presentational cards receive typed props and render (current analytics cards are the model — keep them hook-free where possible).
- **Review triggers, not hard limits**: a component warrants a split discussion when it (a) exceeds roughly what `ProjectView.tsx` is today (~580 lines), (b) mixes fetching with nontrivial rendering, or (c) needs a comment map to navigate. Never split purely to satisfy a number.
- **Props**: typed interfaces from `*-types.ts`; pass domain objects (`funnel`, `health`) rather than 10 scalars; no prop drilling past two levels without considering context (the header context is the precedent).
- **State ownership**: header/global scope state lives in `DashboardHeaderContext`; page data state lives in the page's container; presentational components own only trivial local UI state (e.g. `copied`).
- **Server vs client components**: default to server components; add `"use client"` only for state/effects/browser APIs. Presentational cards must not carry `"use client"` they don't need.
- **URL state**: tab/scope state that users would bookmark or share belongs in the URL (current tabs pattern); transient UI state does not.
- **Data fetching**: the `useCallback` + `useEffect` + discriminated `FetchState` pattern is the current standard — new pages must reuse it *identically* rather than inventing variants. The known duplication (11 files re-declaring `API_BASE`/`authHeaders`) is frozen: **do not add a 12th copy** — new code imports from the first shared helper created when any of those files is next touched (see §19 boy-scout rule).
- **No effects for derived state**: compute derived values inline or with `useMemo`; `setState` inside `useEffect` to mirror props/storage is a lint error today and stays banned in new code.
- **Memoization**: only with a measured or obvious cause (large lists, context values — as `DashboardHeaderContext` does). No reflexive `useMemo`/`useCallback` on cheap values.
- **Shared UI abstractions**: `GlowCard`, `Icon`, established badge/chip patterns are mandatory for new cards; a new shared primitive requires three real consumers.
- **Responsive**: mobile-first stacking via `sm:`/`lg:` prefixes (existing pattern); every new card verified at ~375px width; no horizontal overflow.

---

## 8. UI and Accessibility Standards

- Semantic structure: one `h1` per page, `h2` per card, `h3` for card sub-areas (0C-2 established this — keep it).
- **Status is never color-alone**: pair color with a text label (Healthy/Watch/Risk badges are the model).
- Decorative icons are `aria-hidden`; meaningful icons get labels (`aria-label` on icon-only buttons, as the drawer close button does).
- Keyboard: all interactive elements reachable and operable; visible focus states; modals close on Escape (existing drawer pattern).
- Forms: every input has a label (existing `<label>`-wrapped pattern); errors announced as text near the control.
- Empty states: honest, calm copy, with the action that fills them ("Send events like…") — never fake-positive, never "0 insights."
- Loading: skeletons or spinner+text (existing patterns); never a blank region.
- Long text: `truncate` + `title` for one-liners; `break-words` + `min-w-0` for wrapping content (both established).
- Merchant-facing language: "shoppers/stores/sessions/GMV"; plain sentences; per blueprint wording rules use "near-real-time"/"from ingested events" for analytics surfaces.
- **No AI wording anywhere**: "Automated Commerce Insights," "Rule-based" — never AI/smart/prediction/forecast (blueprint Principle 7).

---

## 9. Database and SQL Standards

- **Parameterized always**: `Prisma.sql` fragments and `Prisma.join` for lists; interpolating identifiers or values as strings is prohibited.
- **Scoping is a written invariant**: every `Event`-touching query includes `"userId" = ${userId}` and the shared project/range fragments; a query without visible scoping must justify itself in a comment.
- **Indexes accompany access patterns**: a new query shape that filters/sorts on unindexed columns includes the index in the same change (existing migrations model this: `(projectId, sessionId, createdAt)` etc.).
- **EXPLAIN before shipping** any query expected to scan `Event` broadly; paste the plan in the PR description for reviewer judgment. (Formal benchmarking arrives with Phase 13 — don't block on it now, don't ignore obvious seq-scans either.)
- **Query limits everywhere**: hard `LIMIT` on every list/top-N; server-side clamps on client-supplied limits (existing `getEvents` clamp is the pattern).
- **Raw-event scans are a budgeted resource**: new full-scan aggregations need a reason they can't reuse an existing query's pass; Phase 13 rollups will replace hot paths — don't multiply them meanwhile.
- **CTE readability**: multi-step SQL uses named CTEs (`scoped`, `purchase_sessions` style); a query a reviewer can't read top-to-bottom gets restructured.
- **Aggregation semantics**: `COUNT(DISTINCT …)` for identity counts; `FILTER (WHERE …)` over correlated subqueries; explicit `COALESCE` for zero-fill; explicit `ORDER BY` (with tiebreakers) on anything limited.
- **Currency/money**: SQL `numeric` for sums; guarded regex casts for JSONB money (established pattern); never `::numeric` an unvalidated JSONB string.
- **Timestamps**: follow the documented session-timezone convention (`date_trunc`/`NOW()` in SQL); never mix `AT TIME ZONE` reinterpretation into the existing convention.
- **Migrations**: additive by default; nullable columns for backfill-later data (as `customerId`/`sessionId` were); every migration applied and committed with the schema change in one branch.
- **Destructive changes** (drops, type narrowing, data deletion) require: explicit human approval, a rehearsal on a copy, and a rollback note. Seed-reset style scripts must keep their env-guard + explicit-confirmation pattern (`CONFIRM_RESET_COMMERCE_DEMO`).
- **Transactions** wrap any multi-statement invariant (future outbox; workspace backfill migration).
- **Retention**: no automatic data deletion exists or may be added ad hoc; retention arrives designed (Phase 13) or not at all.

---

## 10. API Contract Standards

- **Response envelope**: `{ success: true, data: {…} }` / `{ success: false, message }` — the established shape; new endpoints conform; changing the envelope is a versioning event.
- **Status codes**: 400 validation · 401 missing/invalid auth · 403 authenticated-but-forbidden (revoked/archived) · 404 · 409/dup semantics via `duplicate: true` + 200 (established) · 429 with `Retry-After` (Phase 11) · 500 generic. Don't repurpose codes.
- **Naming**: response fields `camelCase`; contract event properties `snake_case` (contract-owned); never rename an existing response field in place — add, deprecate, then remove per §6 of the Tracking Contract's evolution rules.
- **Nullability is explicit and typed**: `number | null` fields mean "unavailable"; clients must never receive fake zeros (§3.8).
- **Backward compatibility**: response changes are additive; removing/renaming requires a deprecation window and a coordinated web-types change (§4). The ingestion API is governed by the Tracking Contract's append-only rule — nothing that ingests today may start failing.
- **Pagination**: bounded `limit` (+ keyset cursor when Phase 13 lands); document the max.
- **Idempotency keys**: honored on ingestion (and any future retryable mutation); duplicates return the original resource, flagged.
- **Metric metadata**: when a metric uses a fallback basis, the response carries the signal the UI needs to label it (existing pattern: comparison `direction`, funnel insight types) — labeling must never require client-side inference.
- **Client-safe errors**: messages state what the caller can fix ("customerId is required…"); internals (stack traces, SQL, table names) never leave the server.

---

## 11. Error Handling and Logging Standards

- **Two error classes**: validation/expected (4xx — precise message, no alarm) vs operational/unexpected (500 — generic message out, full detail logged in). Never blur them.
- **No swallowed exceptions**: every `catch` either handles meaningfully, rethrows, or logs with context. Empty catches and `catch {}`-and-continue are review rejections (the deliberate best-effort alert path documents its intent — that's the bar for exceptions).
- **Centralized Express error middleware is the target** (Phase 10B); until then the per-controller try/catch→500 pattern is mandatory and uniform — no third pattern.
- **Frontend error boundaries**: page-level error/retry states exist (FetchState pattern); keep every fetch path with an error branch and a retry affordance.
- **Structured logging is the target** (pino, one line/request, request IDs — Phase 10B). Until then: server `console.*` must include enough context to act on (`[handlerName]` prefix convention exists — keep it); **new code must not add bare `console.log` debugging leftovers**.
- **Request IDs**: arrive in Phase 10B; new async/side-effect designs must leave room to carry a correlation id (don't design APIs that can't propagate one).
- **When to log**: state transitions that matter operationally (failures, rejections, retries, boot). **When not to**: per-event success spam, secrets, tokens, API keys (even prefixes beyond the stored `keyPrefix`), full request bodies, raw `properties` payloads (may contain merchant data), IP+UA pairs outside their storage purpose.
- **Redaction by default**: anything printed to logs from user input is truncated and sanitized.

---

## 12. Security and Privacy Standards

- **Authorization on every project-scoped operation**: verify the resource belongs to the authenticated `userId` before acting (existing pattern — e.g. key/project lookups by id+userId). Never trust a projectId from the client without ownership check.
- **Tenant isolation is absolute**: no query, cache key, or file path that mixes tenants; cross-tenant leakage is a ship-stopping bug.
- **API keys**: raw value shown once; stored hashed; masked values must never be copyable as if real (established UX rule); server logs never print raw keys.
- **Secrets**: env only; `.env*` gitignored (only `.env.example` tracked — keep placeholders there, never real values); JWT secret fail-fast stays.
- **PII**: per the Tracking Contract — pseudonymous `customerId` only; no emails/names/street addresses in event properties; EventPulse code must never *derive* identity from `ipAddress`/`userAgent` (blueprint never-build). IP/UA are stored for debugging display in the event drawer only; they don't feed analytics identity.
- **SSRF**: any future feature fetching merchant-supplied URLs (webhooks, Phase 14) must implement the roadmap's deny-list/timeout/no-redirect suite before shipping — this is pre-committed.
- **CSV/exports** (L2, future): escape formula-leading characters (`=`, `+`, `-`, `@`) in any user-originated cell.
- **Input limits**: body-size caps (16KB properties cap exists), field length caps (120-char rules exist), batch caps (Phase 11) — every new input surface declares its limits.
- **Rate limiting**: exists per key; durable version scheduled (Phase 11); new public endpoints must state their limit story.
- **Dependencies**: additions require justification in the PR ("no unnecessary libraries" is standing project policy); prefer zero-dep solutions (SDK is spec'd zero-dep); lockfile changes reviewed like code.

---

## 13. Testing Standards

**Build and typecheck are not tests.** They prove the code compiles, not that GMV is deduped. This is the codebase's single largest gap (§2-Critical-1), scheduled as Platform Phase 9 — these standards define what that phase must satisfy and what every change owes *after* it lands:

| Layer | Covers | Required for |
|---|---|---|
| Unit / golden | metric builders, alias matching, money parsing, validators | **every** new/changed metric or validation rule |
| Integration (real Postgres) | ingestion matrix, auth, idempotency, rate limits | any ingest/auth/middleware change |
| API contract | analytics response shape + frozen-fixture values | any analytics response change |
| Frontend component | degraded/empty/error card states | new cards with conditional states |
| E2E smoke | login → dashboard → analytics render | release-level confidence (later) |

- **Until Phase 9 lands**: every change still requires typecheck + build + documented manual/API verification (the current workflow) — with honest reporting of what was and wasn't verified (§18).
- **After Phase 9 lands**: red CI blocks merge; a change to analytics SQL without an accompanying golden/contract test is incomplete by definition (§16).
- Tests use deterministic fixtures with pinned timestamps; no test may depend on wall-clock day boundaries or seed randomness.

---

## 14. Git and Branch Standards

Codifying the existing, working EventPulse workflow:

- **One feature/fix per branch**; naming: `feature/…`, `refactor/…`, `fix/…`, `test/…`, `chore/…` (matches history: `refactor/analytics-health-insights`, `feature/session-tracking-foundation`).
- **Branches are created/switched by the human owner**; agents confirm branch + clean tree before editing and never create/switch/delete branches unless told.
- **No commits without explicit approval** (standing rule). Recommended commit message is proposed in the final report; the human commits or approves committing.
- **One logical commit per branch when appropriate**; multi-commit branches follow the logical-sequence pattern documented in the roadmap phase plans.
- **No unrelated changes**: broad formatters, drive-by lint fixes, and opportunistic renames are prohibited in feature branches (repo has 14 known lint errors — fixing them is its own chore branch).
- **Review the diff before proposing a commit**: `git status`, `git diff`, `git diff --check` (whitespace), and confirmation that only intended files changed.
- **Stage explicitly**: `git add <paths>` — never `git add .`/`-A` when untracked scratch/config files may exist (this session's history includes temp verification files that must never be swept into a commit).
- **Validation before commit**: typecheck + build (+ focused lint + tests when they exist) green, or the failure explicitly reported and accepted.
- **Merge strategy**: human-owned; branches merge to `main` after review; no agent-initiated merges, rebases, or force-pushes. Accidental partial commits are repaired by the human (or by agent only with explicit instruction), never by history rewriting on shared branches.
- **Branch deletion** only by the owner after merge.

---

## 15. Pull Request Review Checklist

- [ ] **Scope**: matches the phase/task; no unrelated files; no roadmap-jumping.
- [ ] **Correctness**: logic matches the blueprint/contract definition it implements (cite the feature ID).
- [ ] **Tenant isolation**: every new query visibly scoped to `userId` (+ project fragment); no client-trusted ids without ownership checks.
- [ ] **Analytics semantics**: distinct-session basis, real denominators, null-not-zero, labeled fallbacks, alias constants (no inline event names).
- [ ] **Edge cases**: empty scope, zero denominators, missing fields, long text, mixed currency — each has a defined, honest behavior.
- [ ] **Maintainability**: new logic is in testable modules; no new duplication of types/aliases/helpers (or `// MIRROR:` noted); no dead code left behind.
- [ ] **Performance**: new Event scans justified; `LIMIT`s present; obvious indexes included; EXPLAIN attached for broad queries.
- [ ] **Accessibility**: headings, labels, non-color status, keyboard paths, wrap-safety.
- [ ] **Testing**: required tests per §13 (or, pre-Phase 9, manual verification documented honestly, including what was code-inspection-only).
- [ ] **Documentation**: docs page/examples updated if API/contract-facing; comments explain constraints, not narration.
- [ ] **Migrations**: additive, applied, committed together; destructive steps human-approved.
- [ ] **Security**: no secrets/PII in code or logs; input limits; authz on new routes.

---

## 16. Definition of Done

| Change type | Done means |
|---|---|
| **Frontend-only** | Typecheck + build green; focused lint clean on touched files; all state variants (loading/error/empty/partial) render honestly; responsive at ~375px; a11y checklist met; old components deleted only after usage search; manual or rendered-output verification documented. |
| **Backend feature** | All of the above plus: auth + tenant scoping reviewed; error paths defined; API envelope/status codes conform; manual API matrix exercised (or integration tests once Phase 9 lands); no new logic trapped in controllers. |
| **Analytics metric** | Blueprint feature ID cited; formula documented; scope fragments reused; null/degraded states defined at SQL, API, and UI layers; deterministic ordering; golden/contract test (post-Phase 9) or recorded manual verification with real payloads. |
| **Schema change** | Migration created + applied + committed with code; nullable/backfill strategy stated; indexes for new access patterns; rollback note; human approval for anything destructive. |
| **SDK/ingestion change** | Tracking Contract conformance (envelope vs contract required); backward compatibility proven (old payloads still ingest); idempotency behavior verified; docs examples updated. |
| **Performance work** | A before-measurement exists, the change is justified by it, and an after-measurement is recorded. No measurement → not performance work. |

---

## 17. Current Technical Debt Register (verified findings only)

| # | Issue | Severity | Evidence | Risk | Fix phase | Blocks roadmap? |
|---|---|---|---|---|---|---|
| 1 | Zero automated tests, no CI | **Critical** | no `*.test.*` files; no `.github/workflows` | Regressions in money/attribution logic ship undetected | Platform **9** | No — but it blocks *safe* Phase 10A+; keep 9 first |
| 2 | Analytics controller monolith | **Critical** | `analytics.controller.ts` = 1,747 lines, 18 raw-SQL sites, 32 type decls | Merge conflicts, drift, untestable in place | Analytics **0D** (metrics module) + Platform 9 | No, if 0D lands as planned |
| 3 | No error middleware / request IDs / structured logs | **Critical** | `server.ts` (routes + console request line only); 26 `console.*` sites | Undiagnosable failures once async work lands | Platform **10B** | No |
| 4 | API types duplicated server↔web with no drift detection | Important | `CommerceFunnel`/`SessionFunnel`/`AnalyticsHealth`/`AnalyticsInsight` declared in both apps; `ShopperSummary` web-only | Silent contract drift | 0D → shared module; interim `// MIRROR:` rule (§4) | No |
| 5 | Commerce alias tables duplicated in-controller | Important | `"product_viewed"` in 5 constants in one file | Alias drift between funnels/product analytics | Analytics **0D** | No |
| 6 | Frontend fetch/auth plumbing duplicated | Important | `API_BASE`/`authHeaders` in ~11 files; 15 effect-fetch components | Inconsistent auth/error behavior; churn cost | Boy-scout consolidation (§19) | No |
| 7 | 14 ESLint errors + 1 warning (pre-existing) | Important | `bunx eslint .` in apps/web; settings/overview files (`set-state-in-effect`, unescaped entities) | Lint can't gate; real effect-misuse among them | Dedicated `chore/lint-zero` branch (small) | No |
| 8 | In-memory rate limiter (single instance) | Important | `utils/rateLimit.ts` self-documented | Limits break under multi-instance | Platform **11** | No |
| 9 | Synchronous alert evaluation in ingest | Important | `event.controller.ts:388` | Latency/coupling on hot path | Platform **10A** | No |
| 10 | Dead demo components/data | Good-practice | `events-data.ts`, `dashboard-data.ts` + ~9 unrendered components | Confuses contributors; false grep hits | Small `chore/remove-dead-demo` | No |
| 11 | Env config not validated at boot (except JWT) | Good-practice | `config/env.ts` (no fail-fast for `DATABASE_URL` etc.) | Late, confusing failures | Fold into next config touch / 10B | No |

**Register discipline:** additions require evidence (file + observation); items leave the register only by being fixed, with the fixing branch noted.

---

## 18. Rules for AI Coding Agents (Claude, ChatGPT, Codex)

1. **Confirm branch + clean tree first**; never create/switch/delete branches or commit unless explicitly instructed.
2. **Inspect before editing**: read the actual current file and search for all usages before modifying, renaming, or deleting anything.
3. **Preserve roadmap scope**: implement the named phase only; later-phase work is prohibited even when convenient.
4. **No unrelated file changes**; no repo-wide formatting; no opportunistic fixes (log them for the debt register instead).
5. **Never invent backend values**: the frontend renders what the API returns; no client-side recalculation of metrics, no placeholder numbers, no fake data anywhere.
6. **Run validation** (typecheck, build, focused lint, tests when present, `git diff --check`) and report actual results, including failures.
7. **Report limitations honestly**: state exactly which behaviors were runtime-verified vs code-inspection-only. **Never claim runtime verification that didn't happen.**
8. **Prefer small, targeted changes** using existing patterns; deviate from an established pattern only when it is clearly unsafe, and say why.
9. **Ask before**: schema changes, destructive operations (deletes, resets, force-anything), new dependencies, or anything that touches data irreversibly.
10. **Follow the three product documents + this one**; where an instruction conflicts with tenant isolation, honest analytics, or the append-only contract, flag the conflict instead of complying silently.

---

## 19. Adoption Plan

No stop-the-world cleanup. Compliance is layered:

1. **Effective immediately for all new code**: everything in §§3–12, 14, 18 (principles, typing, scoping, SQL safety, envelopes, a11y, git discipline, agent rules). These mostly codify what recent code already does.
2. **Boy-scout rule when touching existing code**: when a file you're already editing violates §4/§7 duplication rules (11× `authHeaders`, mirrored types without markers), consolidate *that file's* instance — never a repo-wide sweep inside a feature branch.
3. **Debt with scheduled phases stays scheduled**: tests/CI (9), error handling/logging (10B), async alerts (10A), durable rate limit (11), controller decomposition + shared metrics module (0D + 9) — this document does not reorder the roadmaps.
4. **Two small dedicated chores worth scheduling soon** (not urgent, cheap, unblock gating): `chore/lint-zero` (fix the 14 pre-existing lint errors so lint can become a gate) and `chore/remove-dead-demo` (delete unrendered demo components/data).
5. **Feature development never pauses for a "great cleanup"**: the register (§17) is the pressure valve — findings go there, phases drain it.

---

## 20. Final Engineering Checklist (paste into implementation prompts)

```
EventPulse implementation checklist:
- Confirm branch + clean tree; never commit/create branches without approval.
- Read the blueprint/contract section for this task; cite the feature ID.
- Inspect current files and search usages before editing/deleting.
- Scope every query: userId + project/range fragments; Prisma.sql params only.
- Analytics: distinct sessions, real denominators, null not zero, labeled
  fallbacks, alias constants, deterministic ORDER BY, no FX conversion.
- Types: no `any`; unknown+narrow at boundaries; Number() bigints once at
  mapping; mirror server/web response types in the same change.
- UI: reuse GlowCard/Icon patterns; loading/error/empty/partial states;
  headings h1>h2>h3; status text not color-alone; wrap-safe text; ~375px OK.
- No new duplication (API_BASE/authHeaders/aliases/types) — import or MIRROR.
- No AI wording; merchant language; honest empty states.
- Validate: bun run typecheck && bun run build; focused lint on touched
  files; tests when present; git diff --check; review git status for strays.
- Report honestly: what was runtime-verified vs inspected; limitations;
  proposed commit message. Do not commit.
```
