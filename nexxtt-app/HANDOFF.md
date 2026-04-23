# nexxtt.io — Handoff

This is the operational handoff for the next assistant. Read this *before*
opening the codebase. The full product spec lives in
`../nexxtt-architecture.md` (33 sections, ~2500 lines). This file is the
shorter map: what the app is, what's built, what isn't, and the gotchas
that aren't in the code.

---

## 1. What this is

**nexxtt.io** is a B2B2C white-label design-services marketplace. It sits
invisibly behind agencies and lets them resell design (websites, logos, brand
kits, social, content) to their own clients under their own brand. It also
sells direct and runs a 20%-for-12-months referral programme.

Five distinct portals, one Next.js app, one Supabase project.

```
nexxtt.io
├── 🏢  Agency Portal           → /agency/*
├── 👤  Client Portal           → /portal/[agencySlug]/[clientSlug]/*    (white-label)
├── 🤝  Referral Partner Portal → /referral/*
├── 🏗️  Direct Client Portal    → /direct/*
└── 🛡️  Admin Portal            → /admin/*
```

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2.4** | App Router, **Turbopack**, server components by default. Middleware file is `proxy.js` (not `middleware.js`) and exports `proxy` (not `middleware`). |
| Language | **JavaScript only** | No TypeScript anywhere. JSDoc OK. |
| Styling | **Tailwind CSS v4** | Tokens live in `app/globals.css` under `@theme`. **No `tailwind.config.js`.** |
| UI primitives | Hand-rolled + lucide-react icons | shadcn/ui not installed despite spec calling for it. Recharts for charts. |
| Tables | Plain HTML `<table>` mostly | MUI DataGrid wrapper exists in `components/tables/ResponsiveTable.jsx` but nobody imports it. Compact `<table>` styling lives globally in `globals.css` under `@layer base`. |
| DB / Auth / Storage / Realtime | **Supabase** (`@supabase/ssr`) | Project ID `qzxaneidqcyzfqwqdvzo`, region **ap-south-1 (Mumbai)** — cross-region RTT is the perf floor. |
| Payments | Stripe **(spec'd, NOT wired)** | Empty keys in env. No webhook route built. |
| Email | Resend + React Email **(spec'd, NOT wired)** | `lib/email/send.js` no-ops gracefully when key absent. Templates exist in `emails/`. |
| State | Zustand for UI state, server components for data, useSWR not used in practice | |

---

## 3. Portal rules — who can do what

| Action | Agency | Agency Client | Referral Partner | Direct Client | Admin |
|---|---|---|---|---|---|
| Place orders | ✅ for clients | ❌ | ❌ | ✅ for self | ✅ |
| View order progress | ✅ | ✅ (own only) | ❌ | ✅ (own only) | ✅ all |
| **See cost / margin** | ✅ | ❌ | ❌ | ❌ | ✅ |
| See nexxtt.io branding | ❌ | ❌ | ✅ | ✅ | ✅ |
| Earn commission | ❌ | ❌ | ✅ | ❌ | ❌ |
| Invite clients | ✅ | ❌ | ❌ | ❌ | ✅ |
| Approve deliverables | ❌ (spec says "on behalf" but not built) | ✅ | ❌ | ✅ | ✅ |
| Manage platform | ❌ | ❌ | ❌ | ❌ | ✅ |

The `cost_price_cents` and `total_cost_cents` columns are **column-level
REVOKED** from the `authenticated` role in PostgreSQL. So even a crafted
query as agency_client can't read them. Smoke tests verify this.

---

## 4. How the portals interconnect

### Data flow — order lifecycle
```
Agency (or Direct client) places order
  → POST /api/jobs creates a `jobs` row + N `projects` rows
    each project starts at status='brief_pending'
  → notifications row inserted for the agency
  → email to agency owner (no-op without Resend key)

Agency or admin clicks "Start work" on a brief_pending project
  → POST /api/projects/[id]/start  → status='in_progress'

Agency or admin uploads first deliverable file
  → POST /api/projects/[id]/files  → status='in_review' (auto-advance)

Client (portal_user_id or direct_client_user_id) clicks Approve
  → POST /api/projects/[id]/approve  → status='delivered'

Client clicks Request Revision
  → POST /api/projects/[id]/revision  → status='revision_requested', revision_count++

Anyone disputes
  → POST /api/projects/[id]/dispute  → status='disputed', notifies admins

Admin resolves dispute
  → POST /api/admin/projects/[id]/resolve
  → reopen → in_progress, force_deliver → delivered, refund → stays disputed (Stripe TODO)
```

### Tenant isolation — agency ↔ client
- An **agency** has many **clients**. `clients.agency_id` is the link.
- An **agency_client** user is bound to ONE client row via `clients.portal_user_id = auth.users.id`.
- The white-label portal at `/portal/[agencySlug]/[clientSlug]/` resolves
  the agency by `agency_brands.portal_slug = agencySlug` and the client by
  `clients.portal_slug = clientSlug` filtered by that agency_id.
- The portal **layout** authorizes the viewer as either:
  - the client owner (`portal_user_id === user.id`), or
  - an agency-of-record (`profile.role === 'agency'` and `profile.agency_id === brand.agency_id`), or
  - an admin
- An agency or admin viewing a client portal sees a yellow "Preview" banner.
- All these resolutions go through `lib/portal-context.js` which is wrapped in
  React `cache()` so layout, page, and `generateMetadata` share a single
  request-scoped fetch.

### Referral attribution
- Each `referral_partners` row owns a unique `referral_code` (e.g. `JPARK01`).
- Public link: `/ref/<code>` → looks up partner case-insensitively, sets a
  30-day `nx_ref` httpOnly cookie, redirects to `/login?ref=<CODE>` with a
  visible banner.
- A new signup *should* read this cookie and insert a `referrals` row — that
  insertion is **not yet wired** because real signup only just landed (see §7).
- When `jobs.status` flips to `delivered`, an Edge Function *should* create a
  `commission_entries` row at 20% of `total_retail_cents`. The PG function
  `generate_monthly_commissions()` exists and is RPC-callable; the Edge
  Function trigger is not wired.

### Admin impersonation
- Admin clicks Impersonate on `/admin/agencies` → POST `/api/admin/impersonate`
  with `agencyId`. Sets `nx_impersonate_agency` httpOnly cookie (1h).
- `lib/impersonation.js → resolveAgencyContext()` reads this cookie. If
  present AND caller is admin, the returned context's `agencyId` and
  `agency` are the impersonated one's, with `isImpersonating: true`.
- Agency layout shows an `ImpersonationBanner` while the cookie is set.
- DELETE on the same endpoint clears the cookie + logs `stop_impersonate_agency`.

---

## 5. Auth model — DON'T break this

- Sessions: Supabase `@supabase/ssr`. Cookie name `sb-qzxaneidqcyzfqwqdvzo-auth-token`.
- **Browser client is a singleton** — `lib/supabase/client.js` caches one
  instance per tab and uses a **no-op `navigator.locks`**. Do not change this:
  multiple instances racing on the lock surfaces as a runtime error in
  Next dev overlay.
- **Server client must be re-created per request** — `createServerSupabaseClient()`
  awaits `cookies()` (Next 16 made it async). Always `await`.
- **Admin (service-role) client** — `createAdminSupabaseClient()`. Server-only.
  Never import from a `"use client"` file. ESLint doesn't enforce this; manual
  review only.
- **Role gates everywhere**:
  - `proxy.js` checks `user.user_metadata.role` and the URL prefix
  - Every API route re-reads `user_profiles.role` (do **not** trust
    `user_metadata.role` for authorization decisions — it's user-mutable
    via `updateUser`)
  - `user_profiles` row is auto-inserted by the `handle_new_user` trigger
    when a new auth user is created. The trigger reads `raw_user_meta_data`
    for `role`, `agency_id`, `first_name`, `last_name`.
- Agency layout has a **status gate**: a signed-in agency whose
  `agencies.status !== 'active'` is bounced to `/signup/agency/pending`.
  Admins-impersonating skip this check.

---

## 6. Demo personas (password `demo1234` for all)

| Email | Role | Notes |
|---|---|---|
| `alex@brightagency.com.au` | agency | Bright Agency Co., status active |
| `sarah@coastalrealty.com.au` | agency_client | Coastal Realty, client of Bright Agency |
| `james@parkbusiness.com.au` | referral_partner | Park Business Consulting, code `JPARK01` |
| `marcus@techcore.com` | direct_client | TechCore SaaS |
| `riya@nexxtt.io` | admin | nexxtt.io HQ |

Map lives in `lib/demoUsers.js` and drives the picker on `/login`.

---

## 7. What's actually built — quick map

### Routes that work end-to-end (auth-gated, real data)
```
/login                                            ← demo picker + signup link + ?ref banner
/signup                                           ← agency / direct tabs
/signup/agency/pending                            ← awaiting approval landing
/ref/[code]                                       ← public referral landing → /login?ref=

/agency/dashboard                                 ← Overview (DashboardD) + List (OrdersList)
/agency/orders + /[id]                            ← list + detail
/agency/orders/new                                ← order builder (single brief form, not per-service)
/agency/clients + /invite                         ← list + 3-step invite wizard
/agency/projects/[id]                             ← project detail with stages + StartWorkPanel + DeliverablesPanel
/agency/finance/profit                            ← Recharts profit dashboard
/agency/settings                                  ← brand settings (logo upload, colours, slug)

/portal/[agencySlug]/[clientSlug]                 ← client home: jobs + projects list
/portal/[agencySlug]/[clientSlug]/projects/[id]   ← project detail with Approve / Request Revision

/direct/dashboard + /orders + /orders/[id]
/direct/projects/[id]

/referral/dashboard                               ← single page; commission streams + share link

/admin (overview)
/admin/agencies                                   ← Approve / Suspend / Reactivate / Impersonate
/admin/clients
/admin/orders
/admin/referrals
/admin/services
/admin/finance
/admin/settings
/admin/email-preview                              ← renders all email templates
```

### API routes
```
POST  /api/auth/signup/agency                  ← creates agency (pending) + user
POST  /api/auth/signup/direct                  ← creates direct user
GET   /api/search?q=                           ← role-scoped global search (CommandPalette uses this)

POST  /api/jobs                                ← place order
POST  /api/clients/invite                      ← invite a client (3-step wizard backend)

POST  /api/projects/[id]/start                 ← brief_pending → in_progress  (agency/admin)
GET/POST /api/projects/[id]/files              ← list signed URLs / upload (auto-advance to in_review)
DELETE  /api/projects/[id]/files/[fileId]
POST  /api/projects/[id]/approve               ← client only → delivered
POST  /api/projects/[id]/revision              ← client only → revision_requested
POST  /api/projects/[id]/dispute               ← any RLS-eligible viewer

PATCH /api/brand                               ← agency white-label config
POST  /api/brand/logo                          ← logo upload to agency-logos bucket

POST   /api/admin/cron/[job]                   ← manual trigger for expire-invites / generate-commissions
POST   /api/admin/impersonate                  ← set impersonation cookie
DELETE /api/admin/impersonate                  ← clear it
PATCH  /api/admin/agencies/[id]                ← approve / suspend / reactivate
POST   /api/admin/projects/[id]/resolve        ← resolve a dispute
```

### Spec features NOT built (Phase 2)
- Stripe top-up + webhook
- Resend live email send (templates exist; key empty)
- Custom-domain rewrite middleware (white-label sub-domains)
- Per-service multi-step brief forms (one generic brief is used)
- DashboardD wired to live data (currently shows "Sample" preview rows with a "Preview" badge)
- Edge Function for commission creation on `jobs.status → delivered`
- Real signup → referrals attribution (cookie is set on /ref visit; signup
  endpoints don't yet read it to insert into `referrals`)
- `error.jsx` boundaries
- Sentry / observability wiring
- Drag-and-drop kanban
- E2E tests (Playwright)

---

## 8. Gotchas the next assistant MUST know

These cost real time to rediscover. Apply them upfront.

1. **Use `npm run start` for perf testing, not `npm run dev`.** Turbopack on
   Windows takes 5-30s per first-route navigation while it compiles
   on-demand. Production build does each route in 600-700ms median.

2. **Tailwind v4 utility cascade.** Custom CSS in `globals.css` outside
   `@layer base` has higher cascade priority than Tailwind utilities. So
   a global `h1 { color: var(--color-dark); }` will beat `text-white`. The
   heading defaults are now wrapped in `@layer base` — keep them there.

3. **Compact `<table>` rule lives globally.** `globals.css` `@layer base`
   sets `table th/td { padding: 0.4rem 0.7rem; ... }`. Don't override per-page
   without a reason — that's intentional uniform compaction.

4. **Browser-client singleton + no-op lock.** Don't call `createBrowserClient`
   inline. Use `createClient()` from `lib/supabase/client.js`. Disabling the
   `navigator.locks` was deliberate — the cross-tab lock surfaced as a
   "Lock was released" runtime error in Next dev when multiple tabs raced.

5. **Cached server contexts.** `resolveAgencyContext()` and
   `resolvePortalContext()` are wrapped in React `cache()`. Layout + page +
   metadata can all call them; they share a single per-request fetch. **Do
   not bypass these.** Re-fetching the user/profile in a page is wasteful
   and creates inconsistencies.

6. **`useSearchParams` needs Suspense or a server-component prop pass.** In
   Next 16, calling `useSearchParams()` in a client component during prerender
   throws. Either wrap in `<Suspense>` or convert the page to a server
   component that reads `searchParams` from props and passes them down. We
   chose the latter pattern in `/login` and `/signup`.

7. **Always `await params` and `await searchParams` in Next 16.** Both are
   async now. Pages do `const { id } = await params;`.

8. **Service-role usage is intentional in many reads** — agency-side queries
   that need cost columns route through `createAdminSupabaseClient()` because
   we revoked `cost_price_cents` / `total_cost_cents` from the `authenticated`
   role at the column level. Page-level filters by `agency_id` keep this safe.

9. **Cross-region latency is the floor.** Supabase is in ap-south-1; each
   query is ~120-200ms RTT. Don't try to optimize below 500ms TTFB without
   moving the deployment to bom1 (Mumbai) or moving Supabase to a region
   closer to users.

10. **Resend `noreply@nexxtt.io` is a known pre-launch issue.** When the
    envelope-from goes live with a real Resend key, the technical from-address
    "nexxtt.io" leaks to client viewers (display name shows agency, but raw
    email view shows nexxtt). See `BUG_LOG.md` O-001. Fix before turning on.

---

## 9. Where to find things

```
nexxtt-app/
├── app/
│   ├── login/                   ← demo picker (server wrapper + LoginClient)
│   ├── signup/                  ← agency/direct signup + pending landing
│   ├── ref/[code]/route.js      ← public referral landing
│   ├── agency/, admin/, direct/, referral/, portal/[agencySlug]/[clientSlug]/
│   ├── api/
│   │   ├── auth/signup/{agency,direct}/route.js
│   │   ├── jobs/route.js                 ← order placement
│   │   ├── clients/invite/route.js
│   │   ├── projects/[id]/{approve,revision,dispute,start,files}/route.js
│   │   ├── brand/{route.js, logo/route.js}
│   │   ├── admin/{cron,impersonate,agencies/[id],projects/[id]/resolve}/
│   │   └── search/route.js
│   ├── globals.css              ← @theme tokens + @layer base for h1-h6 and tables
│   └── layout.js                ← root layout (suppressHydrationWarning on body)
├── components/
│   ├── layout/                  ← AgencySidebar, AgencyTopbar (with ⌘K search trigger), etc.
│   ├── search/CommandPalette.jsx
│   ├── shared/                  ← StatusBadge, NotificationBell, EmptyState, Skeletons, etc.
│   ├── orders/OrdersList.jsx
│   ├── clients/ClientList.jsx
│   ├── client-portal/ClientProjectList.jsx, ClientTopbar.jsx
│   ├── project-detail/          ← ProjectDetailView, ProjectStages, DeliverablesPanel,
│   │                              DisputePanel, ClientActionPanel, StartWorkPanel
│   ├── dashboard/DashboardD.jsx + DashboardViewSwitcher.jsx
│   ├── referral/RefDashboard.jsx
│   ├── admin/{ImpersonateButton, AgencyApprovalActions}.jsx
│   └── settings/, order-builder/, clients/InviteWizard.jsx
├── lib/
│   ├── supabase/{client.js, server.js}
│   ├── impersonation.js          ← cached resolveAgencyContext()
│   ├── portal-context.js         ← cached resolvePortalContext() for /portal
│   ├── delivered-files.js        ← signs delivered_files into 24h URLs
│   ├── email/send.js             ← graceful no-op without Resend key
│   ├── slug.js, money.js, demoUsers.js, priority.js
│   └── stores/useAgencyStore.js  ← zustand: sidebar open, etc.
├── emails/                       ← React Email templates (rendered in /admin/email-preview)
├── proxy.js                      ← Next 16 middleware (NOT middleware.js)
├── scripts/
│   ├── smoke-all.mjs             ← 5-persona auth + RLS smoke (31 checks)
│   ├── route-sweep.mjs           ← every gated route returns 200 with real session
│   ├── permission-fuzz.mjs       ← 25 cross-role API permission checks
│   └── test-all.mjs              ← runs all three, exits non-zero on fail
├── PRODUCTION_AUDIT.md           ← phase-by-phase audit log
├── TEST_PLAN.md                  ← what each test suite covers
├── BUG_LOG.md                    ← per-issue root cause + fix
├── SECURITY_NOTES.md             ← auth model, hostile-input audit, attack matrix
└── DEPLOY_CHECKLIST.md           ← pre/post deploy steps
```

The full product spec is in `../nexxtt-architecture.md` (one level up).

---

## 10. How to run + test

```bash
cd nexxtt-app

# Dev (slow first-nav per route, but HMR)
npm run dev

# Prod (use this for perf testing — 600-700ms median per page)
npm run build
npm run start -- -p 3210

# Tests (server must be running on :3210)
node scripts/test-all.mjs
```

Required env vars (server-only marked *):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY *
NEXT_PUBLIC_APP_URL
RESEND_API_KEY *                 (empty → email no-ops)
STRIPE_SECRET_KEY *              (empty → no Stripe path implemented anyway)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET *
```

---

## 11. Recent work log (sessions 28+)

These are the changes made in the most recent working sessions on top of the
33-step build. Each one touched real code:

- **Bug fixes**
  - Client portal 500 — `basePath` not threaded into `JobCard`
  - `generate_monthly_commissions()` SQL — added `WHERE p.id IS NOT NULL`
  - Referral dashboard always blank — `.select()` referenced columns that
    don't exist (`commission_pct`, `commission_duration_months`)
  - Hydration warning from ColorZilla extension (`suppressHydrationWarning`
    on `<body>`)
  - Tables filter on `/agency/dashboard?view=list` now rolls up project
    statuses, not just job-level
  - White-text-on-dark-bg headings — moved `h1, h2, ...` rule into `@layer base`
  - Supabase browser-client lock — singleton + no-op `navigator.locks`

- **Perf**
  - `resolveAgencyContext()` + new `resolvePortalContext()` wrapped in
    `cache()` — layout + page share one fetch
  - Detail pages (orders/[id], projects/[id]) collapsed sequential awaits
    into single nested PostgREST selects
  - Added `loading.jsx` segment loaders + `PageSkeleton`/`DetailSkeleton`
    primitives (visible chrome, no blank screens)
  - `useTransition` + removed redundant `router.refresh()` on login

- **Features added**
  - Sign-up system (`/signup` with agency/direct tabs, agency-pending landing)
  - Admin agency Approve / Suspend / Reactivate (`/api/admin/agencies/[id]`)
  - Referral link `/ref/[code]` actually works (case-insensitive lookup,
    httpOnly cookie, banner on `/login?ref=`)
  - Project lifecycle gaps closed:
    - `StartWorkPanel` → `brief_pending → in_progress`
    - File upload auto-advances `→ in_review`
  - Agency dashboard simplified to **Overview (D) + List** view toggle
    (deleted DashboardA/B/C dead files)
  - Topbar search now opens the CommandPalette (`⌘K`)
  - Compact tables globally + tighter card-list rhythm

- **White-label hardening**
  - `OrderPlacedEmail` made viewer-aware (`brandName` + `brandPrimaryColour`
    props) so client-viewer rendering doesn't leak "nexxtt.io"
  - DashboardD mock rows anonymized to "Sample client A/B/C/D" with a
    "Preview" badge

- **Test infrastructure**
  - `permission-fuzz.mjs` (25 cross-role checks)
  - `test-all.mjs` aggregate runner

---

## 12. What I'd ask the user first

When picking up a new conversation:

1. **Are you running `npm run dev` or `npm run start`?** Most "it's slow" or
   "Failed to fetch" reports come from dev mode quirks.
2. **Which persona / URL are you on?** Saves a lot of guessing.
3. **Browser extensions disabled for localhost?** ColorZilla, ad-blockers,
   privacy extensions all break things.
4. **Did you run `npm run build` after my code change?** Tailwind utility
   class changes need a rebuild even with HMR sometimes.

When making non-trivial changes:

1. Run `node scripts/test-all.mjs` after — server must be on :3210.
2. Read `nexxtt-architecture.md §<relevant>` first if the task touches business
   rules. The spec is the source of truth on disagreements.
3. Don't add features the user didn't ask for. The spec describes a lot of
   Phase-2 work that isn't built yet — it's not a TODO list.
