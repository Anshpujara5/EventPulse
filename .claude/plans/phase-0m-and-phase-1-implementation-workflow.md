# EventPulse Phase 0M and Phase 1 Implementation Workflow

**Type:** Implementation workflow (branch plans + Codex handoffs). Design authority stays with the permanent documents; this file operationalizes them.
**Assumes:** Phase 0D-5 (Analytics Query Performance Baselines) is implemented separately per its own plan and completes before 0M ships its last branch. Repository verified at commit `5d2faa7` (main, clean tree, 2026-07-15).
**Governing documents (authoritative, unmodified):** analytics blueprint (`product-performance-analytics-design-cozy-book.md`, esp. Parts 4, 5, 7) · Commerce Tracking Contract (`commerce-tracking-contract.md`) · Engineering Quality Standards (`eventpulse-engineering-quality-standards.md`) · Platform Roadmap (`platform-roadmap-post-analytics.md`, esp. Phases 9–12) · Phase 0D-5 + 0M design (`analytics-query-performance-phase-0d5.md`, whose 0M sections this file executes).
**Evidence basis:** the Haiku 4.5 read-only inventory (2026-07-15), spot-verified where it affects architecture or schema. Verified corrections are marked; nothing was copied blindly.

**Execution order (binding):** 0D-5 → **0M** → **Phase 1** → Phase 2.

---
---

# Part I — Phase 0M: Codebase Maintainability Sweep

## I.1 Purpose

Phase 1 begins the longest-lived code in the product: the Commerce Tracking Contract conventions that every SDK, docs page, and money metric will build on. 0M clears the specific, verified debt that would tax that work:

- **Lint cannot gate anything** while 14 pre-existing problems sit in `apps/web` — and 0M/Phase 1 branches want lint as a gate.
- **`event.controller.ts` (522 lines) mixes eight responsibilities**; Phase 1 must wire contract warnings into exactly that file. Extracting its pure logic first is the same playbook 0D-3 ran for analytics before 0D-4 touched fetch behavior — make the file reviewable *before* changing what it does.
- **Duplicated fetch/auth plumbing (7× `API_BASE`, 5× `authHeaders`)** means every future page copies a defect; consolidation is cheapest now, before Phase 1 docs/readiness work adds frontend surface.
- **12 dead demo components + 2 dead data files** pollute searches and confuse contributors during exactly the kind of repo-wide inspection Phase 1 requires.

0M runs **after 0D-5** because the committed performance baseline is the regression net: any 0M branch that brushes server code can rerun a small-tier benchmark as a cheap smoke. It runs **before Phase 1** because branch 4 (ingestion extraction) is a hard prerequisite for Phase 1's branch 1C (§II.13).

This is a sweep with a checklist and stop conditions (§I.6), not a beautification project.

## I.2 Non-Goals

No new product features · no metric changes · no API redesign (envelope, status codes, and messages are frozen in 0M) · no schema redesign or migrations · no generic framework creation (no repository layer, no DI, no fetch library) · **no hard line-count rules** (§I.5) · no broad formatting or rename sweeps · no Platform Phase 9 work (no test framework, no CI) · no Phase 10A/10B/11 infrastructure (no async pipeline, no error middleware, no request IDs, no structured logging, no durable rate limiting) · no shared frontend/backend types package (MIRROR rule stands) · no touching `apps/server/src/analytics/` beyond nothing at all (just cleaned and baselined) · **no endless cleanup** — the stop conditions are binding.

## I.3 Verified Candidate Table

Re-audited at `5d2faa7`. Haiku's inventory confirmed except where noted (its `bunx eslint@latest` run crashed on a version mismatch; the repo-local ESLint run is authoritative: **14 problems = 13 errors + 1 warning**, not "14 errors + 1 warning").

| # | Candidate | Evidence / path | Priority | Risk it carries | Treatment | Branch | Blocks Phase 1? | Defer reason |
|---|---|---|---|---|---|---|---|---|
| C1 | Lint cannot gate: 14 problems (13 errors, 1 warning) | repo-local `bunx eslint .` in `apps/web`: `react-hooks/set-state-in-effect` (`WorkspaceSettingsCard.tsx:77`, `ProjectsOverview.tsx:115`, settings/overview siblings), `react/no-unescaped-entities` (`TeamMembersCard.tsx:35` et al.) | **Critical** | Real effect misuse (cascading-render class) hides among cosmetics; no gating possible | Fix all 14; zero suppressions | `chore/lint-zero` | Indirectly (gates later branches) | — |
| C2 | Ingestion controller mixes 8 concerns | `event.controller.ts` = 522 lines; `ingestEventController` L104–425 (~322 lines): key auth, revocation/archive checks, rate limit, envelope validation, idempotency (2 paths incl. race), insert, `lastUsedAt`, alert side-effect, response shaping | **Critical** | Phase 1 (1C) must edit this file; unreviewable at current size; untestable without Express | Extract pure logic to `src/ingestion/`; thin controller | `refactor/ingestion-module` | **Yes — hard prerequisite for 1C** | — |
| H1 | Frontend fetch/auth duplication | 7 files re-declare `API_BASE` (`ProfileSettingsCard`, `WorkspaceSettingsCard`, `ProjectSettings`, `ProjectView`, `DocsOverview`, `DashboardOverview`, `EventsOverview`); 5 re-declare `authHeaders` (`ProjectSettings`, `ProjectView`, `HeaderAlertButton`, `AlertFormModal`, `AlertsOverview`); ~17 scattered `localStorage.getItem("eventpulse_token")` reads; `lib/api.ts` (27 lines) already exists with 11 consumers | High Value | Every new page copies the defect; inconsistent auth/error behavior | Consolidate onto `lib/api.ts` + one auth-header helper. **Exception:** `DocsOverview` *displays* the base URL inside curl snippets — that usage is legitimate content, keep it (via the shared constant) | `refactor/frontend-fetch` | No | — |
| H2 | Dead demo scaffolding | 12 verified-unrendered components (`LiveEventTable`, `EventMetricCard`, `EventThroughputChart`, `EventDetailsPanel`, `SystemHealthCard`, `EventCategoriesCard`, `RecentActivityTable`, `ApiTrafficCard`, `ProjectSummaryCard`, `ApiKeyUsageCard`, `LiveEventStream`, `EventVolumeChart`) + `events-data.ts`, `dashboard-data.ts`. Live and must be kept: `MetricCard` (2 importers), `DashboardStats`, `EmptyDashboard`, `RecentApiKeysCard`, `RecentProjectsCard`, `EventsComingSoonCard` | High Value | False grep hits; contributor confusion during Phase 1 inspection | Delete after per-file usage search | `chore/remove-dead-demo` | No | — |
| H3 | Env vars not validated at boot | `config/env.ts` collects without validation; `DATABASE_URL` fails only via `config/prisma.ts` import; `JWT_SECRET` only in `utils/jwt.ts` | High Value | Late, confusing failures on misconfig | Fail fast in `env.ts` for required vars (standards §5 mandates the pattern "when next touching config") | `chore/env-fail-fast` | No | — |
| O1 | `ProjectView.tsx` 580 / `ApiKeysOverview.tsx` 541 mix fetch + nontrivial render | line counts verified | Opportunistic | Stable files, coherent responsibilities | Review for extraction **only** if H1 already forces edits there; do not split for size | rides H1 | No | — |
| O2 | `ProjectSettings.tsx` 479, `AlertsOverview.tsx` 460 | verified | Opportunistic | Same | Same | rides H1 | No | — |
| O3 | Non-analytics API types mirrored without `// MIRROR:` markers | `alert-types.ts`, `api-key-types.ts`, `event-types.ts` | Opportunistic | Silent contract drift | Add markers when a branch touches those files | boy-scout | No | — |
| O4 | `console.*` without `[handlerName]` prefix | scattered | Opportunistic | Minor debuggability | Prefix when touched; no sweep | boy-scout | No | — |
| D1 | Zero tests / CI | standards §17 #1 | Defer | — | — | — | No | Platform Phase 9 |
| D2 | No error middleware / request IDs / structured logging | standards §17 #3 | Defer | — | — | — | No | Platform Phase 10B |
| D3 | Synchronous alert evaluation in ingest | `event.controller.ts:388` | Defer | — | — | — | No | Platform Phase 10A |
| D4 | In-memory rate limiter | `utils/rateLimit.ts` | Defer | — | — | — | No | Platform Phase 11 |
| D5 | Shared server↔web types package | standards §19 | Defer | — | — | — | No | Dedicated later decision |

**Selected: 5 branches (2 Critical + 3 High Value).** Opportunistic items ride along only inside selected branches' files; Defers are recorded, untouched.

## I.4 Final Phase 0M Branch Sequence

All five evaluated candidates are selected — each is evidence-backed above; nothing else qualifies. Naming note: "refactor/frontend-api-client" and "refactor/frontend-fetch" describe the same branch; this plan keeps **`refactor/frontend-fetch`**, the name fixed in the approved 0M design. Order: 1 → 2 → 3 → 5 → 4 (lint first so it gates the rest; ingestion extraction last because it is the largest review and hands off directly into Phase 1).

### Branch 1 — `chore/lint-zero`

- **Purpose:** make lint a usable gate by fixing all 14 pre-existing problems.
- **Exact scope:** every problem reported by the repo-local `bunx eslint .` in `apps/web`, nothing else. `react/no-unescaped-entities` → HTML entities. `react-hooks/set-state-in-effect` → restructure per React guidance (derive during render / `useMemo`; storage-seeded init → lazy `useState` initializers or event handlers; genuine external-system sync stays in effects, correctly shaped). Zero `eslint-disable`.
- **Likely files:** `WorkspaceSettingsCard.tsx`, `ProfileSettingsCard.tsx`, `ProjectsOverview.tsx`, `TeamMembersCard.tsx`, plus whatever the fresh lint run enumerates (re-enumerate; do not trust this list).
- **Exclusions:** no renames, no formatting, no dependency/config changes, no other files.
- **Steps:** (1) run lint, list all findings; (2) fix entity errors mechanically; (3) fix each effect violation with a documented equivalence argument; (4) re-run lint to zero; (5) manual smoke of every touched page.
- **Risks:** effect restructuring is the one place behavior could shift (render timing, localStorage seeding). Mitigation: per-fix equivalence note + manual exercise of settings save/load, projects list/filter, dashboard overview.
- **Acceptance:** `bunx eslint .` → 0 problems; typecheck/build green; touched pages behave identically.
- **Validation commands:** `bunx eslint .` (in `apps/web`) · `bun run typecheck` · `bun run build` · `git diff --check` · `git status`.
- **Manual checks:** settings cards save/load round-trip; projects page filter; overview renders.
- **Commit message:** `chore: fix all pre-existing lint errors so lint can gate`
- **Codex model:** Codex 5.6 Sol Ultra (hook restructuring is subtle; cheap branches don't need cheap models).

### Branch 2 — `chore/remove-dead-demo`

- **Purpose:** delete verified-unrendered demo scaffolding.
- **Exact scope:** the 12 components + 2 data files in the C-table (H2), each re-verified by repo-wide usage search at implementation time; live files listed in H2 are kept. If a data-file type is imported by a live file, relocate the type into the live consumer.
- **Likely files:** `apps/web/components/dashboard/events/` and `apps/web/components/dashboard/overview/` members named above.
- **Exclusions:** nothing outside those directories; no refactors of live components.
- **Steps:** leaf components first, then data files, re-grepping after each deletion.
- **Risks:** a "dead" file secretly reachable → build break (caught by typecheck/build); a stranded type → relocate, don't resurrect.
- **Acceptance:** zero references to deleted names anywhere; overview + events pages render unchanged; lint stays 0.
- **Validation:** `bun run typecheck` · `bun run build` · `bunx eslint .` (0) · grep proof per file · `git status` (deletions only, plus at most one type relocation).
- **Manual checks:** load dashboard overview and events pages.
- **Commit message:** `chore: remove unrendered demo components and dead data files`
- **Codex model:** mid-tier is acceptable (mechanical, verification-heavy); Sol Ultra if available cheaply.

### Branch 3 — `refactor/frontend-fetch`

- **Purpose:** one fetch path, one auth-header source, one base-URL constant.
- **Exact scope:** extend `lib/api.ts` with a `getAuthHeaders()` (token read + `Authorization` construction) and export the base-URL constant; migrate all fetch call sites to `apiRequest`; delete the 7 `API_BASE` and 5 `authHeaders` copies; centralize `localStorage` token reads. `DocsOverview`'s display-only base-URL usage switches to importing the shared constant (content unchanged).
- **Likely files:** `lib/api.ts` + the 12 duplicating components (H1 list) + any residual raw-`fetch` call sites found by grep.
- **Exclusions:** no behavior changes — identical URLs, headers, bodies; no error-handling redesign; no state-management changes; O1/O2 splits only if the migration already rewrites those regions (unlikely; default is no).
- **Steps:** (1) grep-inventory every `fetch(`/`API_BASE`/`authHeaders`/token read; (2) extend `lib/api.ts`; (3) migrate file-by-file; (4) delete local copies; (5) network-panel comparison on each touched page.
- **Risks:** a subtly different header or URL on one page. Mitigation: per-page network-panel diff (method, URL, headers) before/after.
- **Acceptance:** greps for `const API_BASE`, local `authHeaders`, and raw token reads return only `lib/api.ts` (+ documented display-only import); all pages function; lint 0.
- **Validation:** typecheck · build · lint (now gating) · `git diff --check`.
- **Manual checks:** signin → dashboard → projects CRUD → API keys → alerts → settings → events → analytics; network panel shows identical requests.
- **Commit message:** `refactor: consolidate frontend fetch and auth plumbing`
- **Codex model:** Codex 5.6 Sol Ultra (many-file behavior-preserving migration).

### Branch 4 — `refactor/ingestion-module` *(the Phase 1 prerequisite — lands last, after 5)*

- **Purpose:** make `event.controller.ts` reviewable and its logic importable without Express, so Phase 1's 1C is a small wiring diff instead of surgery on a 522-line file.
- **Exact scope:** create `apps/server/src/ingestion/` with pure modules moved verbatim: `envelope.ts` (name/properties/size rules: `MAX_EVENT_NAME_LENGTH`, `MAX_PROPERTIES_BYTES`, `MAX_IDEMPOTENCY_KEY_LENGTH`, `hasControlChars`, name + properties validators), `shopperIds.ts` (`validateShopperId`, `MAX_SHOPPER_ID_LENGTH`), `idempotency.ts` (key resolution header-over-body + length rule; the lookup/race-handling SQL helpers taking explicit params), `apiKeyAuth.ts` (raw-key extraction from headers + the hash-lookup query + status/project-status checks as data-in/data-out functions). Controller keeps: HTTP orchestration, status codes, response literals, rate-limit call, insert, `lastUsedAt`, alert side-effect call, catch→500. **Zero behavior change:** same statuses, same exact message strings, same duplicate semantics, same alert never-throws contract, same SQL (moved by copy, never retyped).
- **Likely files:** `event.controller.ts` (thinned toward ~150–200 lines), 4 new files under `src/ingestion/`.
- **Exclusions:** no validation-rule changes, no new checks, no batch/occurredAt anticipation, no `getEventsController` changes beyond none, no analytics files, no schema. **Not** the platform roadmap Phase 11 "shared validator extraction" (that one is batch-oriented and lands behind Phase 9 tests — this is the smaller reviewability cut; the tension is acknowledged and mitigated by the byte-identical manual matrix below).
- **Steps:** (1) read controller fully; (2) move constants + pure validators; (3) move key-auth and idempotency helpers with explicit-parameter signatures; (4) thin controller to orchestration; (5) run the ingest matrix before/after and diff responses byte-for-byte.
- **Risks:** R1 dropped check or reordered validation (order is observable via which 400 fires first — preserve the exact sequence: auth → revoked → archived → rate limit → name → customerId → sessionId → properties-shape → idempotency-key-length → dedup → size → insert). R2 subtle SQL change (copy, never retype). R3 alert side-effect timing change (call site stays after insert + lastUsedAt, unchanged).
- **Acceptance:** ingest matrix byte-identical pre/post; controller contains no validation bodies; modules import without Express; typecheck/build/lint green.
- **Validation:** typecheck · build · `git diff --check` · manual matrix (below) · optional 0D-5 small-tier bench smoke (server code touched — cheap insurance).
- **Manual checks (ingest matrix, curl, both before and after on the same dev DB):** valid event (201, `duplicate:false`) · missing name / empty name / 121-char name / control-char name (400, exact messages) · missing/invalid customerId, sessionId (400) · properties = array / string (400) · >16KB properties (400) · missing key (401) · bad key (401) · revoked key (403) · archived project (403) · rate-limit burst (429) · duplicate idempotency key via header (200, `duplicate:true`) · duplicate via body field · header-beats-body precedence · alert threshold crossing still creates a trigger.
- **Commit message:** `refactor: extract ingestion domain modules from event controller`
- **Codex model:** **Codex 5.6 Sol Ultra, non-negotiable** (highest-risk 0M branch).

### Branch 5 — `chore/env-fail-fast`

- **Purpose:** boot fails loudly, listing missing required env vars.
- **Exact scope:** `config/env.ts` validates `DATABASE_URL`, `JWT_SECRET` (and only genuinely required vars) at import, throwing one clear aggregate error; existing per-file checks (`config/prisma.ts`, `utils/jwt.ts`) stay as second walls.
- **Likely files:** `config/env.ts` only.
- **Exclusions:** no new env vars, no config framework, no dotenv changes, no reading `process.env` anywhere new.
- **Steps:** enumerate required vars from actual usage; add aggregate validation; boot-test each missing-var combination.
- **Risks:** accidentally requiring an optional var (breaks dev boot) — verify each against `.env.example` and real usage.
- **Acceptance:** boot without `JWT_SECRET` (or `DATABASE_URL`) fails with a message naming exactly the missing vars; normal boot unchanged.
- **Validation:** typecheck · build · boot matrix.
- **Commit message:** `chore: fail fast on missing required environment variables`
- **Codex model:** mid-tier acceptable.

## I.5 Maintainability Rules (binding for 0M and all future phases)

Line counts are **review signals, not rules**: React components ~250–300+, controllers ~300–400+, domain/utility modules ~400–500+, functions ~60–100+. Every trigger means exactly: **"Review for extraction; do not split automatically."** A file splits only when the review finds mixed responsibilities, duplicated logic, dead code, untestability, or extension pain — a coherent 580-line container passes; a 200-line mixed-concern file may not. Never split code only because of line count.

## I.6 Stop Conditions

Phase 0M ends — and Phase 1 starts — when **any** holds:

1. The five branches are merged (Critical + High Value complete).
2. Remaining candidates are all Opportunistic/Defer — cosmetics never block Phase 1.
3. Further cleanup would delay Phase 1 beyond the sweep's budget (days, not weeks; if branch 4 balloons, it ships smaller and the remainder goes to the debt register).
4. A discovered item belongs to Platform Phase 9/10A/10B/11+ — recorded and deferred, never absorbed.

New findings during 0M go to the standards §17 debt register, not into the running branch. There is no "while we're at it" clause.

## I.7 Complete Codex Prompts — Phase 0M

**Prompt 0M-1 — `chore/lint-zero`**

> You are working in the EventPulse repository (Turborepo + Bun; `apps/web` = Next.js + React + TypeScript + Tailwind). **Read `AGENTS.md` first: this Next.js version has breaking changes vs your training data — consult `node_modules/next/dist/docs/` before writing any React/Next code.** Phases 0A–0D-5 are complete. Implement **Phase 0M branch 1 only**: `chore/lint-zero`. Confirm a clean tree; the human owner creates/switches branches — never do it yourself.
>
> **Read first:** `~/.claude/plans/phase-0m-and-phase-1-implementation-workflow.md` (Part I §I.4 branch 1, §I.5), `~/.claude/plans/eventpulse-engineering-quality-standards.md` (§§4, 7, 14, 18). Then run the repo-local lint (`bunx eslint .` inside `apps/web`) and enumerate every finding yourself — expect ~14 problems (13 errors, 1 warning): `react-hooks/set-state-in-effect` in `WorkspaceSettingsCard.tsx`, `ProjectsOverview.tsx` and settings/overview siblings; `react/no-unescaped-entities` in `TeamMembersCard.tsx` et al. Your enumeration is authoritative, not this list.
>
> **Scope — exactly this:** fix every reported problem; nothing else. Unescaped entities → suggested HTML entities. `set-state-in-effect` → restructure per React guidance: derive values during render or `useMemo`; storage/API-seeded initialization → lazy `useState` initializers or event handlers; keep genuine external-system sync in correctly-shaped effects. Behavior must be identical (same rendered output, same fetches, same persistence). Forbidden: `eslint-disable` in any form, renames, formatting sweeps, dependency/config changes, any file lint didn't flag.
>
> **Validation (run, report actual output):** `bunx eslint .` → 0 problems · `bun run typecheck` · `bun run build` · `git diff --check` · `git status` (only intended files). Manually exercise every touched page (settings save/load, projects list/filter, dashboard overview) and state per fix why behavior is unchanged, and what was runtime-verified vs inspected. **Do not commit** — propose `chore: fix all pre-existing lint errors so lint can gate` and stop.

**Prompt 0M-2 — `chore/remove-dead-demo`**

> EventPulse repository; `apps/web` is Next.js — **read `AGENTS.md` first** (Next.js differs from your training data). Branch `chore/lint-zero` is merged. Implement **Phase 0M branch 2 only**: `chore/remove-dead-demo`. Clean tree confirmed; human owner handles branching.
>
> **Read first:** `~/.claude/plans/phase-0m-and-phase-1-implementation-workflow.md` (Part I §I.3 H2, §I.4 branch 2); standards §16 (delete only after usage search) and §18.
>
> **Scope — exactly this:** delete dead demo scaffolding under `apps/web/components/dashboard/events/` and `apps/web/components/dashboard/overview/`. Audit candidates: `LiveEventTable`, `EventMetricCard`, `EventThroughputChart`, `EventDetailsPanel`, `SystemHealthCard`, `EventCategoriesCard`, `RecentActivityTable`, `ApiTrafficCard`, `ProjectSummaryCard`, `ApiKeyUsageCard`, `LiveEventStream`, `EventVolumeChart`, plus `events-data.ts` and `dashboard-data.ts`. **Re-verify each with your own repo-wide import/usage search before deleting**; delete leaf components first, then data files, re-checking after each. Known-live, must keep: `MetricCard`, `DashboardStats`, `EmptyDashboard`, `RecentApiKeysCard`, `RecentProjectsCard`, `EventsComingSoonCard`. If a candidate is imported by a live file, keep it and report the finding. If deleting a data file strands a type a live file needs, relocate the type into the live consumer.
>
> **Validation:** `bun run typecheck` · `bun run build` · `bunx eslint .` (stays 0) · grep proof no deleted name or export is referenced · `git status` (deletions + at most one relocation) · manually load overview and events pages. **Report** per-file verdict (deleted / kept-live / kept-with-finding) with evidence. **Do not commit** — propose `chore: remove unrendered demo components and dead data files` and stop.

**Prompt 0M-3 — `refactor/frontend-fetch`**

> EventPulse repository; `apps/web` is Next.js — **read `AGENTS.md` first.** Branches `chore/lint-zero` and `chore/remove-dead-demo` are merged. Implement **Phase 0M branch 3 only**: `refactor/frontend-fetch`. Clean tree; human owner handles branching.
>
> **Read first:** workflow Part I §I.4 branch 3; standards §7 (data fetching, boy-scout), §4 (MIRROR), §18. Inventory first: grep every `fetch(`, `const API_BASE`, `authHeaders`, and `localStorage.getItem("eventpulse_token")` under `apps/web` and list all call sites before editing.
>
> **Scope — exactly this:** (1) extend `apps/web/lib/api.ts` with an exported base-URL constant and a `getAuthHeaders()` helper (token read + `Authorization: Bearer …`); (2) migrate every data call site to `apiRequest` + the helper; (3) delete the ~7 local `API_BASE` and ~5 local `authHeaders` copies and scattered token reads; (4) `DocsOverview` keeps displaying the ingest URL in its snippets — it imports the shared constant; rendered docs content must be byte-identical. **Zero behavior change:** identical request URLs, methods, headers, bodies; identical loading/error states (FetchState pattern untouched). Do not split `ProjectView`/`ApiKeysOverview` or redesign anything; do not touch `useAnalyticsTabData` (already on `apiRequest`).
>
> **Validation:** typecheck · build · lint (0) · `git diff --check` · per-page manual matrix with the network panel open, comparing requests before/after: signin, dashboard overview, projects CRUD, project settings, API keys, alerts (create/edit), settings cards, events, analytics tabs, docs page. **Report** the call-site inventory, per-page network verification, anything intentionally left (with reason), runtime-verified vs inspected. **Do not commit** — propose `refactor: consolidate frontend fetch and auth plumbing` and stop.

**Prompt 0M-4 — `chore/env-fail-fast`**

> EventPulse repository, `apps/server` (Express + TypeScript). Branches 0M-1..3 are merged. Implement **Phase 0M branch 5** (sequenced before the ingestion refactor): `chore/env-fail-fast`. Clean tree; human owner handles branching.
>
> **Read first:** workflow Part I §I.4 branch 5; standards §5 (env rules); `apps/server/src/config/env.ts`, `config/prisma.ts`, `utils/jwt.ts`, `.env.example`; grep `process.env` across `apps/server/src` to enumerate real usage.
>
> **Scope — exactly this:** `config/env.ts` validates required vars at module load — `DATABASE_URL` and `JWT_SECRET` (verify against usage; do not require genuinely optional vars like `PORT`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, which have defaults) — throwing one aggregate error naming every missing var. Keep existing downstream checks. No other file changes; no new env vars; no reading `process.env` outside config.
>
> **Validation:** typecheck · build · boot matrix: normal boot unchanged; boot with each required var unset fails with a message naming exactly the missing vars; boot with both unset names both. Report actual console output. **Do not commit** — propose `chore: fail fast on missing required environment variables` and stop.

**Prompt 0M-5 — `refactor/ingestion-module`**

> EventPulse repository, `apps/server` (Express + Prisma 7 + PostgreSQL). Branches 0M-1..3 and `chore/env-fail-fast` are merged. Implement **Phase 0M branch 4 only**: `refactor/ingestion-module` — the Phase 1 prerequisite. Clean tree; human owner handles branching. This is a **behavior-preserving extraction**: any observable change is a defect.
>
> **Read first, edit second:** `apps/server/src/controllers/event.controller.ts` (all 522 lines), `utils/rateLimit.ts`, `utils/alertEvaluation.ts`, `utils/apiKey.ts`, `prisma/schema.prisma` (Event model + unique `(apiKeyId, idempotencyKey)`); workflow Part I §I.4 branch 4; standards §§5, 9, 14, 18; 0D-3 plan §11 (the response-diff discipline this branch reuses).
>
> **Scope — exactly this:** create `apps/server/src/ingestion/` with logic **moved verbatim** from the controller: `envelope.ts` (name/properties/idempotency-key-length limits + validators + `hasControlChars`), `shopperIds.ts` (`validateShopperId` + its limit), `idempotency.ts` (header-over-body key resolution; existing-event lookup and unique-violation detection as explicit-parameter functions), `apiKeyAuth.ts` (header extraction, hash lookup query, ACTIVE-key and ACTIVE-project checks returning typed results). Thin `ingestEventController` to orchestration that preserves the **exact validation order** (key auth → revoked → archived → rate limit → name → customerId → sessionId → properties shape → idempotency-key length → dedup lookup → size check → insert → race fallback → lastUsedAt → alert eval → response) and the exact status codes and message strings. SQL moves by copy — never retyped. `getEventsController` unchanged. Forbidden: new validation, batch/occurredAt anticipation, message edits, analytics files, schema, frontend, rate-limit or alert changes.
>
> **Validation (run, report actual output):** `bun run typecheck` · `bun run build` · `git diff --check`. Then the full ingest matrix via curl against the dev server, captured **before and after** on the same database and diffed byte-for-byte: valid event · missing/empty/oversized/control-char name · missing/invalid customerId and sessionId · properties as array/string · >16KB properties · missing key (401) · invalid key (401) · revoked key (403) · archived project (403) · rate-limit burst (429) · duplicate via `Idempotency-Key` header (200 `duplicate:true`) · duplicate via body field · header-precedence case · alert threshold crossing creates a trigger. Paste the diffs (expect: empty). If the server can't run, say so and list inspection-only verifications. **Report** the module map (what moved where), line counts before/after, matrix results, limitations. **Do not commit** — propose `refactor: extract ingestion domain modules from event controller` and stop.

---
---

# Part II — Phase 1: Commerce Tracking Contract Implementation

## II.1 Purpose

Phase 1 implements the **data foundation** of the Commerce Tracking Contract: the contract represented in code as a single machine-readable module, observational (never rejecting) conformance validation, tracking-readiness reporting, docs that teach the unlock ladder, and seed data that exercises the full ladder. Per blueprint Part 4 this phase is **properties-only — no Prisma schema change — and ingestion stays permissive**. Phase 1 does **not** implement Phase 2 sales analytics: no GMV, no Orders, no AOV, no product revenue, no payments/refunds dashboards. It builds the rungs; Phase 2 climbs them.

## II.2 Authoritative Source and Ambiguities Requiring User Approval

`~/.claude/plans/commerce-tracking-contract.md` is authoritative; blueprint Part 4/Part 7 fix Phase 1's size ("S–M") and properties-only constraint; the platform roadmap fixes what Phase 1 must *not* absorb (batch/quarantine/occurredAt → Phase 11; SDK → Phase 12; registry/enforcement → Phase 17). This plan does not rewrite any of it.

**Verified rulings on the correction-requirement questions:**

| Question | Ruling | Evidence |
|---|---|---|
| Does batch belong to Phase 1? | **No — Platform Phase 11.** | Roadmap Phase 11 owns `POST /api/events/batch`, per-item results, quarantine, shared-validator refactor "behind Phase 9's tests"; contract §9 places batching in SDK/transport (Phases 11–12). Blueprint Part 4 keeps Phase 1 properties-only. |
| Does the contract require batch support now? | No. Contract §1 describes the envelope for "single or batched" but assigns transport to Phase 11+ (§9, §13 "occurredAt + batch API absorb POS batch imports" as future). |
| PII: reject, warn, or document? | **Document in Phase 1.** Contract §7 Layer 1 rejects only system threats; PII is not a Layer-1 rejection anywhere in the contract. Detection/warnings belong to Health/I3 (blueprint Phase 4) and registry (Phase 17). The §11 error-code taxonomy contains **no PII code** — inventing one would extend the contract, which requires a changelog the user must approve. |
| Exact occurredAt policy? | Contract §1: optional, ISO-8601, **"Clamped to ±48h of server time; clamped events are stored and flagged, never dropped"** — and the field is explicitly tagged **"(Phase 11+)"**. |
| Is ±48h authoritative or inferred? | **Authoritative contract text** (§1). The roadmap's Phase 11 wording ("bounded clock-skew clamp") is the implementing phase; the bound itself is written in the contract. |
| items[] required or recommended? | **Recommended.** Contract §5 purchase table marks items[] **Rec**; the changelog states the required→recommended reclassification explicitly. |
| SDK in Phase 1? | **No — Phase 12** (roadmap Phase 12; contract §9 "implementation is platform Phase 12"). |
| Quarantine infrastructure? | **No — Phase 11** (roadmap Phase 11 quarantine table/wiring; Phase 17 enforcement modes reuse it). |
| Normalized product/order tables? | **Never in this phase** — contract §3: "No entity requires a schema change — everything lives in `Event.properties` plus the envelope." |

**Ambiguities requiring explicit user approval before the affected branch starts** (the contract does not settle these; do not begin the branch without a ruling):

- **A1 — Single-event ingest response warnings (gates 1C).** Contract §11 enumerates merchant-facing surfaces (batch per-item results, Health findings, locked cards, Inspector, digest) — the **single-event ingest response is not among them**. Adding an additive, omit-when-clean `warnings[]` to the 201 response is consistent with §11's taxonomy and the append-only API rule, and gives curl integrators immediate feedback — but it extends the contract's surface list. **Recommendation: approve** (additive, cheap, honest). If declined, 1C is dropped and validators surface only via 1D readiness.
- **A2 — Readiness surface in Phase 1 (gates 1D).** The full I3 data-quality rule library is blueprint **Phase 4**; the unlock-ladder page is **Phase 12.5**; Health *grades* (contract §10) build on I3. Phase 1's honest minimum is **rung detection** (contract §8) surfaced as additive fields on the existing analytics Health card. **Recommendation: approve the minimal rung-detection scope**; anything richer waits for Phase 4.
- **A3 — Alias single-source inversion (gates 1A).** Blueprint Part 5 names one shared module as the alias single source. Today that source is `analytics/shared/aliases.ts` — a file 0D-5 conceptually froze ("analytics directory untouched"). 1A moves the constants into the contract module and turns `analytics/shared/aliases.ts` into a re-export shim (identical exports, zero SQL/behavior change, analytics imports untouched). **Recommendation: approve** — it is the one mechanically safe way to obey Part 5 without editing any analytics query module. If declined, the contract module imports *from* analytics (dependency direction reversed; workable, uglier).
- **A4 — PII detection deferral.** Phase 1 documents the PII ban prominently (docs branch) and does **not** implement detection (no contract code exists for it — see ruling above). Approve the deferral or commission a contract changelog first.

## II.3 Current Ingestion vs Contract — Gap Matrix

Verified against `event.controller.ts` (read in full), `schema.prisma`, `DocsOverview.tsx`, and `seedCommerceDemoData.ts` at `5d2faa7`.

**Envelope:**

| Item | Contract requirement | Current behavior | Gap | Branch | Schema change? | Compat risk |
|---|---|---|---|---|---|---|
| `name` | Envelope-required; 1–120 chars, trimmed, no control chars | Implemented exactly (L186–214) | None | — | No | None |
| `customerId` | Envelope-required; 1–120 chars, pseudonymous | Validated (shape only); pseudonymity is convention | Docs must state the pseudonym rule; no code gap | 1E | No | None |
| `sessionId` | Envelope-required; 1–120 chars | Validated | None (SDK rotation semantics are Phase 12) | — | No | None |
| `occurredAt` | Optional, ISO-8601, ±48h clamp, stored-and-flagged — **"(Phase 11+)"** | Absent; `createdAt` = server `NOW()` only | Deliberate — **deferred to Phase 11** | none (Phase 11) | Phase 11 will decide | None now |
| `eventId` / idempotency | Optional `Idempotency-Key` header or body field; per-key scope; `duplicate:true` replay | Fully implemented incl. unique-constraint race handling (L254–376) | None — reuse as-is | — | No | None |
| Source/SDK metadata (`X-EventPulse-SDK`) | Observability-only header (§6) | Not read | Phase 12 concern (SDK sends it) | none (Phase 12) | No | None |
| `properties` | Optional plain object ≤16KB; flat + `items[]` by convention; unknown keys always accepted | Plain-object check + 16KB cap; stored untouched | Conformance *measurement* missing (by design — Layer 2) | 1B/1C/1D | No | None |
| Batch array | §9/Phase 11 transport | Single event only | Deliberate — **Phase 11** | none | No | None |

**Commerce fields** (all: stored untouched today, no validation, no measurement — the shared gap is *observation*, never rejection):

| Field | Contract status | Current | Gap → branch |
|---|---|---|---|
| `product_id` | **R** on product events; analytics grouping key | Read at analytics time only (CTEs) | Observational check + readiness rung 3 → 1B/1D |
| `product_name` | Rec | Read at analytics time (fallback to id) | Observational → 1B |
| `category` | Rec (single flat label; `category_path[]` reserved) | Read at analytics time | Observational → 1B |
| `quantity` | Rec on add_to_cart | Guarded-numeric parse at analytics time | Observational (non-numeric → warning) → 1B |
| `price` | Rec + currency | Not validated | Money-rule check → 1B |
| `amount` | **R** on purchase (+currency) | Not validated; seed sends it | Money-rule check + rung 5 → 1B/1D |
| `currency` | **R** wherever money appears; ISO-4217 uppercase | Not validated | Format check (3 uppercase letters; unknown codes = warning, never rejection) → 1B |
| `order_id` | **R** on purchase; **the** dedup key | Not validated; seed sends it | Presence check + rung 4; order-identity rule codified (consumed by Phase 2) → 1A/1B/1D |
| `items[]` | **Recommended** (changelog-confirmed) | Never sent by seed; never validated | Shape validation (per-line `product_id` required within the array) + rung 6 + seed emission → 1B/1D/1F |
| `payment_attempt_id` | R on payment_attempted; the honest denominator | **`payment_attempted` appears nowhere in the repo** (verified) | Taxonomy + docs + seed emission + rung 7 → 1A/1E/1F |
| `payment_method` | Rec on purchase/payment | Seed sends it; not validated | Observational → 1B |
| Coupon fields (`coupon_code`, `discount_amount`) | R on coupon events; O on purchase | Seed sends `coupon_applied` with `discount_amount` | Observational → 1B |
| Refund/cancellation (`refund_issued`, `order_cancelled`) | Tier 5: defined now, analytics deferred; refund amount positive-means-refund | Absent everywhere | Taxonomy + docs (data accumulates); **no analytics** → 1A/1E |

**Privacy / data quality:**

| Item | Contract | Current | Gap → branch |
|---|---|---|---|
| PII | Banned in any field (Principle 5); not a rejection layer | No enforcement; ipAddress/userAgent stored for drawer display only | Docs ban (1E); detection deferred (A4) |
| URL query strings | Banned on `page_viewed` (§5 Tier 3) | No page_viewed handling exists | Docs note (1E) |
| Raw IP/user-agent | Stored for event-drawer debugging; must never feed identity (standards §12) | Compliant | None — document the boundary (1E) |
| Unknown fields | "Always accepted"; registry observes (Phase 17) | Accepted (stored untouched) | None now; registry later |
| Malformed values / money | Layer 3: store as sent; exclude at metric layer with flags | Stored; analytics guards `quantity` only; money guards arrive with Phase 2 consumers | Validators classify now (1B); metric exclusion is Phase 2 |
| Negative money | Stored; excluded from GMV; "send refund_issued" hint | No GMV exists yet | Warning code only (1B); metric behavior Phase 2 |
| Payload size | ≤16KB properties (envelope, hard) | Implemented (L306) | None |
| JSON depth | Flat + items[] **by convention**; never a hard rejection | Plain-object check only | Observational depth/shape warning (1B) — no new hard rejects |
| Aliases | Accepted forever; read-time normalized; SDK emits canonical | Read-time `LOWER(name) IN (...)` in analytics; constants in `analytics/shared/aliases.ts` | Single-source inversion into contract module (1A, pending A3) |

## II.4 Hard vs Soft Validation Design

The contract's three layers (§7) map onto code as:

- **Hard (Layer 1, envelope) — unchanged in Phase 1.** Exactly today's rejections: malformed JSON, missing/invalid `name`/`customerId`/`sessionId`, non-object properties, >16KB properties, auth failures, rate limit. Phase 1 adds **zero** new hard rejections. The 0M ingestion modules already isolate these rules; 1C reuses them untouched.
- **Soft (Layer 2, contract conformance) — new, observational.** Pure validators classify each event against the taxonomy: missing contract-required fields, missing recommended fields, alias usage, deprecated forms (`customer_id`/`session_id` inside properties; dot-form names), unknown names (fine — noted, never warned as errors).
- **Value sanity (Layer 3) — new, observational.** Guarded checks that never block: unparseable money, negative amounts outside refunds, non-ISO currency shape, non-numeric quantity, nested non-items structures.

**Validation-result types (1A; server-owned, MIRRORed only if a web consumer appears):**

```ts
type ContractWarning = {
  code: ContractWarningCode;      // exactly the §11 taxonomy, e.g. "contract.missing_order_id"
  field?: string;                  // offending property path, e.g. "properties.amount"
  hint: string;                    // §11 tone: field → impact → fix; never scolds
};
type ContractCheckResult = {
  eventName: string;               // as stored (raw, case-preserved)
  canonicalName: string | null;    // resolved canonical, null when non-contract/custom
  aliasUsed: boolean;
  warnings: ContractWarning[];     // empty = fully conformant
};
```

- **Hard errors** stay what they are today: HTTP 400/401/403/413-semantics/429 with the existing `{ success:false, message }` envelope — untouched strings.
- **Normalized values:** none are *stored* — events persist byte-identical to today (Layer 2 "stored untouched"). Canonicalization is an in-memory classification only.
- **Stored metadata:** none in Phase 1 (no schema change; no quarantine; no registry). Warnings are computed per-request (1C) and per-analytics-window (1D), never persisted.
- **Response behavior (pending A1):** 201 success gains an additive `warnings: ContractWarning[]` key, **omitted entirely when empty** so existing consumers see byte-identical responses for conformant events. Duplicate (200) responses gain nothing.

## II.5 occurredAt Decision

**Phase 1 does not add `occurredAt`.** This is not a gap; it is the documented schedule:

- Contract §1 marks the field **"Optional *(Phase 11+)*"** — the one envelope field with an explicit phase tag.
- Platform roadmap Phase 11 implementation order, step 4: "occurredAt + skew clamp", motivated by SDK offline buffering (Phase 12).
- Blueprint Part 4: Phase 1 is "**Properties-only — no Prisma schema change**."

Consequences recorded now so Phase 11 inherits a decision, not a debate: the eventual field is a nullable `DateTime? occurredAt` beside `createdAt` (which remains authoritative receipt time and the analytics timestamp until a separate, explicitly-approved analytics migration); accepted format ISO-8601; bounds ±48h clamp with stored-and-flagged semantics (`value.clamped_timestamp` already exists in the §11 taxonomy); storage follows the existing naive-timestamp database-session convention; old events need no backfill (null = "not provided"); index implications are Phase 11's to measure against the 0D-5 baseline. **Analytics does not switch to occurredAt in Phase 11 by default** — that is a later, separate decision. No timestamp policy beyond the contract's text is invented here.

## II.6 Event Taxonomy and Aliases

- **Canonical names (1A encodes):** Tier 1 `product_viewed`, `add_to_cart`, `checkout_started`, `purchase_completed` · Tier 2 `payment_attempted`, `payment_completed`, `payment_failed` · Tier 3 `page_viewed`, `category_viewed`, `product_list_viewed`, `search_performed`, `cart_viewed`, `remove_from_cart`, `wishlist_added`, `wishlist_removed`, `coupon_applied`, `coupon_denied` · Tier 4 `item_out_of_stock`, `item_unavailable`, `delivery_fee_shown`, `eta_shown`, `order_delivered` · Tier 5 `refund_issued`, `order_cancelled`.
- **Accepted aliases** (contract §2 table — accepted forever, deprecated for new integrations): product_view/view_product/product_detail_viewed/product.opened · added_to_cart/cart_added/item_added_to_cart · start_checkout/checkout_initiated/begin_checkout · order_completed/checkout_completed/checkout.completed/order_placed.
- **Deprecated forms:** dot-form names; `customer_id`/`session_id` inside properties (superseded by envelope).
- **Custom events:** any other name is welcome, stored, counted in volume analytics, never warned as an error (Rung 0).
- **Reserved names** (encode as constants; docs warn against repurposing): `subscription_started/renewed/cancelled`, `customer_alias`; reserved fields `category_path[]`, `cart_id`, `seller_id`, `variant_id`/`sku` semantics.
- **Where canonicalization occurs:** **read-time only, forever** — the shipped behavior is contract-correct. Events are stored with raw, case-preserved names (verified: ingestion trims, never lowercases); analytics SQL normalizes via `LOWER(name) IN (aliases)`; the 1B classifier resolves canonical names in memory. **No write-time normalization** — it would violate "stored untouched" and destroy alias-usage observability (Health/registry need to *see* alias usage to nudge upgrades).
- **Single source (pending A3):** constants move to `apps/server/src/contract/taxonomy.ts`; `analytics/shared/aliases.ts` becomes a verbatim re-export shim (identical export names/values/order — SQL parameter lists provably unchanged, same discipline as 0D-3A's alias proof).

## II.7 Commerce Field Validation (all observational — Layer 2/3; no rejection cases beyond today's Layer 1)

| Field | Type check | Value check | Missing → warning (on events where contract-required) | Malformed → warning |
|---|---|---|---|---|
| `product_id` | non-empty string ≤120 after trim | — | `contract.missing_product_id` on product events | same code, field-noted |
| `product_name` | string | — | none (Rec — readiness only, 1D) | type-mismatch note |
| `category` | string | flat label (string, not array/object) | none (Rec) | type-mismatch note |
| `quantity` | number **or** numeric string (guarded regex — the shipped `^[0-9]+([.][0-9]+)?$` convention) | > 0 | none (Rec) | `value.unparseable_money`-family note (quantity variant hint) |
| `price` / `amount` / `cart_value` / `delivery_fee` / `discount_amount` | number or guarded numeric string | ≤2 decimal places; non-negative (exception: `refund_issued.amount` positive-means-refund) | `contract.missing_currency` when money present without currency; on purchases missing amount: readiness impact (rung 5) | `value.unparseable_money`; negative outside refunds: `value.negative_amount` with the "send refund_issued instead" hint |
| `currency` | string | `/^[A-Z]{3}$/` (ISO-4217 *shape*; unknown codes are **not** warned — no currency table shipped, no fabricated authority) | `contract.missing_currency` wherever any money field appears | shape-mismatch → `contract.missing_currency` variant hint |
| `order_id` | non-empty string | — | `contract.missing_order_id` on `purchase_completed` (and noted on payment/refund/cancel/deliver events that carry none) | — |
| `items[]` | array of plain objects | per line: `product_id` required; `price`/`quantity` guarded-numeric when present | none at event level (**Rec** — readiness rung 6) | per-line issues aggregated into one warning with counts |
| `payment_attempt_id` | non-empty string | — | on `payment_attempted`: contract-required warning; on other payment events: readiness note | — |
| `payment_method` | string | free-form (suggested enum documented, never enforced) | none | — |
| `coupon_code` | non-empty string | — | on `coupon_applied`/`coupon_denied`: contract-required warning | — |
| `reason` (failure/denial/removal) | string | suggested enums documented, free-form accepted | none | — |
| Refund/cancel fields | as purchase family | refund amount positive | `contract.missing_order_id` on refund/cancel | `value.negative_amount` semantics per contract |

Decimal rule: max 2dp, decimal major units (contract §3 Money). ISO currency: shape-only validation (see table — inventing a currency whitelist would be fabricated authority). **Hard rejection cases: none added.** Downstream metrics (GMV exclusion mechanics, per-currency aggregation) are **not implemented** — the codes exist so Phase 2 metric guards and Phase 4 Health rules consume one taxonomy.

## II.8 Money / Currency Behavior (Phase 1 posture)

Preserved verbatim from contract §3: decimal major units, ≤2dp, mandatory `currency` alongside any money field, **no implicit FX ever**, no fabricated or reconciled totals (`sum(items)` vs `amount` are both facts; neither is corrected), event-type semantics carry business meaning (a negative sale is a refund wearing the wrong event — hint, don't fix). **Phase 1 computes no money metric at all** — no GMV, no AOV, no revenue, no per-currency aggregation. 1B ships the guarded parsing + classification; Phase 2 is the first consumer.

## II.9 items[] Policy

- **Status: Recommended** (contract §5 + changelog) — its absence is a readiness gap (rung 6 locked), never a warning-as-error, never a rejection.
- **No silent truncation, ever:** the server never trims `items[]`. Over-16KB properties are rejected whole by the existing envelope cap (Layer 1, unchanged). The "top ~60 lines" guidance in the contract is **client-side advice** — documented in 1E as guidance for integrators, with "order_id + amount always take precedence over line completeness."
- **Complete validation (observational):** array-of-objects shape; per-line `product_id` presence; guarded numerics for `price`/`quantity`; line-level currency notes.
- **Capability implication when absent:** product/category *revenue* and confirmed units stay locked (rung 6); "Sessions that purchased" labeling remains (Phase 2 consumes this distinction).
- **No large-order infrastructure** — no side tables, no streaming parse, no item limits beyond the 16KB envelope.

## II.10 Idempotency and Event Identity

The shipped implementation is contract-correct — **reused, not rebuilt**: `Idempotency-Key` header takes precedence over the `idempotencyKey` body field; scope is per API key via the DB unique `(apiKeyId, idempotencyKey)`; duplicates return 200 `{ success:true, duplicate:true, event }` with the original; concurrent duplicates are absorbed via unique-violation handling. There is **no separate `eventId`** in the contract envelope — the idempotency key *is* event identity at the transport level, and `order_id` is business-fact identity at the metric level (contract §7 duplicates row). Phase 1 changes nothing here; 1E documents the SDK guidance ("UUID per event, preserved across retries" — §9) and the header-vs-body precedence. Backward compatibility: absolute (no code change).

## II.11 Privacy and Security Boundaries

- **PII:** documentation-first (A4). Docs state the ban (Principle 5) with examples; no detection code in Phase 1 (no contract error code exists for it).
- **customerId pseudonymity:** convention documented; shape validation already enforces limits; no format enforcement (merchant-issued pseudonyms are free-form).
- **Raw IP/user-agent:** remain stored for the event-drawer debugging display only; never feed analytics identity (standards §12; blueprint never-build). 1D/1B must not read them.
- **URL query strings:** docs ban on `page_viewed` examples (contract Tier 3 note).
- **Malicious JSON keys / prototype pollution:** properties flow `express.json()` → shape check → `JSON.stringify` → JSONB — no merging into live objects. 1B validators must keep it that way: iterate with `Object.keys`/`Object.entries`, no dynamic property assignment onto shared objects, treat `__proto__`/`constructor` as ordinary data keys.
- **Payload depth:** bounded in practice by the 16KB cap; 1B notes non-flat structures observationally; no new hard limit (flatness is convention, not envelope).
- **Invalid Unicode:** `express.json()` rejects malformed JSON already (Layer 1); control characters in envelope ids already rejected; property *values* may contain any valid JSON string — stored untouched.
- **Logging redaction:** validators and 1C wiring must never log property values or warnings containing merchant data (standards §11 "when not to log"); log counts, not contents.
- **API-key tenant scope:** untouched; every ingest writes under the key's own `userId`/`projectId` (verified); readiness queries (1D) go through `AnalyticsScope` like every other analytics read.

## II.12 Capability / Readiness Model (contract §8, encoded in 1A, computed in 1D)

Phase 1 implements **readiness detection only — no new metric calculations**. Per project + selected range:

| Rung | Capability | Required signal (computed from real events) | Unavailable/warning text pattern |
|---|---|---|---|
| 0 | Basic event analytics | any events | — (always on) |
| 1 | Funnel (events basis) | canonical/alias funnel names present | "Send product_viewed, add_to_cart, checkout_started, purchase_completed to light up the funnel." |
| 2 | Session analytics | envelope sessionId/customerId (always true for new events; legacy rows lack them) | existing honest empties already cover this |
| 3 | Product analytics | `product_id` on ≥1 product event | "Add product_id to product events to unlock Product Performance." |
| 4 | Order readiness | `order_id` on purchases | "Add order_id to purchase_completed to unlock exact order counts." (Phase 2 computes Orders) |
| 5 | GMV/AOV readiness | `amount` + `currency` on purchases | "Add amount + currency to unlock GMV and AOV." (Phase 2 computes them) |
| 6 | Product-revenue readiness | `items[]` on purchases | "Add items[] to unlock confirmed product purchases and units sold." |
| 7 | Payment readiness | `payment_attempt_id` present with payment events | "Send payment_attempted with payment_attempt_id to unlock failure rates." |
| 8 | Refund readiness | `refund_issued` convention observed | "Send refund_issued to accumulate refund history." (analytics deferred — Tier 5) |

Recommended-field percentages (e.g. "% of purchases carrying order_id") are computed only where one cheap scoped query answers them; the full weighted Health *grading* of contract §10 is **Phase 4** (I3 rules) and is not built here.

## II.13 Phase 1 Branch Sequence

The suggested 1A–1G structure was evaluated and **compressed to six branches**: "validation result types" belong with the definitions (one module, one review); "response warnings + backward compatibility" is one wiring branch, not two; docs and seed stay separate (different validation styles). Batch and SDK are excluded (rulings above). Dependencies drive the order; 1C additionally depends on 0M's `refactor/ingestion-module`.

| # | Branch | Goal | Depends on |
|---|---|---|---|
| 1A | `feature/contract-module` | Machine-readable contract: taxonomy, tiers, aliases (single-source inversion per A3), reserved names, money-rule constants, warning-code taxonomy, `ContractWarning`/`ContractCheckResult` types, order-identity rule constants | 0M complete; A3 approved |
| 1B | `feature/contract-validators` | Pure observational validators per §II.7 (event classifier, per-event field checks, guarded money/quantity parsing, items[] shape) — exported functions, no consumers wired | 1A |
| 1C | `feature/ingest-contract-warnings` | Wire the classifier into ingestion: additive omit-when-clean `warnings[]` on 201 responses; zero Layer-1 changes | 1B + 0M ingestion module + **A1 approved** |
| 1D | `feature/tracking-readiness` | Rung detection per §II.12, surfaced as additive fields on the existing analytics Health payload (server + web MIRROR types + card lines) | 1B + **A2 approved** |
| 1E | `docs/contract-conventions` | DocsOverview teaches the unlock ladder: payment_attempted (currently absent from docs), order_id/amount/currency, items[] + truncation guidance, refund/cancel conventions, PII ban, idempotency SDK guidance, alias deprecation | 1A (content source) |
| 1F | `feature/seed-contract-alignment` | Demo seed exercises the ladder: purchases gain `items[]`; `payment_attempted` precedes payment outcomes with shared `payment_attempt_id`; refund trickle for rung-8 demoability; deterministic as before | 1A; after 1D so readiness is demoable |

**Per-branch detail:**

**1A `feature/contract-module`** — Files: new `apps/server/src/contract/` (`taxonomy.ts`, `moneyRules.ts`, `warningCodes.ts`, `types.ts`, `orderIdentity.ts` — constants + doc comments citing contract sections); `analytics/shared/aliases.ts` becomes a re-export shim. Schema/API impact: none. Steps: encode §2/§3/§5/§11 tables; move alias constants with element-identical proof (0D-3A discipline); shim re-exports. Edge cases: alias order preservation (SQL parameter lists must not reorder — shopper vs session purchase-alias orderings differ deliberately). Validation: typecheck/build; grep proof that analytics modules' imports resolve unchanged; **analytics response-diff spot-check** (one scope, all five tabs, before/after — byte-identical). Acceptance: single alias source; contract tables represented; zero behavior change. Commit: `feat: add commerce tracking contract module as single alias source`.

**1B `feature/contract-validators`** — Files: `contract/validate.ts` (+ colocated pure helpers). Schema/API impact: none (nothing wired). Steps: classifier (raw name → canonical/alias/custom), per-event required/recommended checks per §II.7, guarded money parse (extract the shipped regex convention into the contract module), items[] shape walk, §11 hint copy. Edge cases: null values = absent (contract §7); mixed-case names classify via lowercase comparison; deprecated in-properties `customer_id`/`session_id`; `refund_issued` positive-amount semantics; events with money but no currency; unknown names produce **zero** warnings. Validation: typecheck/build + a fixture-driven verification script run via `tsx` and pasted into the PR (deleted before commit — Phase 9 owns real tests; per standards, this is a documented manual verification). Acceptance: every §II.7 row demonstrably classified on fixtures; no I/O in the module. Commit: `feat: add observational contract validators and money parsing`.

**1C `feature/ingest-contract-warnings`** — Files: `event.controller.ts` (small), `src/ingestion/` (call site), no route changes. API impact: **additive** `warnings` key on 201 when non-empty; 200-duplicate and all error responses byte-identical; conformant-event 201s byte-identical (key omitted). Steps: classify after validation/insert decision (never affecting control flow), attach warnings, redact-safe (no property values echoed beyond field *names*). Edge cases: classifier throw must never fail ingestion (same never-throws posture as alert evaluation — wrap and drop); duplicate path skips classification. Validation matrix: conformant purchase → 201 no `warnings` key (byte-diff vs pre-branch) · purchase missing order_id → `contract.missing_order_id` · money without currency → `contract.missing_currency` · negative amount → `value.negative_amount` with refund hint · alias name → `contract.alias_event_name` · custom name → no warnings · all Layer-1 rejections byte-identical · duplicate replay byte-identical. Acceptance: matrix green; zero rejection-behavior diffs. Commit: `feat: surface contract warnings in ingestion responses`.

**1D `feature/tracking-readiness`** — Files: server: one readiness module beside analytics composition (scoped queries via `AnalyticsScope` — likely 1–2 cheap aggregate statements reusing existing alias constants), additive fields on the Overview/Health payload; web: `analytics-types.ts` MIRROR + Health card renders rung lines with unlock copy. Schema impact: none. API impact: additive response fields only. Steps: rung-detection SQL (one FILTER-style aggregate over the current scope), compose into health, render. Edge cases: empty scope (all rungs locked, honest copy); legacy rows without sessionId; all-projects scope (readiness is per the scoped window, labeled). Validation: typecheck/build/lint; response-diff shows only additive keys; seeded-data spot-checks per rung; **0D-5 small-tier bench smoke** (this branch adds analytics-path statements — record the delta honestly). Acceptance: rungs 1/3/4/5/6/7 detectable on seed data; no metric values computed; unlock copy matches §II.12 patterns; no-AI wording. Commit: `feat: report tracking readiness in analytics health`.

**1E `docs/contract-conventions`** — Files: `DocsOverview.tsx` (content only). Steps: unlock-ladder narrative (teach the ladder, not the reference — contract §12); add `payment_attempted` example with `payment_attempt_id`; purchase example gains `items[]` (+ truncation guidance verbatim-faithful to contract §5 note); refund/cancel conventions; PII ban + no-URL-query-strings note; idempotency/SDK-retry guidance; alias deprecation ("keep working forever; new integrations use canonical"). Edge cases: docs display of base URL uses the shared constant (post-0M). Validation: typecheck/build/lint; visual review at ~375px; copy sweep (GMV-not-revenue, near-real-time, no AI wording). Acceptance: every Part 4 table row appears; examples parse as valid JSON; ladder framing present. Commit: `docs: teach the commerce tracking contract unlock ladder`.

**1F `feature/seed-contract-alignment`** — Files: `scripts/seedCommerceDemoData.ts` only. Steps: purchase/payment context gains `items[]` built from the journey's product picks (line shape per contract §3); `payment_attempted` emitted before each payment outcome sharing `payment_attempt_id`; small deterministic `refund_issued` trickle; keep RNG determinism and guards. Edge cases: keep double-emission of `purchase_completed` + `payment_completed` (blueprint-documented reality that order-dedup must handle); some purchases deliberately omit `items[]` (readiness must show partial adoption honestly). Validation: reseed dev DB; analytics tabs render; readiness card (1D) shows rungs unlocked; funnel/product numbers remain plausible; determinism double-run check on counts. **Note:** dev-seed changes never touch the 0D-5 bench dataset (separate seeder, separate DB). Acceptance: rungs 3–7 demoable; deterministic. Commit: `feat: align demo seed with commerce tracking contract`.

## II.14 Temporary Verification Strategy (pre-Phase 9 — explicitly not a substitute for automated tests)

Until Platform Phase 9 lands, every Phase 1 branch verifies via: **direct validation matrices** (the per-branch curl/fixture tables above, results pasted into PRs) · **API fixtures** (a small set of contract-conformant and deliberately-broken event payloads kept as an uncommitted local file, reused across 1B/1C/1F) · **migration verification** — n/a (no migrations in Phase 1; its absence is itself an acceptance check: `prisma/migrations/` untouched) · **idempotency checks** (duplicate replay before/after 1C — byte-identical) · **database inspections** (stored `properties` for a warned event are byte-identical to what was sent — Layer 2 "stored untouched" proof) · **seeded scenarios** (1F ladder demo) · **backward-compatibility checks** (pre-branch response captures diffed against post-branch for conformant traffic on every wiring branch). Every PR reports honestly what was runtime-verified vs inspection-only (standards §18.7). These matrices become Phase 9's first test cases; they do not replace them.

## II.15 Phase 1 Completion Criteria

1. The contract is represented in code: one `contract/` module encodes taxonomy, tiers, aliases, reserved names, money rules, and the §11 warning-code taxonomy, with contract-section citations.
2. Hard vs soft validation are distinct in code and behavior: Layer-1 rejections byte-identical to pre-Phase-1; all contract findings are warnings/readiness, never rejections.
3. occurredAt: **correctly absent** (deferred to Phase 11 per contract §1) — no schema diff exists.
4. Commerce properties are validated observationally per §II.7 on fixtures and live ingest (if A1 approved).
5. No silent items[] truncation exists anywhere; client-side guidance documented.
6. Idempotency behavior verified unchanged (duplicate matrix byte-identical).
7. Aliases have exactly one source (contract module) with analytics behavior provably unchanged.
8. Tracking readiness (rung detection) is exposed per §II.12 (if A2 approved) with honest unlock copy.
9. Docs teach the ladder incl. payment_attempted, items[], refund conventions, PII ban.
10. Backward compatibility preserved: no removed/renamed response fields; conformant-event responses byte-identical; nothing that ingested before Phase 1 fails after it.
11. **No Phase 2 metrics added** — grep-level proof: no GMV/AOV/order-count computation anywhere in the diff set.
12. Every branch merged with typecheck/build/lint/`git diff --check` green and honest verification reports.

## II.16 Phase 1 Stop Conditions (explicitly excluded)

GMV · Orders · AOV · product revenue · payments dashboards · refunds dashboards · retention/cohorts · SDK (incl. batching/retries/sessions helpers — Phase 12) · batch endpoint/quarantine/occurredAt (Phase 11) · async processing (10A) · rollups (13) · alert delivery work (14) · Shopify/WooCommerce integrations · billing · identity merge (`customer_alias`) · schema registry/enforcement modes (17) · any Prisma migration. A Phase 1 branch proposing any of these is out of scope by definition.

## II.17 Complete Codex Prompts — Phase 1 (Codex 5.6 Sol Ultra)

**Prompt 1A — `feature/contract-module`**

> EventPulse repository, `apps/server` (Express + Prisma 7 + TypeScript). Phase 0M is fully merged (lint gates; ingestion modules exist under `src/ingestion/`). Implement **Phase 1A only**: the Commerce Tracking Contract module. Clean tree confirmed; the human owner creates branch `feature/contract-module` — never create/switch branches yourself. Approval A3 (alias single-source inversion) has been granted by the user; confirm this in your report header.
>
> **Read first, edit second:** `~/.claude/plans/commerce-tracking-contract.md` §§1–3, 5, 6, 11 (authoritative), `~/.claude/plans/phase-0m-and-phase-1-implementation-workflow.md` (Part II §§II.4, II.6, II.13 row 1A), `apps/server/src/analytics/shared/aliases.ts` (every export, exact element order), all analytics modules' imports of it, `~/.claude/plans/eventpulse-engineering-quality-standards.md` §§4–6, 9, 14, 18.
>
> **Scope — exactly this:** (1) Create `apps/server/src/contract/` containing: `taxonomy.ts` — canonical event names by tier, accepted aliases (§2 table), deprecated forms, reserved names/fields, **plus the alias constants moved verbatim from `analytics/shared/aliases.ts`** preserving every export name, element, and element order; `moneyRules.ts` — decimal-major-unit constants, 2dp rule, currency shape regex, positive-refund semantics (constants + doc comments, no logic); `warningCodes.ts` — exactly the §11 taxonomy as a string-literal union + constants; `types.ts` — `ContractWarning`, `ContractCheckResult` per the workflow §II.4; `orderIdentity.ts` — order-identity rule constants (order_id = dedup key; session-fallback labeling flag semantics) as documented values for Phase 2 to consume, **no metric code**. Cite contract sections in doc comments. (2) Convert `analytics/shared/aliases.ts` to a pure re-export of the moved constants — identical public surface; no analytics module import lines change. (3) Nothing else: no validators (1B), no wiring, no schema, no frontend, no docs.
>
> **Validation (run, report actual output):** `bun run typecheck` · `bun run build` · `git diff --check` · `git status`. Paste a side-by-side proof that every alias array is element-identical and identically ordered pre/post (the shopper-summary vs session-funnel purchase orderings differ deliberately — preserve both). Then, with the dev server + seeded data, capture all five analytics tab responses for one scope (all-projects, 30d) before and after — diff must be empty. Report runtime-verified vs inspected. **Do not commit** — propose `feat: add commerce tracking contract module as single alias source` and stop.

**Prompt 1B — `feature/contract-validators`**

> EventPulse repository, `apps/server`. Phase 1A is merged. Implement **Phase 1B only**: pure observational contract validators. Human owner creates `feature/contract-validators`. This branch wires **nothing** — exported pure functions only.
>
> **Read first:** contract §§5, 7 (validation philosophy — Layer 2/3 never reject), 11 (hint tone: field → impact → fix, never scold); workflow Part II §§II.4, II.7–II.9, II.13 row 1B; `apps/server/src/contract/` (1A output); the guarded-numeric regex convention in `analytics/productPerformance.ts` (mirror its semantics in the contract module — do not modify that file).
>
> **Scope — exactly this:** `apps/server/src/contract/validate.ts` (+ colocated pure helpers) exporting a classifier: raw event `{ name, properties }` → `ContractCheckResult`. Behavior per workflow §II.7 exactly: canonical/alias/custom resolution (lowercase comparison; store nothing); contract-required checks (`order_id` on purchases, `product_id` on product events, `payment_attempt_id` on payment_attempted, `coupon_code` on coupon events, `currency` wherever money appears); guarded money/quantity parsing (2dp, non-negative except positive-refund); `items[]` per-line shape with aggregated counts; deprecated in-properties `customer_id`/`session_id`; null = absent; unknown names and missing *recommended* fields produce **zero warnings**; every warning uses a §11 code + a hint in the contract's tone. Iterate keys safely (`Object.entries`; treat `__proto__`/`constructor` as data; never assign dynamically onto shared objects). No I/O, no Express, no prisma, no logging.
>
> **Validation:** typecheck · build · `git diff --check`. Write a temporary `tsx` fixture-runner covering every §II.7 row plus: conformant Tier-1 set, purchase missing order_id, money sans currency, `-50` amount on purchase vs on refund_issued, `"1,299"` amount, alias + dot-form names, items[] with a bad line, deprecated ids in properties, unknown custom event (expect clean). Paste the fixture table + outputs into your report, then **delete the runner** (uncommitted; Phase 9 owns real tests — state this honestly). **Do not commit** — propose `feat: add observational contract validators and money parsing` and stop.

**Prompt 1C — `feature/ingest-contract-warnings`**

> EventPulse repository, `apps/server`. Phases 1A–1B merged; 0M's `src/ingestion/` modules exist. **Approval A1 (additive single-event response warnings) has been granted**; confirm in your report. Implement **Phase 1C only**: surface contract warnings in ingestion responses. Human owner creates `feature/ingest-contract-warnings`.
>
> **Read first:** contract §7 (Layer 1 unchanged — hard rejections are frozen), §11; workflow §II.4 (response behavior), §II.13 row 1C; `src/controllers/event.controller.ts` + `src/ingestion/` in full; standards §10 (additive-only API changes), §11 (redaction).
>
> **Scope — exactly this:** after the event is accepted (post-validation, around the insert path), classify via `contract/validate.ts` and, when warnings are non-empty, add `warnings` to the **201 response only** — key omitted entirely when clean, so conformant responses stay byte-identical. Duplicate 200s and every error path: byte-identical. Classification is wrapped so a thrown error can never affect ingestion (same never-throws posture as `evaluateAlertsForEvent`); on classifier failure, respond exactly as today. Warnings must not echo property *values* (field names + hints only). No Layer-1 changes, no stored metadata, no schema, no message-string edits, no batch, no occurredAt.
>
> **Validation (curl matrix, before/after captures, paste diffs):** conformant purchase (byte-identical 201, no `warnings` key) · purchase missing order_id (`contract.missing_order_id`) · amount without currency (`contract.missing_currency`) · `-50` amount (`value.negative_amount` + refund hint) · `"1,299"` amount (`value.unparseable_money`) · alias name (`contract.alias_event_name`) · custom event (clean) · every Layer-1 rejection byte-identical · duplicate replay byte-identical · DB check: stored `properties` byte-identical to what was sent for a warned event. `bun run typecheck` · `bun run build` · `git diff --check`. **Do not commit** — propose `feat: surface contract warnings in ingestion responses` and stop.

**Prompt 1D — `feature/tracking-readiness`**

> EventPulse repository (server + web). Phases 1A–1C merged. **Approval A2 (minimal rung-detection scope) granted**; confirm in your report. Implement **Phase 1D only**: tracking readiness in analytics health. Human owner creates `feature/tracking-readiness`. **`apps/web` is Next.js — read `AGENTS.md` and the relevant guide under `node_modules/next/dist/docs/` before frontend edits.**
>
> **Read first:** contract §8 (the ladder — your copy source), §10 (what you are NOT building: grades/scoring are Phase 4); workflow §II.12, §II.13 row 1D; `apps/server/src/analytics/summary.ts`, `analyticsScope.ts`, `healthInsights.ts` (consume patterns; modify minimally), `apps/web/components/dashboard/analytics/analytics-types.ts` + the Health card; standards §6 (scope rules, null-not-zero, no-AI wording), §4 (MIRROR).
>
> **Scope — exactly this:** (1) server: a readiness module computing rung detection per workflow §II.12 using `AnalyticsScope` and the contract module's aliases — prefer **one** FILTER-style aggregate statement; expose additive fields on the Overview/Health tab payload (existing keys untouched); MIRROR comments. (2) web: mirror types; Health card gains readiness lines with the §II.12 unlock copy (text + non-color status; honest empties; no "AI" wording; "GMV" not "Revenue"). **No metric values** — presence/percentages of fields only, and only where one cheap query answers them. No new tabs/endpoints/schema.
>
> **Validation:** typecheck · build · lint · `git diff --check` · response diff for Overview tab shows only additive keys (paste) · seeded-data checks: rung 4/5 unlocked (seed purchases carry order_id/amount), rung 6 locked until 1F, rung 7 locked (no payment_attempted yet) — these expected states are themselves the test · ~375px render check · run the 0D-5 small-tier bench smoke if available and report the Overview delta honestly. **Do not commit** — propose `feat: report tracking readiness in analytics health` and stop.

**Prompt 1E — `docs/contract-conventions`**

> EventPulse repository, `apps/web` — **read `AGENTS.md` first** (Next.js differs from your training data). Phases 1A–1D merged. Implement **Phase 1E only**: contract documentation. Human owner creates `docs/contract-conventions`.
>
> **Read first:** contract §§2, 3, 5, 8, 12 (documentation philosophy: teach the ladder), blueprint Part 4; workflow §II.13 row 1E; `apps/web/components/dashboard/docs/DocsOverview.tsx` in full.
>
> **Scope — content changes in `DocsOverview.tsx` only:** restructure the commerce section around the unlock ladder ("send these 4 events → funnels; add order_id → exact orders; add amount+currency → GMV-ready; add items[] → product revenue-ready; add payment_attempt_id → failure rates"); add a `payment_attempted` example (payment_attempt_id + payment_method) — it is currently absent; extend the purchase example with `items[]` and the client-side truncation guidance ("very large orders may truncate items[]; order_id + amount always take precedence"); add refund_issued/order_cancelled conventions (positive amount means refund); document the PII ban with examples of what never to send, the no-URL-query-strings rule, pseudonymous customerId, idempotency guidance (UUID per event, header precedence, retries safe), and alias deprecation ("existing names keep working forever; new integrations use canonical names"). Copy rules: merchant language, "GMV" never "Revenue", "near-real-time", no AI wording, valid JSON in every example, no fabricated response examples — mirror real API behavior incl. `warnings` (1C).
>
> **Validation:** typecheck · build · lint · `git diff --check` · visual review desktop + ~375px · every JSON example parses (paste a quick node/tsx check) · confirm examples' field names match the contract §5 tables exactly. **Do not commit** — propose `docs: teach the commerce tracking contract unlock ladder` and stop.

**Prompt 1F — `feature/seed-contract-alignment`**

> EventPulse repository, `apps/server`. Phases 1A–1E merged. Implement **Phase 1F only**: seed alignment. Human owner creates `feature/seed-contract-alignment`.
>
> **Read first:** contract §§3, 5 (items[] line shape; payment_attempt_id semantics; refund conventions); blueprint Part 4 deliverables; workflow §II.13 row 1F; `apps/server/scripts/seedCommerceDemoData.ts` in full (RNG determinism, journey builder, guards — all preserved).
>
> **Scope — `scripts/seedCommerceDemoData.ts` only:** (1) purchase-family events gain `items[]` built deterministically from the journey's product context (line shape `{ product_id, product_name, category, price, quantity }`); leave a deterministic minority of purchases without `items[]` so partial adoption is demoable. (2) Emit `payment_attempted` (with `payment_attempt_id`, `payment_method`) before each payment outcome; `payment_completed`/`payment_failed` carry the same `payment_attempt_id`. (3) Keep the existing double-emission of `purchase_completed` + `payment_completed` with a shared `order_id` (documented reality that Phase 2's dedup must handle — do not "fix" it). (4) A small deterministic `refund_issued` trickle (positive amount, order_id from a prior purchase). Preserve: LCG seed usage, journey weights, guard rails (`NODE_ENV`, `SEED_USER_EMAIL`, `CONFIRM_RESET_COMMERCE_DEMO`), summary output (extend counts for new events). Touch nothing outside this script.
>
> **Validation:** typecheck · build · `git diff --check` · run the seed against the dev DB (with the guards satisfied) and paste the summary · reseed twice → identical event counts per name · load analytics: funnels/products render plausibly; readiness card shows rungs 3–7 unlocked and rung 6 partial · confirm the 0D-5 benchmark dataset is untouched (different seeder, different DB — state this). **Do not commit** — propose `feat: align demo seed with commerce tracking contract` and stop.

---
---

# Final Sections

## Dependency Graph

```
0D-5 (separate plan; baseline committed)
  │
  ▼
0M-1 chore/lint-zero ──► 0M-2 chore/remove-dead-demo ──► 0M-3 refactor/frontend-fetch
                                                              │
                                   0M-4 chore/env-fail-fast ◄─┘   (3→4 ordering is convenience, not dependency)
                                                              │
                                          0M-5 refactor/ingestion-module   ◄── hard prerequisite for 1C
  │
  ▼
1A feature/contract-module (A3) ──► 1B feature/contract-validators ──┬─► 1C feature/ingest-contract-warnings (A1, needs 0M-5)
                                                                     └─► 1D feature/tracking-readiness (A2)
1A ──► 1E docs/contract-conventions (content also reflects 1C's response shape)
1A + 1D ──► 1F feature/seed-contract-alignment
  │
  ▼
Phase 2 — GMV & Orders MVP (consumes orderIdentity, money rules, warning codes, readiness rungs)
```

## Recommended Execution Order

**0D-5** (its own three branches) → **0M:** lint-zero → remove-dead-demo → frontend-fetch → env-fail-fast → ingestion-module → **user approvals A1–A4** → **Phase 1:** 1A → 1B → 1C → 1D → 1E → 1F → **Phase 2**.

## Branch and Commit Summary

| Phase | Branch | Commit message |
|---|---|---|
| 0M-1 | `chore/lint-zero` | `chore: fix all pre-existing lint errors so lint can gate` |
| 0M-2 | `chore/remove-dead-demo` | `chore: remove unrendered demo components and dead data files` |
| 0M-3 | `refactor/frontend-fetch` | `refactor: consolidate frontend fetch and auth plumbing` |
| 0M-4 | `chore/env-fail-fast` | `chore: fail fast on missing required environment variables` |
| 0M-5 | `refactor/ingestion-module` | `refactor: extract ingestion domain modules from event controller` |
| 1A | `feature/contract-module` | `feat: add commerce tracking contract module as single alias source` |
| 1B | `feature/contract-validators` | `feat: add observational contract validators and money parsing` |
| 1C | `feature/ingest-contract-warnings` | `feat: surface contract warnings in ingestion responses` |
| 1D | `feature/tracking-readiness` | `feat: report tracking readiness in analytics health` |
| 1E | `docs/contract-conventions` | `docs: teach the commerce tracking contract unlock ladder` |
| 1F | `feature/seed-contract-alignment` | `feat: align demo seed with commerce tracking contract` |

## Codex Model Guidance

- **Codex 5.6 Sol Ultra (required):** 0M-5 (behavior-preserving extraction of the ingestion hot path), 1A (alias inversion with SQL-equivalence stakes), 1B (contract-semantics fidelity), 1C (response-compatibility stakes), 1D (cross-stack + scope rules).
- **Sol Ultra recommended, mid-tier acceptable:** 0M-1 (hook restructuring subtlety says Ultra; budget may say otherwise), 0M-3 (many files, mechanical pattern).
- **Mid-tier acceptable:** 0M-2, 0M-4, 1E, 1F (mechanical/content work with strong validation gates).
- All prompts assume: clean tree confirmed, human-owned branching/commits, honest runtime-vs-inspection reporting (standards §18).

## Cross-Phase Risks

| Risk | Mitigation |
|---|---|
| 0M-5 extraction subtly reorders ingestion validation (different 400 fires first) | Exact-order requirement in scope; byte-diffed curl matrix pre/post |
| 0M-5 vs roadmap Phase 11's "validator extraction behind Phase 9 tests" | Acknowledged tension: 0M does the smaller reviewability cut with manual matrices; Phase 11 still owns the batch-oriented refactor, later, behind tests |
| 1A alias inversion changes SQL parameter order | Element-identical side-by-side proof + five-tab response diff (0D-3A discipline) |
| 1C `warnings` key breaks a consumer | Additive + omit-when-clean; the only consumer is our frontend, which ignores unknown keys; byte-identical for conformant traffic |
| 1D adds analytics-path query cost after 0D-5 froze the baseline | One cheap aggregate; small-tier bench smoke reported in the PR; if material, the finding goes to the register — the baseline of record is re-cut only per 0D-5 §18 rules |
| Seed changes (1F) alter dev-DB analytics numbers mid-Phase-1 | Sequenced last; bench DB unaffected (separate seeder/database); reseed is deterministic |
| Ambiguities A1–A4 assumed approved by an implementer | Every affected prompt requires confirming the approval in its report header; no approval → branch does not start |
| Scope creep toward Phase 2 metrics ("we have amount, why not sum it?") | §II.16 stop list + completion criterion 11 (grep-level proof of no GMV/AOV/order-count code) |
| Contract drift between module and spec | 1A doc comments cite contract sections; contract §14: divergence is a bug in the module, never the spec |

## Final Definition of Done

**Phase 0M:** five branches merged per §I.4 acceptance; lint = 0 and gating; dead demo gone (grep-proof); one fetch/auth path; env fail-fast; ingestion modules extracted with a byte-identical curl matrix; debt register updated (fixed items marked, Defers annotated); analytics untouched; no schema/API/visual diffs anywhere.

**Phase 1:** all twelve criteria of §II.15 hold; approvals A1–A4 resolved and recorded; every branch's validation matrix pasted in its PR with honest runtime-vs-inspection reporting; no Prisma migration exists in the diff range; Phase 2 can start by *consuming* `contract/orderIdentity.ts`, money rules, warning codes, and readiness rungs without touching Phase 1 code.

---
*Prepared read-only at commit `5d2faa7` (main, clean tree). No source files were modified; no permanent planning or specification documents were modified; this workflow file is the only artifact created.*
