# Plan: Wire header Search / Project / Time-range into page data

## Context

The first pass on `fix/dashboard-interactions-audit` made the header controls **open**
(dropdowns, modal, persisted labels) but they don't affect page data. The screenshot
confirms: typing "staging" only shows a "Global search is coming soon" quick-link
dropdown; changing the project or time range updates the label but Overview/Projects/etc.
don't react.

Goal: make Search, Project selector, and Time-range actually filter/scope the pages
where real data supports it, add **minimal, safe** backend time-range filtering, and keep
everything else honest (no fake data, no faked filtering).

Backend capabilities confirmed by reading controllers:
- `GET /api/events` — supports `projectId`, `name`, `limit`. **No** time filter yet.
- `GET /api/analytics/summary` — supports `projectId`. **No** time filter yet.
- `GET /api/dashboard/summary` — global account aggregates only (counts + recent lists).
- Project selector is already real-data-backed via `DashboardHeaderContext`
  (`GET /api/projects`, Bearer token, persisted to `localStorage`).

## Approach

### 1. Shared search state (`DashboardHeaderContext.tsx`)
Add transient (in-memory, not persisted) `searchQuery` + `setSearchQuery` to the context
alongside the existing `selectedProjectId` and `timeRange`. This is the single source of
truth the header search writes and pages read.

### 2. Header search (`header/HeaderSearch.tsx`)
Rewrite from the "coming soon" quick-links dropdown to a controlled input bound to the
shared `searchQuery`, page-aware via `usePathname()`:
- Searchable pages get a section-specific placeholder and live filtering:
  `/dashboard` (recent projects + API keys), `/dashboard/projects`, `/dashboard/api-keys`,
  `/dashboard/events`.
- Non-searchable pages (`/dashboard/analytics`, `/dashboard/settings`): input **disabled**
  + dimmed + honest "Search isn't available here" — the only per-page honest message.
- Keep the clear (✕) button.

### 3. Backend time-range filtering (minimal + injection-safe)
New shared helper `apps/server/src/utils/timeRange.ts`:
`rangeToInterval("24h"|"7d"|"30d"|"all")` → Postgres interval literal or `null` (= all time).

- `event.controller.ts` (`getEventsController`): read `req.query.range`; build
  `Prisma.sql` fragments for project/name/range and **collapse the current 4-way branched
  raw SQL into one composable query**. Range filters the returned event list via
  `e."createdAt" >= NOW() - ${interval}::interval`. Summary totals stay all-time/today.
- `analytics.controller.ts`: read `req.query.range`; add `rangeFilter`/`rangeFilterE`
  fragments and apply to the **breakdowns** — top events, events-by-project, recent
  activity. The fixed-window summary cards (Total = all time, Today, rolling 24h,
  hourlyTrend chart) keep their own semantics by design (avoids relabeling/overlap).

### 4. Pages consume the shared state
- **Events** (`EventsOverview.tsx`): use context `searchQuery`/`setSearchQuery` instead of
  local state; pass `range` from `timeRange`; refetch on project/time change; refresh
  keeps active filters.
- **Analytics** (`AnalyticsOverview.tsx`): pass `range` from `timeRange`; refetch on
  project/time change.
- **Projects** (`ProjectsOverview.tsx`): drive its search box from context `searchQuery`
  (header + page box stay in sync); combine with existing status/sort in `filteredProjects`;
  highlight the header-selected project row; dedup the create button (remove the
  empty-state button, keep the always-present dashed CTA).
- **Project card** (`ProjectCard.tsx`): accept `isSelected` and add a subtle ring so the
  header project selector visibly reacts on the Projects page (the page is the full list,
  so it highlights rather than hides).
- **API Keys** (`ApiKeysOverview.tsx`): drive its search box from context `searchQuery`.
  It already scopes by header `selectedProjectId` (`scopedApiKeys`) — unchanged.
- **Overview** (`DashboardOverview.tsx`): filter `recentProjects` + `recentApiKeys` client
  side by `searchQuery` and by `selectedProjectId` (All Projects → unfiltered). Stat cards
  stay global account totals (honest — no per-project/time meaning); add a small scope note
  when a project is selected or search is active. Time range does **not** affect overview.
- `RecentProjectsCard.tsx` / `RecentApiKeysCard.tsx`: optional `emptyLabel` prop so a
  filtered-empty list says "No matches" instead of "No projects yet".

## Files to modify
- `apps/web/components/dashboard/layout/header/DashboardHeaderContext.tsx`
- `apps/web/components/dashboard/layout/header/HeaderSearch.tsx`
- `apps/web/components/dashboard/events/EventsOverview.tsx`
- `apps/web/components/dashboard/analytics/AnalyticsOverview.tsx`
- `apps/web/components/dashboard/projects/ProjectsOverview.tsx`
- `apps/web/components/dashboard/projects/ProjectCard.tsx`
- `apps/web/components/dashboard/api-keys/ApiKeysOverview.tsx`
- `apps/web/components/dashboard/overview/DashboardOverview.tsx`
- `apps/web/components/dashboard/overview/RecentProjectsCard.tsx`
- `apps/web/components/dashboard/overview/RecentApiKeysCard.tsx`
- `apps/server/src/utils/timeRange.ts` (new)
- `apps/server/src/controllers/event.controller.ts`
- `apps/server/src/controllers/analytics.controller.ts`

(No route/schema/migration changes; `range` is an optional query param. No new libraries.)

## Who consumes what (honest summary for the report)
- **Header search** → Overview, Projects, API Keys, Events. Analytics/Settings: disabled + honest.
- **Selected project** → Events, Analytics, API Keys (filter), Overview (recent lists), Projects (highlight).
- **Time range** → Events (list), Analytics (breakdowns) via new backend `range` param.
  Overview/Projects/API Keys ignore it (not meaningful) — not faked.

## Known limitations (to disclose)
- Analytics fixed metric cards (Total/Today/24h) and the hourly chart stay fixed-window; only
  the breakdown panels move with the range.
- Search is transient per session (persists across pages, resets on reload) — intentional.
- Overview stat cards remain global totals regardless of selected project/time.

## Verification
1. `bun run typecheck` and `bun run build` (both must pass; run from repo root via turbo).
2. Manual (start API + web, sign in so `eventpulse_token` is set):
   - `/dashboard/projects`: type in header search → list filters; status + sort + search work together; selected project row highlighted.
   - Select a project → Events/Analytics/API-Keys scope to it; Overview recent lists filter; "All Projects" restores everything.
   - Change time range → Events list and Analytics breakdowns change; reload → project + range persist.
   - `/dashboard/analytics` + `/dashboard/settings`: header search disabled with honest message.
   - No crashes; no fake rows.
