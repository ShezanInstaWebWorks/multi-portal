# nexxtt.io — Production Audit

Completed: 2026-04-22

## Scope

This audit covers what was actually built (sessions 1–28). Spec items still
marked Phase-2 (Stripe live, Resend live, custom domain rewrites, full
agency onboarding wizard, brief forms for all 5 services, Edge Functions
for commission) are noted as **Gaps vs spec** rather than fixed — they
are new feature work, not production hardening.

The audit focused on what makes the difference between "demo" and "shippable":
**auth gates, RLS isolation, white-label leak, hostile API input, mobile
behaviour, and observable build health.**

## What was tested

| Area | Tool | Status |
|---|---|---|
| All 5 personas can sign in + read own data | `scripts/smoke-all.mjs` | 31/31 pass |
| Every gated route returns 200 with real session, 307 without | `scripts/route-sweep.mjs` | 21/21 real routes pass |
| 25 cross-role API permission checks (anon, agency, agency_client, ref, direct, admin) | `scripts/permission-fuzz.mjs` | 25/25 pass |
| Client portal HTML scanned for `nexxtt`, `cost_price`, `total_cost`, `profit` | inline node script | 0 leaks |
| Production build succeeds | `next build` | clean |

Run all three: `node scripts/test-all.mjs` (server must be on :3210).

## Issues found and fixed

| # | Severity | Area | Issue | Fix |
|---|---|---|---|---|
| 1 | C | Build | `/portal/[agencySlug]/[clientSlug]` returned 500 — `basePath` not threaded into `JobCard` | Threaded prop |
| 2 | H | DB | `generate_monthly_commissions()` violated `sql_safe_updates` | Migration `fix_generate_monthly_commissions_where_clause` |
| 3 | H | Data | Referral dashboard always showed empty state — `.select()` referenced `commission_pct` / `commission_duration_months` columns that don't exist | Dropped non-existent columns; component already falls back to platform constants |
| 4 | H | White-label | `OrderPlacedEmail` hardcoded "nexxtt.io" in header + footer — leaked when `viewer="agency_client"` | Added `brandName` / `brandPrimaryColour` props; viewer-aware branding |
| 5 | M | Perf | Every gated page made 2× `auth.getUser()` (layout + page) round-trips to ap-south-1 | Wrapped `resolveAgencyContext` and new `resolvePortalContext` in React `cache()`; consolidated `agency` row fetch into context |
| 6 | M | Perf | Detail pages did 3-6 sequential awaits | Collapsed to nested PostgREST selects (1-2 round-trips) |
| 7 | M | UX | Blank screen during server render — no `loading.jsx` files | Added `loading.jsx` for every segment + dynamic detail route, plus `PageSkeleton` / `DetailSkeleton` primitives |
| 8 | M | UX | Hydration warning from ColorZilla extension on `<body>` | `suppressHydrationWarning` on `<body>` |
| 9 | M | Code | Dead variant components `DashboardA/B/C` (~744 LOC) sitting in source after switching to D-only | Deleted |
| 10 | M | UX | DashboardD hardcoded mock client names ("Coastal Realty" etc) shown to every agency — could be mistaken for their own clients | Anonymized to "Sample client A/B/C/D"; added "Preview" badge on the gantt header |
| 11 | L | Cleanup | Email-preview agency_client sample didn't pass brand props | Now passes `brandName="Bright Agency Co."` for realistic preview |

## What we verified is *correct* and didn't need changes

- Every admin route checks `profile.role === 'admin'`
- Brand PATCH derives `agency_id` from session profile, not request body
- Files DELETE/POST verifies project belongs to caller's agency
- Approve/Revision verifies caller is the actual client (`portal_user_id` or `direct_client_user_id`), not just agency-side
- Dispute uses RLS gate — referral_partners have no SELECT on `projects` so they can't dispute
- Clients/invite uses `agencyId` from server-side profile, never from body
- `sendEmail` no-ops gracefully without `RESEND_API_KEY` instead of crashing
- `proxy.js` enforces role on every gated prefix (agency/admin/referral/direct/portal)
- No service-role key exposure in client bundle (grep'd `next build` output earlier)

## Gaps vs spec (not fixed — these are feature work)

| Spec § | Item | State |
|---|---|---|
| §10.4, §15 | Resend email actually sending | Code paths wired; key not set → no-op |
| §10.5 | Custom-domain CNAME middleware | Not built (path-based portals only) |
| §32 | Stripe top-up + webhook | Endpoint not built; keys empty |
| §22 | DashboardD wired to live `projects` data | Currently shows "Sample" preview rows |
| §11 | Brief forms for all 5 services | One generic brief form built; per-service multi-step forms not |
| §29.1 | `brief-uploads` bucket usage | Bucket exists; upload UI not in brief flow |
| §31 | Edge Functions deployed (commission, expire-invites, auto-topup) | Logic exists as PG functions; `expire_invites` + `generate_monthly_commissions` are RPC-callable. `auto-topup` not built. |
| §37 | Admin impersonation banner UI | Cookie + endpoint built; banner component exists but not visible in agency layout when impersonating cookie set |

## Remaining risks (won't block launch but track)

- **R1 — Email envelope-from**: When `RESEND_API_KEY` is set, the invite email goes out as `<brand-display-name> <noreply@nexxtt.io>`. Display name shows the agency, but the technical from-address still contains "nexxtt.io". For full white-label, set up per-agency domain verification in Resend, or a wildcard subdomain (`noreply@<slug>.nexxtt.io`). **Severity: H — when emails go live.** Not live now.
- **R2 — Dispute audit log column naming**: `admin_actions.admin_id` is set to `user.id` even when the raiser is a non-admin (agency, client). Misleading column name; not a security bug. Low priority rename.
- **R3 — DashboardD is preview-only**: List view shows real orders. Overview shows hardcoded "Sample" gantt + activity. Replace with live `projects` query when there's appetite.
- **R4 — No e2e test coverage**: Three node-based suites cover smoke/routes/permissions. No Playwright in repo. Acceptable for an MVP; add when team grows.

## Files changed in this audit

- `app/admin/email-preview/page.jsx` — pass brand props to client-viewer preview
- `app/portal/[agencySlug]/[clientSlug]/page.jsx` — use cached `resolvePortalContext`
- `app/portal/[agencySlug]/[clientSlug]/layout.jsx` — use cached `resolvePortalContext`
- `app/portal/[agencySlug]/[clientSlug]/projects/[id]/page.jsx` — collapsed to fewer awaits
- `app/agency/dashboard/page.jsx` — D-only + list view toggle, uses cached agency
- `app/agency/orders/[id]/page.jsx` — nested select, single round-trip
- `app/agency/projects/[id]/page.jsx` — nested select
- `app/direct/projects/[id]/page.jsx` — nested select
- `app/referral/dashboard/page.jsx` — fixed non-existent columns; admin-client reads
- `app/layout.js` — `suppressHydrationWarning` on body
- `lib/impersonation.js` — `cache()` + `agency` row in context
- `lib/portal-context.js` — NEW, cached portal resolver
- `components/client-portal/ClientProjectList.jsx` — `basePath` prop threaded
- `components/dashboard/DashboardD.jsx` — anonymized mock data + Preview badge
- `components/dashboard/DashboardViewSwitcher.jsx` — NEW
- `components/shared/Skeletons.jsx` — `PageSkeleton`, `DetailSkeleton`
- `emails/OrderPlacedEmail.jsx` — viewer-aware brand props
- `app/{agency,admin,direct,referral}/loading.jsx` — NEW segment loaders
- `app/{agency,direct,portal/...}/orders/[id]/loading.jsx` — NEW detail loaders
- `app/{agency,direct,portal/...}/projects/[id]/loading.jsx` — NEW detail loaders
- `scripts/permission-fuzz.mjs` — NEW
- `scripts/test-all.mjs` — NEW
- `components/dashboard/DashboardA.jsx` — DELETED (dead)
- `components/dashboard/DashboardB.jsx` — DELETED (dead)
- `components/dashboard/DashboardC.jsx` — DELETED (dead)

## Manual QA still recommended

- 375px / 768px / 1280px walkthrough of every portal (especially agency order builder steps + client portal approve/reject)
- Sign in as Sarah, navigate every portal link, verify nothing leaks "nexxtt", "cost", "profit"
- Sign in as Alex, place a test order via `/agency/orders/new`, verify balance debit, email delivery (when Resend wired)
- Sign in as Riya, impersonate Bright Agency, place an order on their behalf, stop impersonating — verify `admin_actions` rows
- Mobile keyboard overlap check on the invite client form (3-step) and order builder
