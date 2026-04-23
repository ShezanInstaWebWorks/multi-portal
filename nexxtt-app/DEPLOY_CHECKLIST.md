# Deploy Checklist

## Before first production deploy

### Supabase
- [ ] Create production project (separate from "Multi Portal" dev project)
- [ ] Apply all migrations to production: schema, RLS, column REVOKEs, RPCs (`expire_invites`, `generate_monthly_commissions`, `generate_job_number`), triggers (`handle_new_user`, `update_agency_job_count`)
- [ ] Seed `services` and `platform_config` (see `supabase/seed.sql` per spec §43)
- [ ] Enable RLS on every table (verify with: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;` — should return zero rows)
- [ ] Set JWT expiry to 3600s
- [ ] Enable point-in-time recovery
- [ ] Enable `pg_cron` extension
- [ ] Schedule cron jobs: `expire-client-invites` daily, `generate-monthly-commissions` monthly
- [ ] Storage: create `agency-logos` (public), `delivered-files` `brief-uploads` `brand-assets` (private)
- [ ] Storage CORS: allow `nexxtt.io` and `*.nexxtt.io`
- [ ] Set up SMTP via Resend in Supabase Auth settings
- [ ] Configure `email_confirmed=true` for auto-magic-link signup, disable for invite type
- [ ] Rotate service-role key (current one was for dev)

### Stripe
- [ ] Switch to live keys
- [ ] Configure webhook endpoint at `https://nexxtt.io/api/webhooks/stripe`
- [ ] Subscribe to events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] Capture `STRIPE_WEBHOOK_SECRET` from the dashboard
- [ ] Test in Stripe test-mode end-to-end before flipping to live

### Resend
- [ ] Verify the sending domain (or set up `*.nexxtt.io` wildcard subdomain)
- [ ] **Resolve BUG_LOG O-001**: configure per-agency from-domain or a `<slug>.nexxtt.io` wildcard
- [ ] Set `RESEND_API_KEY` in production env
- [ ] Send a test invite to a real address; verify formatting in Gmail + Outlook + Apple Mail

### Vercel
- [ ] Connect repo
- [ ] Set production env vars (see §19 of architecture spec):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `RESEND_API_KEY`
  - `NEXT_PUBLIC_APP_URL=https://nexxtt.io`
  - `NEXT_PUBLIC_SUPABASE_REDIRECT_URL=https://nexxtt.io/api/auth/callback`
- [ ] Verify env vars are scoped to Production only (not Preview/Development)
- [ ] Enable build-time secret scanning in Vercel
- [ ] Add `*.nexxtt.io` wildcard domain (for white-label custom subdomains, even if not used in v1)

## Verify after deploy

### Smoke + permission test against production
```bash
# Update scripts to point at production URL, then:
node scripts/test-all.mjs
```
Required: all three suites green.

### Manual checks
- [ ] Visit `https://nexxtt.io/login` — page loads, no console errors
- [ ] Sign in as a known admin — see `/admin/`
- [ ] Sign in as an agency persona — see `/agency/dashboard` with the D view + List toggle
- [ ] Sign in as an agency_client — see `/portal/[agencySlug]/[clientSlug]`, **scan for "nexxtt", "cost", "profit"** in the rendered page
- [ ] Network tab: confirm no `service_role` key strings anywhere in the bundle
- [ ] Place a test order via Stripe test-mode card 4242…
- [ ] Verify webhook hit + balance debit + email sent

### Observability
- [ ] Wire Sentry (or equivalent) for runtime exceptions
- [ ] Set up an uptime check on `/login`
- [ ] Set up alerts for `/api/webhooks/stripe` 5xx
- [ ] Confirm Vercel function logs are queryable

## Pre-launch security checklist

- [ ] Run `permission-fuzz.mjs` against production — 25/25 must pass
- [ ] Verify `cost_price_cents`/`total_cost_cents` REVOKE is in production DB
- [ ] Confirm `proxy.js` is deployed (look for "Proxy (Middleware)" in Vercel build output)
- [ ] Manual: try to navigate `/admin` while signed in as agency — must redirect to `/login`
- [ ] Manual: try to POST `/api/clients/invite` without a session — must 401
- [ ] Manual: as Sarah (agency_client), try to GET another agency's `/portal/...` — must 404 (RLS filters out the client row)
- [ ] Resolve BUG_LOG O-001 (Resend from-address) before launch

## Rollback plan

- Vercel: instant rollback via dashboard to previous deployment
- DB: PITR to last known good timestamp; for forward-only schema changes, write reverse migrations BEFORE deploying
- Stripe: webhooks queue and retry — if endpoint is broken, revert + replay missed events from Stripe dashboard
