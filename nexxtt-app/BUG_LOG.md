# Bug Log — production audit pass (2026-04-22)

## Fixed

### B-001 [Critical] Client portal 500
- **Where:** `/portal/[agencySlug]/[clientSlug]` for any agency_client
- **Symptom:** 500 Internal Server Error on every render
- **Root cause:** [components/client-portal/ClientProjectList.jsx](components/client-portal/ClientProjectList.jsx) `JobCard` referenced `basePath` but parent didn't pass the prop
- **Fix:** Threaded `basePath` through

### B-002 [High] generate_monthly_commissions errored
- **Where:** Supabase RPC `generate_monthly_commissions()`
- **Symptom:** `UPDATE requires a WHERE clause` (sql_safe_updates)
- **Root cause:** Bare `UPDATE referral_partners SET ...` in PL/pgSQL
- **Fix:** Migration `fix_generate_monthly_commissions_where_clause` adds `WHERE p.id IS NOT NULL`

### B-003 [High] Referral dashboard always empty
- **Where:** `/referral/dashboard` for James and any future referral partner
- **Symptom:** Page renders "No referral partner profile yet" even though partner row exists
- **Root cause:** [app/referral/dashboard/page.jsx](app/referral/dashboard/page.jsx) selected non-existent columns `commission_pct, commission_duration_months`. PostgREST returned an error → `data` was null → empty state path
- **Fix:** Removed those columns from select. Component already falls back to platform constants (0.20, 12)
- **Bonus:** Switched the read to admin client (consistent with rest of app, avoids future RLS surprises)

### B-004 [High] OrderPlacedEmail leaked nexxtt.io to clients
- **Where:** [emails/OrderPlacedEmail.jsx](emails/OrderPlacedEmail.jsx) header + footer
- **Symptom:** When `viewer="agency_client"` the email rendered "nexxtt.io" header. Visible in `/admin/email-preview`. Would leak when emails go live.
- **Root cause:** Hardcoded brand strings
- **Fix:** Added `brandName` + `brandPrimaryColour` props. Header + footer + bg colour now viewer-aware.

### B-005 [Medium] Hydration warning from ColorZilla extension
- **Where:** every page (root layout)
- **Symptom:** Console error about `cz-shortcut-listen="true"` mismatch
- **Root cause:** Browser extension injects attribute on `<body>` after SSR
- **Fix:** `suppressHydrationWarning` on `<body>` only

### B-006 [Medium] Layout + page double-fetched user/profile
- **Where:** Every gated page
- **Symptom:** 2× `auth.getUser()` round-trip per navigation, inflating TTFB ~150-300 ms
- **Root cause:** `resolveAgencyContext()` called in both layout and page; no caching
- **Fix:** Wrapped in React `cache()` so layout + page share the call. Also parallelized internal awaits and added `agency` row to context.

### B-007 [Medium] Portal layout + page + metadata triple-fetched
- **Where:** `/portal/[agencySlug]/[clientSlug]/*`
- **Symptom:** `agency_brands` and `clients` queried 3× per navigation
- **Fix:** New cached `lib/portal-context.js`. Layout, page, generateMetadata share one resolve.

### B-008 [Medium] DashboardD showed real-looking client names from other agencies
- **Where:** Every agency's dashboard overview
- **Symptom:** Agencies saw "Coastal Realty", "TechCore SaaS", "Bloom Beauty" hardcoded — could mistake for their own clients
- **Fix:** Anonymized to "Sample client A/B/C/D"; added "Preview" badge on the gantt header

### B-009 [Low] Dead variant components
- **Where:** `components/dashboard/{A,B,C}.jsx`
- **Symptom:** ~744 LOC of unused code with mock data after switching to D-only
- **Fix:** Deleted

## Open / known

### O-001 [High when emails go live] Resend envelope-from contains "nexxtt.io"
- **Where:** [app/api/clients/invite/route.js](app/api/clients/invite/route.js) line 183 — `from: \`${displayName} <noreply@nexxtt.io>\``
- **Risk:** Client sees the agency's display name, but "noreply@nexxtt.io" is visible on hover or in raw email view
- **Why not fixed now:** Requires per-agency Resend domain verification or a wildcard subdomain (`<slug>.nexxtt.io`) that we don't control yet
- **When to fix:** Before turning on `RESEND_API_KEY` in production

### O-002 [Low] `admin_actions.admin_id` populated by non-admin raisers
- **Where:** [app/api/projects/[id]/dispute/route.js](app/api/projects/[id]/dispute/route.js), [app/api/projects/[id]/revision/route.js](app/api/projects/[id]/revision/route.js)
- **Risk:** Audit log column name is misleading (says `admin_id` but value can be agency, agency_client, direct_client)
- **Why not fixed:** Pure naming. Would require schema migration. No security impact.

### O-003 [Low] `loading.jsx` files added but no error boundaries
- **Where:** No `error.jsx` files anywhere
- **Risk:** Runtime errors fall back to Next's default error page
- **When to fix:** When you wire Sentry or similar
