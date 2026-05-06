# nexxtt.io — Development Changelog

> Session summary of all changes made to the multi-portal Next.js app.

---

## 1. Agency Client Portal — Role & Rules Overhaul

### Rules enforced
- Agency clients **cannot place orders** — only view, approve, or reject
- Removed compose/request form for `agency_client` viewer role
- Renamed sidebar nav: **"Requests" → "Messages"**, added **"Settings ⚙️"**
- Added `/portal/.../settings` page with password change + account info strip

### New 3-step review chain
```
Admin does work
    ↓  (admin submits)
agency_review        ← agency reviews before client sees anything
    ↓  (agency forwards)
in_review            ← client can approve or request revision
    ↓
delivered / revision_requested
```

### Files changed
| File | What changed |
|---|---|
| `app/api/projects/[id]/submit-review/route.js` | Admin: `in_progress → agency_review`; Agency: `agency_review → in_review` |
| `components/project-detail/ProjectDetailView.jsx` | New panel conditions; `submitMode` prop passed to `SubmitForReviewPanel` |
| `components/project-detail/SubmitForReviewPanel.jsx` | `mode` prop: `to_agency` / `to_client` / `direct` — context-aware copy + colours |
| `components/project-detail/ProjectStages.jsx` | `agency_review` stage added to all 5 service flows |
| `components/shared/StatusBadge.jsx` | `agency_review` → "Agency Review" (blue); `in_review` relabelled "Client Review"; added `rejected`, `cancelled`, `pending_admin_approval` |
| `app/portal/.../ClientSidebarContent.jsx` | Nav renamed; Settings added |
| `app/portal/.../settings/page.jsx` | New page — account info + `PasswordChangeCard` |
| `components/layout/PortalTopbar.jsx` | New — no "New Order" button, uses `useClientPortalStore` |

---

## 2. Agency Client Portal — Full UI Redesign (Wireframe Match)

### New component: `ClientPortalProjectView`
Replaced the shared `ProjectDetailView` in the client portal with a client-optimised layout:

- **Hero** — brand gradient, progress bar (0–100%), stage pill (`Stage N · Current → Next`), due date, status badge
- **Review action panel** — prominent "Approve ✓" + "Request changes" buttons when `status = in_review`
- **Revision banner** — shown when `status = revision_requested`, quotes the revision note
- **Deliverables section** — signed download links when files exist
- **"What's been done"** — collapsible accordion (closed by default), timeline built from `created_at`, brief, `start_date`, files, `approved_at`
- **"What's happening now"** — collapsible accordion (open by default), current stage description + numbered next-steps rows
- **Chat** — `ChatPanel` embedded on the **right side** in a two-column desktop layout (`grid-cols-[1fr_360px]`), sticky

### Files changed
| File | What changed |
|---|---|
| `components/client-portal/ClientPortalProjectView.jsx` | New component (full wireframe layout) |
| `app/portal/.../projects/[id]/page.jsx` | Switched to `ClientPortalProjectView`; removed tab system; passes `brand` |

---

## 3. Portal Dashboard — Orders Grouped by Order (Accordion)

### Problem
Projects were flattened into a single table, making it impossible to tell which project belonged to which order.

### Solution: `ClientOrderList` component
Each job (order) is a collapsible card:
- **Header**: order number, date, service names, rush flag, summary badge
- **Badge logic**: "N to review" (amber) > "In Progress" (teal) > "Delivered ✓" (green)
- **Auto-opens** orders with `in_review` projects; falls back to first order
- **Inside each card**: service icon + name, due date, status badge, "Review →" / "View →" action button
- Orders in `pending_admin_approval` hidden from client (not yet confirmed by admin)

### Files changed
| File | What changed |
|---|---|
| `components/client-portal/ClientOrderList.jsx` | New accordion component |
| `app/portal/.../page.jsx` | Uses `ClientOrderList`; removed flat `allProjects` array; filters pending orders |

---

## 4. Agency Partner Portal — Made Fully Dynamic

### What was hardcoded → now dynamic

| Component | Was | Now |
|---|---|---|
| `AgencySidebar` agency card | `"Bright Agency Co."`, `"BA"` | Real `agencyName` + `agencyInitials` from DB |
| `AgencySidebar` user footer | `"Alex Johnson"`, `"AJ"`, `"Admin"` | Real `userName`, `userInitials`, `userRole` from `user_profiles` |
| `AgencySidebar` All Orders badge | Hardcoded `"4"` | Live count from `jobs` table |
| `Step3ConfirmPay` card detail | `"Visa ending in 4242"` | `"Processed via Stripe"` |
| `OrderWizard` terms checkbox | `termsAccepted: true` (pre-ticked) | `termsAccepted: false` (user must tick) |

### Files changed
| File | What changed |
|---|---|
| `components/layout/AgencySidebar.jsx` | Accepts `agencyName`, `agencyInitials`, `userName`, `userInitials`, `userRole`, `ordersCount` props |
| `app/agency/layout.jsx` | Fetches real context via `resolveAgencyContext()`; computes all sidebar props; passes to both desktop + mobile sidebar |
| `components/order-builder/Step3ConfirmPay.jsx` | Removed fake card details |
| `components/order-builder/OrderWizard.jsx` | Fixed terms default |

---

## 5. Admin Must Confirm Orders Before Work Begins

### New order flow
```
Agency places order
    ↓
status: pending_admin_approval   ← NEW — held here
    ↓  Admin confirms
status: brief_pending            ← work can now begin
    ↓  OR admin rejects
status: rejected + balance refunded
```

### Admin interface
- **Alert banner** on `/admin/orders` when pending orders exist
- **Filter tabs**: All · ⏳ Pending approval (with count badge) · Brief pending · In progress · In review · Delivered · Rejected
- **Inline confirm/reject** per pending row in `AdminOrdersTable`
  - Confirm → green button → POST `/api/admin/jobs/[id]/confirm`
  - Reject → red button → expands inline reason input → POST `/api/admin/jobs/[id]/reject`

### Agency interface
- "⏳ Pending Approval" and "Rejected" filter tabs in `OrdersList`
- Yellow banner when pending orders exist: *"Work will begin once the admin confirms"*

### Files changed
| File | What changed |
|---|---|
| `app/api/jobs/route.js` | Initial status → `pending_admin_approval`; notifies all admin users |
| `app/api/admin/jobs/[id]/confirm/route.js` | New — activates job + projects → `brief_pending`; notifies agency |
| `app/api/admin/jobs/[id]/reject/route.js` | New — cancels job + projects; refunds balance; notifies agency with reason |
| `components/admin/AdminOrdersTable.jsx` | Confirm/reject buttons per pending row; inline reject reason form |
| `app/admin/orders/page.jsx` | Pending count query; alert banner; filter tabs |
| `components/orders/OrdersList.jsx` | Pending/rejected filter tabs; pending banner for agency |

---

## 6. New Order — Service Selection Fixed

### Root causes (3 bugs)
1. `Step1BuildOrder` read `pkgs[0]?.service_icon` / `pkgs[0]?.service_name` — these fields don't exist on `service_packages` rows → every service showed "•" and the raw slug
2. All service sections started **collapsed** by default — nothing visible to click
3. The sidebar **"Set Pricing →" button had no `onClick`** — looked interactive, did nothing

### Fixes
- Services looked up from the `services` prop by slug → real icon + name
- `openSections` initialised to `{ [slug]: true }` for every service — all open by default
- Button wired to `onNext` prop from `OrderWizard` with context-aware hint text

### New order page — clients not loading
- Old page used session supabase client (blocked by RLS) to fetch clients
- Switched to `resolveAgencyContext()` + admin client — same pattern as all other agency pages

### Files changed
| File | What changed |
|---|---|
| `components/order-builder/Step1BuildOrder.jsx` | Full rewrite — accepts `services` prop; sections open by default; `onNext` wired; rush toggle per service |
| `app/agency/orders/new/page.jsx` | Uses `resolveAgencyContext()` + admin client for all reads |

---

## 7. File Attachments on New Orders

### Flow
```
Agency selects files in Step 1
    ↓  (uploaded immediately on selection)
POST /api/order-attachments → Supabase Storage bucket: order-attachments
    ↓  (returns { path, name, size, mime })
Stored in OrderWizard state
    ↓  (on order submit)
Included in job payload → stored in each project's brief JSON as _attachments
    ↓  (admin views project brief)
BriefRenderer shows downloadable file links (fetches signed URL on click)
```

### Features
- Drag & drop or click to select
- Up to **8 files**, max **20 MB** each
- Upload progress indicator; per-file remove button
- Storage bucket **auto-created** on first upload if not yet provisioned
- Download links in project brief fetch a **1-hour signed URL** on demand

### Files changed
| File | What changed |
|---|---|
| `app/api/order-attachments/route.js` | New — POST (upload) + GET (signed URL); auto-creates bucket |
| `components/order-builder/OrderAttachments.jsx` | New — drag & drop file picker component |
| `components/order-builder/OrderWizard.jsx` | `attachments` state; included in job payload; `OrderAttachments` rendered in Step 1 |
| `components/order-builder/Step1BuildOrder.jsx` | Renders `OrderAttachments` below client selector |
| `app/api/jobs/route.js` | Accepts `attachments`; merges into brief JSON as `_attachments` |
| `components/project-detail/ProjectDetailView.jsx` | `BriefRenderer` renders `_attachments` as clickable download buttons; `AttachmentLink` sub-component with lazy signed URL fetch |

---

## 8. Bug Fixes

| Bug | Root cause | Fix |
|---|---|---|
| `useNotifications` Realtime error: *"cannot add postgres_changes callbacks after subscribe()"* | React Strict Mode double-invoke — cleanup reset guard but stale async continuation completed after cleanup, calling `.on()` on already-subscribed channel | Added `cancelled` flag; unique channel name per mount (`notifications:userId:Date.now()`) |
| Admin confirm/reject silently failing | Routes tried to update non-existent columns (`confirmed_at`, `confirmed_by`, `rejected_at`, `rejected_by`, `reject_reason`) on `jobs` table | Only update `status`; reason stored in notification body only |
| `AttachmentLink` runtime crash | Used `React.useState` but `React` was not imported in `ProjectDetailView.jsx` | Added `import { useState } from "react"`; switched to named import |
| 10× Tailwind canonical class warnings in `ProjectDetailView` | Arbitrary values where canonical classes exist | Replaced all: `max-w-[1100px]→max-w-275`, `z-[1]→z-1`, `rounded-[16px]→rounded-lg`, `py-[2px]→py-0.5`, `py-[1px]→py-px` |

---

## 9. Wallet System — Prepaid Balance for All Portals

### Architecture
- `wallet_transactions` table tracks every credit/debit with `amount_cents`, `balance_after_cents`, `type`, `description`
- Balance lives on the agency/direct user's profile row (`balance_cents`)
- Admin can manually adjust any wallet via `AdminWalletAdjustPanel`

### Endpoints
| Route | Purpose |
|---|---|
| `GET /api/wallet/balance` | Returns `balanceCents` + last 20 transactions for current user |
| `POST /api/wallet/instant-topup` | Credits wallet instantly (demo/test path — no Stripe round-trip) |
| `POST /api/wallet/topup-intent` | Creates Stripe PaymentIntent for real top-up |
| `POST /api/stripe/webhook` | Handles `payment_intent.succeeded` → credits wallet |
| `POST /api/wallet/adjust` | Admin-only — manual credit or debit with reason |

### UI components
| Component | Where |
|---|---|
| `components/wallet/WalletCard.jsx` | Collapsible balance widget embedded in dashboards; shows recent activity; "Top up" button |
| `components/wallet/TopUpDialog.jsx` | Modal with quick-amount chips ($10/$25/$50/$100) + custom amount; instant credit for demo |
| `components/wallet/AdminWalletAdjustPanel.jsx` | Admin panel — select agency/user, enter amount, credit or debit |

### Files changed
| File | What changed |
|---|---|
| `app/api/wallet/balance/route.js` | New |
| `app/api/wallet/instant-topup/route.js` | New |
| `app/api/wallet/topup-intent/route.js` | New (Stripe PaymentIntent) |
| `app/api/stripe/webhook/route.js` | New — `payment_intent.succeeded` handler |
| `app/api/wallet/adjust/route.js` | New — admin manual adjust |
| `components/wallet/WalletCard.jsx` | New |
| `components/wallet/TopUpDialog.jsx` | New |
| `components/wallet/AdminWalletAdjustPanel.jsx` | New |

---

## 10. Agency Finance — Balance Page

A dedicated `/agency/finance/balance` page for agency users to view their prepaid balance and top up.

- Full transaction history with credit (top-up, refund) / debit (order charge) rows
- `TrendingUp` / `TrendingDown` icons colour-coded green / red
- Inline top-up: same quick-amount chips as `TopUpDialog`
- Balance updates optimistically on successful top-up (no page reload)

### Files changed
| File | What changed |
|---|---|
| `app/agency/finance/balance/page.jsx` | New server page — fetches agency + transactions |
| `app/agency/finance/balance/AgencyBalanceClient.jsx` | New client component — full balance UI |
| `app/api/agency/balance-topup/route.js` | New — agency-facing top-up POST (credits via `wallet.js`) |

---

## 11. Order Wizard — Full Redesign (Agency)

Replaced the old 4-step wizard (Step1Services → Step2Brief → Step3Client → Step4Confirm) with a streamlined 3-step flow.

### New step structure
```
Step 1 — Build Order   (service + package selection, rush toggle, client selector)
Step 2 — Set Pricing   (per-project retail price override by agency)
Step 3 — Confirm & Pay (order summary, balance deduction, terms checkbox)
```

### Key changes
- `Step1BuildOrder` completely rewritten — sections open by default; real service icon/name from `services` prop; `onNext` wired; `OrderAttachments` embedded below client selector
- `Step2SetPricing` — new component; agency sets what the client will see as their price (can mark up over cost)
- `Step3ConfirmPay` — removed fake "Visa ending in 4242"; shows "Processed via balance" with live balance; terms must be ticked
- `OrderWizard` — `termsAccepted` default changed to `false`; `attachments` state threaded through all steps

### Files changed
| File | What changed |
|---|---|
| `components/order-builder/Step1BuildOrder.jsx` | Full rewrite |
| `components/order-builder/Step2SetPricing.jsx` | New |
| `components/order-builder/Step3ConfirmPay.jsx` | Removed fake card; balance display |
| `components/order-builder/OrderWizard.jsx` | Updated step routing; terms default fix |
| Old `Step2Brief.jsx`, `Step3Client.jsx`, `Step4Confirm.jsx` | Removed / replaced |

---

## 12. Direct Client Portal — New Order Flow

Direct clients (no agency intermediary) can now place orders end-to-end through their own portal.

### Flow
```
/direct/orders/new
    → DirectOrderWizard (Step 1: Build Order, Step 2: Confirm & Pay)
    → POST /api/direct-orders
    → projects created, email sent, balance debited
```

### Features
- `DirectOrderWizard` — 2-step wizard scoped to `direct_client` role
- `DirectStep1BuildOrder` — service/package selection with rush toggle; file attachments
- `DirectStep2ConfirmPay` — shows user email, itemised order, payment method toggle (card / wallet), terms
- `POST /api/direct-orders` — validates `direct_client` role; prices from `services` table; applies rush surcharge from `platform_config`; creates `jobs` + `projects` rows; sends `OrderPlacedEmail`

### Files changed
| File | What changed |
|---|---|
| `app/api/direct-orders/route.js` | New — full order creation for direct clients |
| `app/direct/orders/new/page.jsx` | Updated to use `DirectOrderWizard` |
| `components/order-builder/DirectOrderWizard.jsx` | New |
| `components/order-builder/DirectStep1BuildOrder.jsx` | New |
| `components/order-builder/DirectStep2ConfirmPay.jsx` | New |

---

## 13. Service Browser Drawer

A slide-in drawer that lets users browse all available services before adding them to an order.

- Searchable service grid; click a service → shows packages in the same drawer
- Package cards show tier, price, delivery days, feature bullets
- "Add to order" button updates the wizard's `selections` state; closes drawer
- Used in both the agency `Step1BuildOrder` and `DirectStep1BuildOrder`

### Files changed
| File | What changed |
|---|---|
| `components/project-requests/ServiceBrowserDrawer.jsx` | New |

---

## 14. Request System Overhaul

### Multi-service requests
One `project_requests` row can now carry multiple service line-items (migrated from single-service).

- New DB migration: `db/migrations/multi_service_requests.sql` — adds `items jsonb[]` column
- `RequestForm` rebuilt: service browser drawer inline; per-service package selector; attachment upload
- `RequestCard` rebuilt: shows all service items; action buttons contextual to role

### Request attachments
- New DB migration: `db/migrations/request_attachments.sql`
- New route: `POST /api/project-requests/[id]/attachment` — uploads file, records in `request_attachments` table
- `RequestCard` renders attached files with signed-URL download

### Admin "New Direct Request" panel
- `AdminNewDirectRequestPanel` — admin can create a request on behalf of a direct client from the requests page

### Files changed
| File | What changed |
|---|---|
| `db/migrations/multi_service_requests.sql` | New |
| `db/migrations/request_attachments.sql` | New |
| `app/api/project-requests/route.js` | Multi-service items support |
| `app/api/project-requests/[id]/route.js` | Full CRUD + status transitions |
| `app/api/project-requests/[id]/attachment/route.js` | New |
| `components/project-requests/RequestForm.jsx` | Full rewrite |
| `components/project-requests/RequestCard.jsx` | Full rewrite |
| `components/project-requests/AdminNewDirectRequestPanel.jsx` | New |

---

## 15. Auth & Signup Pages

### SignupClient + LoginClient
- `app/login/LoginClient.jsx` — extracted client component from `login/page.jsx`; keeps SSR shell clean
- `app/signup/SignupClient.jsx` — new client component for signup flow
- `app/signup/agency/pending/page.jsx` — holding page shown after agency signup while awaiting admin approval
- `app/post-login/page.jsx` — post-login redirect logic moved here; role-based routing

### Agency signup API
- `app/api/auth/signup/agency/route.js` — creates `user_profiles` row with `role: agency`; marks `pending_approval: true`; notifies admin
- `app/api/auth/signup/direct/route.js` — creates `user_profiles` row with `role: direct_client`

### Referral tracking
- `app/ref/[code]/route.js` — sets `ref_code` cookie; redirects to signup

### Files changed
| File | What changed |
|---|---|
| `app/login/LoginClient.jsx` | New (extracted) |
| `app/signup/SignupClient.jsx` | New |
| `app/signup/agency/pending/page.jsx` | New |
| `app/post-login/page.jsx` | New |
| `app/ref/[code]/route.js` | New |
| `app/api/auth/signup/agency/route.js` | New |
| `app/api/auth/signup/direct/route.js` | New |

---

## 16. Project Workspace

Admin gets a full workspace view for each project with task management, chat, and controls.

### Components
| Component | Purpose |
|---|---|
| `ProjectWorkspaceRealtime.jsx` | Subscribes to `projects` + `tasks` + `messages` channels; updates parent state |
| `AdminProjectControls.jsx` | Start work, submit for review, mark delivered, assign team member |
| `TaskBoard.jsx` | Kanban-style task board (todo / in_progress / done columns) |
| `TaskProgress.jsx` | Progress bar derived from task completion % |
| `ProjectChatTabs.jsx` | Tabs: Internal chat · Client messages |
| `ProjectTabs.jsx` | Tabs: Overview · Tasks · Chat · Files |
| `StartWorkPanel.jsx` | Shown when `status = brief_pending`; admin clicks to move to `in_progress` |

### New API routes
| Route | Purpose |
|---|---|
| `POST /api/admin/projects/[id]` | Admin update (status, assignee, notes) |
| `POST /api/admin/projects/[id]/tasks` | Create task |
| `PATCH /api/admin/projects/[id]/tasks/[taskId]` | Update task status |
| `POST /api/projects/[id]/start` | Move project `brief_pending → in_progress` |
| `POST /api/projects/[id]/revision` | Accept revision request; move back to `in_progress` |

---

## 17. Notifications & Toast System

### Toast
- `components/shared/Toast.jsx` — global toast provider; `useToast()` hook returns `toast.success()`, `toast.error()`, `toast.info()`
- Mounted in `app/providers.jsx`

### Notification links
- `lib/notification-links.js` — maps notification `type` → portal-specific deep-link URL (admin / agency / client / direct)
- `lib/request-notifications.js` — helpers that fire notifications for all request lifecycle events

---

## 18. Playwright Test Suite

End-to-end test coverage added for all 4 portals.

| Test file | Covers |
|---|---|
| `tests/01-login.spec.js` | Login flow, role redirect |
| `tests/02-admin.spec.js` | Admin dashboard, order management |
| `tests/03-agency.spec.js` | Agency order placement, client invite |
| `tests/04-client-portal.spec.js` | Client project review, approval |
| `tests/05-direct-client.spec.js` | Direct order placement |
| `tests/06-crud-operations.spec.js` | CRUD smoke test across entities |
| `tests/07-navigation.spec.js` | Sidebar nav, deep-links |

Config: `playwright.config.js` — base URL from `NEXT_PUBLIC_SITE_URL`; 3 projects (chromium, firefox, webkit).

---

## Database — Schema Additions

| Migration | What it adds |
|---|---|
| `db/migrations/service_packages.sql` | `service_packages` table; seeds default packages for each service |
| `db/migrations/multi_service_requests.sql` | `items jsonb[]` column on `project_requests` |
| `db/migrations/request_attachments.sql` | `request_attachments` table |

All status columns (`projects.status`, `jobs.status`) remain plain `text` — no check constraint changes needed for new statuses.

The `order-attachments` Supabase Storage bucket is auto-provisioned by the upload API on first use.

---

## 19. Session Refresh Fix — `proxy.js`

### Problem
Next.js 16 uses `proxy.js` as its built-in middleware convention (replacing `middleware.js`). The `proxy.js` file existed but its `setAll` cookie handler was rebuilding `NextResponse.next()` with the original request headers, so refreshed Supabase tokens were written to the browser cookie but the downstream server components still received the expired token. After ~1 hour (Supabase access token TTL), `resolveAgencyContext()` returned `ctx.agencyId = null`, causing every page that checks `if (!ctx.agencyId) redirect("/agency/dashboard")` to loop back to the dashboard.

### Fix
`proxy.js` `setAll` handler now rebuilds the `cookie` header from `req.cookies.getAll()` (which already contains the updated values) before calling `NextResponse.next({ request: { headers: newHeaders } })`. This ensures all downstream server components receive the refreshed session on every request.

### Files changed
| File | What changed |
|---|---|
| `proxy.js` | `setAll` rebuilds cookie header from updated `req.cookies` before creating forwarded request |

---

## 20. Agency Dashboard — Prepaid Balance Widget

Balance chip added to the welcome strip in `DashboardD`:
- Shows live `agency.balance_cents` formatted as currency
- Teal-accented chip with wallet icon
- "Top up" button links directly to `/agency/finance/balance`
- No extra fetch — reads from the `agency` prop already passed to the component

### Files changed
| File | What changed |
|---|---|
| `components/dashboard/DashboardD.jsx` | Added `Wallet` icon import; balance chip in welcome strip |

---

## 21. Agency Client Payment — Fully Removed

Agency clients (portal viewers) do not pay. The payment infrastructure was built but never exposed; now fully stripped.

### Code changes
| File | What changed |
|---|---|
| `lib/wallet.js` | Removed `agency_client` branch from `resolveWalletOwnerForViewer` — only `direct_client` returns a wallet |
| `app/api/wallet/topup-intent/route.js` | Hard-blocks non-`direct_client` roles with 403; removed `ensureClientStripeCustomer` import |

### Database cleanup
- Deleted all `wallet_transactions` rows where `client_id IS NOT NULL` (agency-client ledger)
- Cleared `stripe_customer_id` on all `clients` rows

Direct client payment system (`WalletCard`, `/api/wallet/*`, Stripe webhook) is fully intact.

---

## 22. Admin Order Drawer — Embed Fix & "Open Full Page" Removed

### Problem
Clicking a sibling project tab (Logo Design, Brand Guidelines, etc.) inside the order drawer iframe navigated to `/admin/projects/[id]` without `?embed=1`, causing the full app shell (sidebar + topbar) to appear inside the drawer.

### Fix
- `ProjectDetailView` → `SiblingProjectSwitcher` accepts a `querySuffix` prop; links render as `` `${baseHref}/${p.id}${querySuffix}` ``
- Admin project page passes `querySuffix: "?embed=1"` when `isEmbed === true`
- "Open full page" button removed from `OrderDrawer` (and `openHref` prop dropped)

### Files changed
| File | What changed |
|---|---|
| `components/admin/OrderDrawer.jsx` | Removed `openHref` prop, `ExternalLink` import, and "Open full page" button |
| `components/project-detail/ProjectDetailView.jsx` | `SiblingProjectSwitcher` accepts + uses `querySuffix` |
| `app/admin/projects/[id]/page.jsx` | Passes `querySuffix: "?embed=1"` to siblings when `isEmbed` |
| `components/admin/AdminOrdersTable.jsx` | Removed `openHref` prop from `OrderDrawer` usage |

---

## 23. Project Stages — Agency Review Hidden from Client + Agency Action Panel

### Problems
1. Client portal showed "Agency review ✓" (an internal admin↔agency step) to the end client
2. Agency had no way to request changes back to admin when reviewing — only "Forward to client" existed
3. `content-writing` `in_review` stage was labelled "Your review" (ambiguous) in the admin/agency view

### Fixes

#### Client portal (`ClientPortalProjectView.jsx`)
- Removed `agency_review` from all `STAGE_FLOWS`
- Added `clientStatus()` normaliser: maps `agency_review → in_progress` for all stage calculations (progress %, current stage, next stages)
- Client now sees "In production / Drafting posts / Designing…" while admin submits to agency — the internal review is invisible

#### Agency action panel (`SubmitForReviewPanel.jsx`)
When `mode = "to_client"` (agency reviewing admin's work), the panel now shows two actions:
- **Forward to client** — existing approve path (`agency_review → in_review`)
- **Request changes from nexxtt.io** — expands an inline textarea; agency describes what needs changing; on submit calls new API route → project moves `agency_review → in_progress`, note posted to project-admin chat, all admins notified

#### New API route
`POST /api/projects/[id]/agency-revision-request`
- Validates `role = "agency"` and agency owns the project
- Requires `status = "agency_review"`
- Transitions `agency_review → in_progress`
- Posts note to `tier = "project_admin"` conversation
- Notifies all admin users with deep-link to `/admin/projects/[id]?tab=chat`

#### Label fix (`ProjectStages.jsx`)
- `content-writing` `in_review` stage: `"Your review"` → `"Client review"`
- Fixed two Tailwind canonical class warnings (`-left-[13px]` → `-left-3.25`, `py-[1px]` → `py-px`)

### Files changed
| File | What changed |
|---|---|
| `components/client-portal/ClientPortalProjectView.jsx` | Removed `agency_review` from all flows; added `clientStatus()` normaliser |
| `components/project-detail/SubmitForReviewPanel.jsx` | Added "Request changes" button + textarea + API call for `to_client` mode |
| `app/api/projects/[id]/agency-revision-request/route.js` | New — `agency_review → in_progress` with admin notification |
| `components/project-detail/ProjectStages.jsx` | content-writing label fix; Tailwind warnings cleaned |

---

## 24. Conversations Backfill — Cascade Fix

`TRUNCATE TABLE messages, projects, jobs, wallet_transactions RESTART IDENTITY CASCADE` silently wiped all `conversations` rows because `conversations.project_id` has a FK → `projects`. This caused the agency Requests & Messages sidebar to show no clients.

**Fix:** Recreated all `agency` tier conversations for every client via direct SQL insert:
```sql
INSERT INTO conversations (tier, agency_id, client_id)
SELECT 'agency', c.agency_id, c.id FROM clients c
WHERE c.agency_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

**Lesson:** When truncating with CASCADE, always check `information_schema.table_constraints` for FK dependencies first.

---

*Updated: 2026-05-06*
