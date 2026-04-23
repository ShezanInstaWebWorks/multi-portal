# Security Notes

Audit pass: 2026-04-22. Re-audit before each major release.

## Auth model summary

- **Sessions**: Supabase Auth via `@supabase/ssr`. Cookie name `sb-<projectref>-auth-token`. Server reads via `createServerSupabaseClient()`; client reads via `createBrowserSupabaseClient()`.
- **Roles**: stored on `user_metadata.role` AND `user_profiles.role`. Both populated by the `handle_new_user` trigger on `auth.users` insert.
- **Route gating**: `proxy.js` (Next 16 middleware) enforces role per URL prefix:
  - `/admin` → admin only
  - `/agency` → agency or admin
  - `/referral` → referral_partner only
  - `/direct` → direct_client only
  - `/portal` → agency_client, agency, or admin
- **API gating**: every Route Handler re-checks `auth.getUser()` + role from `user_profiles`. **Never trust** `user_metadata.role` server-side because it can be set client-side via `updateUser` — always re-read from `user_profiles`.

## Service-role key handling

- Lives in `process.env.SUPABASE_SERVICE_ROLE_KEY` — server-only.
- Verified absent from client bundle (`grep -r SUPABASE_SERVICE_ROLE_KEY .next/static/` returns nothing).
- `createAdminSupabaseClient()` is the only constructor that uses it; it's only imported in:
  - `lib/impersonation.js` (cached, server-only)
  - `lib/portal-context.js` (cached, server-only)
  - `app/api/**/*.js` (Route Handlers — server-only)
  - `app/**/page.jsx` server components (server-only by definition)
- **Rule**: never import `createAdminSupabaseClient` from a `"use client"` file. ESLint doesn't enforce this — manual review.

## Data isolation guarantees

| Table | RLS policy | Enforced by |
|---|---|---|
| `agencies` | `id = profile.agency_id` for SELECT; admins via service-role | RLS + page filters |
| `clients` | `agency_id = profile.agency_id` OR `portal_user_id = auth.uid()` | RLS + page filters |
| `jobs` | `agency_id = profile.agency_id` OR `direct_client_user_id = auth.uid()` OR client-portal-via-clients | RLS + page filters |
| `projects` | join through `jobs` policy | RLS via jobs |
| `referral_partners` | `user_id = auth.uid()` | RLS |
| `notifications` | `user_id = auth.uid()` | RLS |
| `cost_price_cents`, `total_cost_cents` | column-level REVOKE on `authenticated` role | PostgreSQL grants — confirmed via smoke test |

## Hostile-input audit results

All 13 API routes reviewed (audit pass 2026-04-22):

| Route | Auth | Role | Ownership check | Notes |
|---|---|---|---|---|
| POST /api/jobs | ✓ | agency or direct_client | `agency_id` from profile, never body | OK |
| POST /api/clients/invite | ✓ | agency/admin | `agency_id` from profile | OK |
| POST /api/admin/cron/[job] | ✓ | admin | n/a | OK |
| POST /api/admin/impersonate | ✓ | admin | agency exists check | OK |
| POST /api/admin/projects/[id]/resolve | ✓ | admin | project exists + status='disputed' | OK |
| PATCH /api/brand | ✓ | agency/admin | `agency_id` from profile + slug uniqueness | OK |
| POST /api/projects/[id]/dispute | ✓ | RLS-gated | RLS on projects | OK (referral_partners blocked by RLS) |
| POST /api/projects/[id]/approve | ✓ | client | verifies caller is `portal_user_id` or `direct_client_user_id` | OK |
| POST /api/projects/[id]/revision | ✓ | client | same as approve | OK |
| POST /api/projects/[id]/files | ✓ | agency/admin | verifies project belongs to agency | OK |
| GET /api/projects/[id]/files | ✓ | RLS-gated + signed URLs | OK | Signed URLs are 24h |
| DELETE /api/projects/[id]/files/[fileId] | ✓ | agency/admin | verifies project belongs to agency | OK |
| GET /api/search | ✓ | session-scoped | client-driven query, server filters by role | OK |

## White-label leak audit

Scanned [`/portal/...`] HTML for: `nexxtt`, `cost_price`, `total_cost`, `profit`, `agency_profit`. **Zero hits** as agency_client (Sarah).

Email templates audited:
- `ClientInviteEmail` — agency-branded, no nexxtt strings ✓
- `OrderPlacedEmail` — viewer-aware after fix B-004 ✓
- `CommissionPaidEmail` — sent FROM nexxtt to referral partners (correct per spec §16) ✓

**Pre-launch follow-up**: when `RESEND_API_KEY` is set, the technical from-address `noreply@nexxtt.io` is visible in raw email view — see BUG_LOG O-001.

## Storage

| Bucket | Visibility | Used by |
|---|---|---|
| `agency-logos` | Public | Agency brand settings |
| `delivered-files` | Private + signed URLs (24h) | Project deliverables |
| `brief-uploads` | Private | (not yet wired to UI) |
| `brand-assets` | Private | (not yet wired to UI) |

Signed URLs minted server-side only, in `lib/delivered-files.js` and `app/api/projects/[id]/files/route.js`.

## What an attacker would try (and why it fails)

1. **Admin endpoint as agency** → 403 (verified by `permission-fuzz.mjs`)
2. **Forge `agencyId` in `/api/jobs` body** → ignored; route reads from session profile
3. **Approve another client's project** → 403; route checks `portal_user_id` matches caller
4. **Read another agency's clients** → empty result; RLS filter
5. **Read `total_cost_cents` as agency_client** → PostgreSQL error: column-level REVOKE
6. **Inject SQL via filter params** → not possible; PostgREST parameterizes everything
7. **Steal session cookie via XSS** → `httpOnly` set by Supabase SSR
8. **CSRF on POST /api/jobs** → Next.js requires same-site cookie by default (sameSite=lax). For sensitive flows, add explicit Origin header check before going live to public.

## Open security follow-ups

- [ ] Add Origin header check on mutating routes before public launch (CSRF defense-in-depth)
- [ ] Resolve O-001 (Resend envelope-from)
- [ ] Add `error.jsx` boundaries so unexpected exceptions don't surface stack traces
- [ ] Wire Sentry / Logflare / similar so 500s in production are observable
- [ ] Rotate the service-role key (the one in env was generated for early dev; create a fresh one for prod)
