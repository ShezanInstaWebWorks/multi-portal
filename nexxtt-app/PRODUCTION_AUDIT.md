# nexxtt.io — Production Audit

Started: 2026-04-21

## Scope boundaries

The spec describes a 33-step build. This audit covers what was actually built.
Features still marked "Phase 2" in the spec (Stripe, Resend live, custom domain
rewrites, E2E Playwright, most Edge Functions) are noted under "Gaps vs spec"
rather than fixed here — they are new feature work, not production hardening.

This audit focuses on: **auth, RLS, white-label leak, API hostile input, payments
wiring safety, and mobile usability** of what is already implemented.

## Phases

- [x] P1 — Map codebase vs spec, dead routes, mocks
- [ ] P2 — Build + env validation
- [ ] P3 — Role/permission fuzzing across 5 personas
- [ ] P4 — White-label leak audit (cost/profit/nexxtt branding in client portal)
- [ ] P5 — API route hostile-input audit (ownership checks on POST/PATCH/DELETE)
- [ ] P6 — Fix Critical/High issues
- [ ] P7 — Critical-path automated tests
- [ ] P8 — Final report + deploy checklist

## Severity legend
- **C** Critical — security, data leak, payment, role bypass, core flow broken
- **H** High — major flow broken, white-label leak, mobile unusable, data inconsistency
- **M** Medium — partial feature break, missing state, confusing UX
- **L** Low — cosmetic / copy / cleanup
