# EventPulse — Project Context

**Purpose of this file:** orientation for Claude Code (or any contributor) opening this repository fresh, on any machine. It summarizes state and points to the authoritative documents in `.claude/plans/` — it does not restate their content and is not itself authoritative on anything it summarizes. On any conflict between this file and a document in `.claude/plans/`, the plan document wins; update this file to match, not the reverse.

---

## What EventPulse is

EventPulse is a production-style **commerce analytics SaaS** for ecommerce and quick-commerce stores. A store sends commerce events (product views, add-to-cart, checkout, purchase, payment, friction events) via an ingestion API; EventPulse turns them into funnels, product/category performance, shopper behavior, and (as tracking matures) GMV/Orders/AOV.

**Stack:** Next.js + React + TypeScript + Tailwind (frontend) · Node.js + Express + TypeScript + Prisma + PostgreSQL (backend) · Bun + Turborepo (monorepo).

**The product's core bet:** trustworthy analytics over feature count. Every architectural decision — append-only events, null-not-zero, no fabricated metrics/FX conversion, progressive tracking capability, benchmark-before-optimize — exists to make sure a merchant never has to second-guess a number. Full reasoning: `.claude/plans/eventpulse-system-architecture-book.md`.

## Phases complete

- **0A, 0B, 0C** — analytics IA consolidation, card merges, KPI row v1 (pre-dates this document set; assumed complete per the roadmap).
- **0D-1, 0D-2, 0D-3** — custom date range, shared `AnalyticsScope`, analytics query-module decomposition (thin controller + focused domain modules).
- **0D-4** — per-tab lazy loading of analytics (tab-scoped endpoint, per-scope frontend cache).
- **0D-5 (A/B/C)** — deterministic benchmark dataset, HTTP benchmark runner, EXPLAIN harness + committed performance baseline.
- **0M-1** — `chore/lint-zero`: all pre-existing ESLint problems fixed; lint now gates.
- **0M-2** — `chore/remove-dead-demo`: 13 verified-dead demo components/data files removed (12 original + `MetricCard.tsx`, found dead during implementation and confirmed with the user before removal).
- **0M-3** — `refactor/frontend-fetch`: frontend `API_BASE`/auth-header duplication consolidated behind `apps/web/lib/api.ts` (`getAuthHeaders()`, `getJsonAuthHeaders()`). `ApiKeysOverview.tsx`'s local `getAuthHeaders` was deliberately left untouched — it has a distinct throw-on-signed-out behavior that a shared, non-throwing helper would have silently changed.

## What's next

Per `.claude/plans/phase-0m-and-phase-1-implementation-workflow.md` §I.4, branch order is **1 → 2 → 3 → 5 → 4**:

1. **Next: Phase 0M branch 5 — `chore/env-fail-fast`.** `config/env.ts` fails fast on missing required vars (`DATABASE_URL`, `JWT_SECRET`).
2. **Then: Phase 0M branch 4 — `refactor/ingestion-module`.** Extracts pure logic from the 522-line `event.controller.ts` into `apps/server/src/ingestion/`. This is a **hard prerequisite** for Phase 1 branch 1C — it lands last in 0M specifically so Phase 1 doesn't have to edit an unreviewable controller.
3. **Then: Phase 1 (Commerce Tracking Contract).** Branches 1A–1F per `.claude/plans/phase-0m-and-phase-1-implementation-workflow.md` Part II. Four approvals are gating (A1: response `warnings[]`, A2: readiness scope, A3: alias single-source inversion, A4: PII-detection deferral) — check whether these have been resolved before starting 1C/1D.
4. **Then: Phase 2 (GMV & Orders MVP).** Branches 2A–2E per `.claude/plans/phase-2-gmv-orders-implementation-workflow.md`. Note: as of that document's authoring, two order-semantics decisions were flagged as needing explicit confirmation before 2A starts (whether `payment_completed` alone should mint a confirmed order; whether the session-approximate basis should ever show GMV) — check the document's "Pending user decisions" section for resolution status.

## Current implementation rules (binding)

Full text: `.claude/plans/eventpulse-engineering-quality-standards.md`. Load-bearing points:

- **Tenant scoping is per-query and centralized.** Analytics reads go through the single `AnalyticsScope` authority; no query invents its own ownership filter.
- **Thin controllers, domain-owned logic.** New pure logic (validators, builders, metric formulas) lives in testable modules, not inline in controllers.
- **No `any`; unknown + narrow at trust boundaries.** Null (unavailable) is never confused with zero (measured zero).
- **No premature abstraction.** Second duplication is a signal; the third is a refactor. A shared primitive needs three real consumers.
- **Behavior-preserving refactors are verified, not assumed.** Response-diff / byte-identical proofs for anything claiming "no behavior change."
- **Agents never commit, branch, or push without explicit instruction.** Confirm a clean tree and current branch before editing; never `git add .`; report validation results honestly, including what was only inspected vs. runtime-verified.
- **No automated tests exist yet** (Platform Phase 9 is scheduled, not started). Validation until then is: typecheck + build + lint (gating since 0M-1) + `git diff --check` + documented manual/API verification matrices per branch.
- **No secrets in the repo.** Only `.env.example` files are tracked; real credentials are never committed.

## Which planning documents are authoritative

All now live in `.claude/plans/`. Ownership axis (from the architecture book §23 — each document owns one axis; none duplicate another):

| Document | Owns |
|---|---|
| `eventpulse-system-architecture-book.md` | **Canonical handbook.** *Why* the system is shaped as it is — principles, layer responsibilities, 22 Architecture Decision Records, glossary. Read this first. |
| `product-performance-analytics-design-cozy-book.md` | The analytics blueprint — *what* analytics exist, metric definitions, dashboard IA, the Phase 0–8 roadmap. |
| `commerce-tracking-contract.md` | The Commerce Tracking Contract — *what* merchants send: event taxonomy, property reference, money rules, validation layers, capability ladder. |
| `eventpulse-engineering-quality-standards.md` | *How* code is written/reviewed/shipped. |
| `platform-roadmap-post-analytics.md` | Platform Phases 9–17 (tests/CI, async pipeline, observability, batch ingestion, SDK, rollups, RBAC, schema registry) and their recommended order. |
| `analytics-query-modules-phase-0d3.md`, `analytics-tab-lazy-loading-phase-0d4.md`, `analytics-query-performance-phase-0d5.md` | Completed-phase design docs (0D-3, 0D-4, 0D-5) — historical record of what was built and why. |
| `phase-0m-and-phase-1-implementation-workflow.md` | Active implementation workflow: Phase 0M branch plans (with verified candidate evidence) + Phase 1 branch plans (1A–1F) + Codex handoff prompts. |
| `phase-2-gmv-orders-implementation-workflow.md` | Phase 2 implementation workflow: GMV/Orders/AOV metric definitions, branch plans (2A–2E), Codex handoff prompts. |
| `indexed-tickling-matsumoto.md` | A completed, historical plan (header search/project/time-range wiring into page data) from an earlier session, predating the descriptive-filename convention used above. Kept for reference; not part of the active phase sequence. |

**Reading order for a new engineer:** architecture book → blueprint → contract → standards → architecture book again (layer sections) → roadmap → the specific workflow document for whatever phase is active. (Full rationale: architecture book §22.)

## How work should be validated

Until Platform Phase 9 (automated tests/CI) lands, every change is validated the same way:

```
bun run typecheck
bun run build
bun run lint          # gates since 0M-1 — must stay at 0 problems
git diff --check
git status            # confirm only intended files changed
```

Plus, per-branch: the manual/API verification matrix specified in that branch's section of the relevant workflow document (e.g., an ingest curl matrix, a response byte-diff before/after, a browser network-panel comparison). Every report states plainly what was **runtime-verified** vs. **inspection-only** — never claim verification that didn't happen.

**Branching/commit discipline:** the human owner creates and switches branches and makes all commits/merges/pushes. An agent's job ends at "changes ready for review" — propose a commit message, list validation results, and stop.
