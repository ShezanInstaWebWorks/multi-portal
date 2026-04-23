# nexxtt.io — Test Plan

## Automated suites

All three are node scripts. Server must be running on `:3210` (start with `npm run start` after `npm run build`).

```bash
node scripts/test-all.mjs           # runs all three
node scripts/smoke-all.mjs          # 5-persona auth + RLS + RPC + storage smoke
node scripts/route-sweep.mjs        # every gated route returns 200 with real session
node scripts/permission-fuzz.mjs    # 25 cross-role API permission checks
```

Exit code = 0 if green, non-zero on any failure. Suitable for CI.

## What each suite covers

### `smoke-all.mjs` — 31 checks
- All 5 personas sign in successfully and have correct `user_metadata.role`
- Each persona reads their own `user_profiles` row
- Alex (agency) reads jobs + clients via session, **cannot** see `total_cost_cents` (column-level REVOKE)
- Sarah (agency_client) reads her own client + brand + jobs; cannot see other clients
- Marcus (direct_client) reads own jobs; sees 0 agency jobs
- James (referral_partner) reads partner row + referrals + commission entries
- Riya (admin) profile gate works; service-role sees all agencies
- `expire_invites()` and `generate_monthly_commissions()` RPCs callable
- Required Storage buckets exist
- Realtime publication wired

### `route-sweep.mjs` — every gated route
For each persona, signs in and curls every page they should reach. Reports any 500 or unexpected 404. Routes that aren't built yet (e.g. `/referral/commissions`) are listed but expected.

### `permission-fuzz.mjs` — 25 checks
- 10 anon checks: every protected POST/PATCH/DELETE returns 401
- 3 agency-as-non-admin: admin endpoints return 403
- 4 client-as-non-agency: agency endpoints return 403
- 5 referral-as-nothing: every write endpoint returns 403
- 3 direct-as-non-agency: agency/admin endpoints return 403
- 3 admin happy-path: admin endpoints return 200/404 (404 = endpoint reached, body referenced fake ID)

## What's NOT covered (manual)

- Mobile responsiveness at 320/375/480/768/1024/1280px
- Email rendering across Gmail/Outlook/Apple Mail (only the JSX renders)
- Stripe + Resend live integration (keys empty in env)
- Drag-and-drop kanban (Phase 2)
- Custom domain rewrite (Phase 2)
- E2E: agency invite → client accepts → client approves
- Accessibility audit with screen reader

## Adding new tests

Critical paths to script when ready:
1. Place an order end-to-end (POST /api/jobs with valid payload) and verify balance debit + notifications
2. Invite a client (POST /api/clients/invite) and verify the auth user was created
3. Approve a project (POST /api/projects/[id]/approve) as the actual client
4. Raise + resolve a dispute end-to-end

These all become trivial extensions of `permission-fuzz.mjs` once you have a fixture set of project IDs.
