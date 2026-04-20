# nexxtt.io — Platform Architecture & Build Specification

> Primary reference for building the nexxtt.io platform with Claude Code.
> **Stack: Next.js · JavaScript · Supabase · Tailwind CSS · shadcn/ui · MUI**
> All portals are fully mobile-responsive.

---

## 1. What nexxtt.io Is

nexxtt.io is a **B2B2C design-services marketplace** with white-label capability. It sits invisibly behind agencies, letting them resell design services (websites, logos, brand kits, social media, content) to their own clients under their own brand. It also serves clients directly and runs a referral partner program.

**Core value proposition per user type:**
- **Agencies** — resell premium design at a markup without hiring in-house designers. nexxtt.io is invisible.
- **Agency Clients** — get a branded portal from "their" agency, track projects, approve deliverables.
- **Referral Partners** — share a link, earn 20% of every dollar referred clients spend for 12 months.
- **Direct Clients** — order design directly from nexxtt.io at a fixed retail price.
- **Platform Admin** — nexxtt.io staff with full read/write control over all portals.

---

## 2. Portal Architecture — 5 Distinct Portals

Each portal is a **separate authenticated surface** with its own sidebar, routing, and data scope.

```
nexxtt.io Platform
│
├── 🏢  Agency Portal           → /agency/*
├── 👤  Client Portal           → /portal/[agencySlug]/[clientSlug]/*  (white-label)
├── 🤝  Referral Partner Portal → /referral/*
├── 🏗️  Direct Client Portal    → /direct/*
└── 🛡️  Admin Portal            → /admin/*
```

### 2.1 Portal Access Matrix

| Feature | Agency | Agency Client | Referral Partner | Direct Client | Admin |
|---|---|---|---|---|---|
| Place orders | ✅ (for clients) | ❌ | ❌ | ✅ (for self) | ✅ |
| View order progress | ✅ | ✅ | ❌ | ✅ | ✅ |
| See nexxtt.io branding | ❌ | ❌ | ✅ | ✅ | ✅ |
| See cost / margin | ✅ | ❌ | ❌ | ❌ | ✅ |
| Earn commission | ❌ | ❌ | ✅ | ❌ | ❌ |
| Manage clients | ✅ | ❌ | ❌ | ❌ | ✅ |
| Invite clients | ✅ | ❌ | ❌ | ❌ | ✅ |
| Approve deliverables | ✅ (on behalf) | ✅ | ❌ | ✅ | ✅ |
| Manage platform | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Tech Stack

### 3.1 Core

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Use `app/` directory. JS only — no TypeScript. |
| Language | **JavaScript (ES2022+)** | JSDoc for documentation where types help. No `.ts` files. |
| Styling | **Tailwind CSS v3** | Primary styling. Custom tokens via `tailwind.config.js`. |
| UI Components | **shadcn/ui** | Forms, dialogs, sheets, dropdowns, cards, toasts. |
| Data Tables | **MUI (Material UI) DataGrid** | All dense/compact tables — agencies, orders, clients, finance. Use `@mui/x-data-grid`. |
| Icons | **Lucide React** | Consistent icon set throughout. |
| Fonts | **Bricolage Grotesque** (display) + **Instrument Sans** (body) via `next/font/google` |

### 3.2 Backend & Data

| Layer | Choice | Notes |
|---|---|---|
| Database | **Supabase (PostgreSQL)** | Tables, RLS policies, real-time subscriptions. |
| Auth | **Supabase Auth** | Email/password, magic links, session management, RLS integration. |
| File Storage | **Supabase Storage** | Delivered files, logos, brand assets. Signed URLs for private buckets. |
| Server Functions | **Next.js Route Handlers** (`app/api/`) | API logic runs server-side. Use Supabase service-role key here only. |
| Background Jobs | **Supabase Edge Functions** + **pg_cron** | Commission calculations, invite expiry, auto top-up triggers. |
| Email | **Resend** + **React Email** | Supports custom from-domains (required for white-label). |
| Payments | **Stripe** | Card payments + balance top-ups. Webhooks handled in Route Handlers. |

### 3.3 State Management

| Scope | Tool |
|---|---|
| Server state / data fetching | **SWR** (`useSWR`) or **React Query** |
| Client UI state | **Zustand** (lightweight global store) |
| Form state | **React Hook Form** + basic JS validation (no Zod — keep it simple) |
| Real-time | **Supabase Realtime** (`supabase.channel()`) for live order/job updates |

### 3.4 Component Library Decision: shadcn/ui vs MUI

Use each for its strengths — do **not** mix them arbitrarily:

**shadcn/ui** — use for:
- Navigation (sidebar, topbar, breadcrumbs)
- Forms (inputs, selects, textareas, checkboxes, radio groups)
- Modals and dialogs
- Dropdown menus and command palettes
- Toasts / notifications
- Cards, badges, stat panels
- Buttons, tabs, accordions
- Step wizards

**MUI DataGrid** — use for:
- Any screen that lists multiple rows with sorting, filtering, or pagination
- All Admin tables (agencies, clients, orders, referrals, finance, services)
- Agency tables (all orders list, client list, transaction history)
- Direct client order history
- Use `@mui/x-data-grid` Community edition (free)
- Style DataGrid to match app theme using `sx` prop and MUI theme overrides — override default blue with `#00B8A9` (teal)

---

## 4. Mobile Responsiveness

**Every portal must be fully usable on mobile (320px+), tablet (768px+), and desktop (1024px+).** Mobile-first — design for 375px, then scale up.

### 4.1 Breakpoints (Tailwind)

```js
// tailwind.config.js
screens: {
  sm:  '480px',   // large phones
  md:  '768px',   // tablets / landscape phones
  lg:  '1024px',  // small desktops / laptops
  xl:  '1280px',  // standard desktop
  '2xl': '1536px' // wide screens
}
```

### 4.2 Sidebar — Mobile Behaviour

On desktop (`lg+`): fixed left sidebar, always visible, `w-60` (240px).

On mobile/tablet (`< lg`): sidebar is **hidden by default**, shown as a **slide-in drawer** (use shadcn/ui `Sheet`).

```jsx
// Every portal layout follows this pattern
<Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
  <SheetContent side="left" className="w-60 p-0 bg-navy">
    <SidebarNav />
  </SheetContent>
</Sheet>

{/* Topbar always shows hamburger on mobile */}
<button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
  <Menu className="h-5 w-5" />
</button>
```

### 4.3 Topbar — Mobile Behaviour

- **Desktop:** full topbar — title left, action buttons right.
- **Mobile:** hamburger (left) + page title (centre) + single icon action (right).
- Multiple action buttons collapse into a `DropdownMenu` on mobile triggered by `···`.

### 4.4 Data Tables (MUI DataGrid) — Mobile Strategy

MUI DataGrid is desktop-first. On mobile, switch to card rendering:

```jsx
function ResponsiveTable({ rows, columns }) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        {rows.map(row => <MobileTableCard key={row.id} row={row} />)}
      </div>
    )
  }

  return <DataGrid rows={rows} columns={columns} density="compact" autoHeight />
}
```

- **`< md` (768px):** DataGrid replaced by stacked card-per-row layout, key fields only.
- **`md` to `lg`:** DataGrid with reduced columns via `columnVisibilityModel` — hide low-priority columns.
- **`lg+`:** Full DataGrid with all columns.

### 4.5 Layout Grid Patterns

**Stats / KPI rows:**
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <StatCard ... />
</div>
```

**Two-column layouts (form + preview, form + summary):**
```jsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  <FormPanel />
  {/* Preview panel hidden on mobile — shown in a Sheet instead */}
  <PreviewPanel className="hidden lg:block" />
</div>
{/* Mobile: Preview button opens Sheet */}
<Button className="lg:hidden" onClick={() => setPreviewOpen(true)}>
  Preview Email
</Button>
```

**Multi-step order builder:**
- Mobile: full-screen step, progress shown as a top bar, summary hidden.
- Desktop: step content left, sticky order summary right.

### 4.6 Bottom Navigation (Mobile — Agency & Direct Client)

Sticky bottom nav bar on mobile (`< lg`), supplements the hamburger sidebar:

```jsx
// Agency portal bottom nav
const agencyBottomNav = [
  { href: '/agency/dashboard',  icon: Home,         label: 'Home' },
  { href: '/agency/orders',     icon: ClipboardList, label: 'Orders' },
  { href: '/agency/orders/new', icon: PlusCircle,   label: 'New Order' },
  { href: '/agency/clients',    icon: Users,        label: 'Clients' },
  { href: '/agency/finance',    icon: TrendingUp,   label: 'Finance' },
]
```

```jsx
// BottomNav.jsx — renders only on mobile
<nav className="fixed bottom-0 inset-x-0 bg-white border-t border-border z-50 lg:hidden">
  <div className="flex items-center justify-around h-16">
    {items.map(item => (
      <Link key={item.href} href={item.href}
        className="flex flex-col items-center gap-0.5 text-muted text-[10px] font-semibold min-w-[44px] min-h-[44px] justify-center">
        <item.icon className="h-5 w-5" />
        {item.label}
      </Link>
    ))}
  </div>
</nav>
```

Add `pb-16 lg:pb-0` to all main page content to clear the bottom nav on mobile.

### 4.7 Forms — Mobile Rules

- All inputs `w-full` on all screen sizes.
- Side-by-side pairs: `grid grid-cols-1 sm:grid-cols-2 gap-4`.
- Always-visible labels (never placeholder-only — accessibility).
- Minimum touch target: `min-h-[44px]` for all buttons and tappable elements.
- No hover-only interactions.

### 4.8 Typography Scale

```
Heading (h1): text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold
Heading (h2): text-xl sm:text-2xl font-display font-bold
Heading (h3): text-base sm:text-lg font-display font-bold
Body:         text-sm sm:text-[15px] font-body
Label:        text-xs sm:text-[13px] font-semibold
Micro:        text-[11px] tracking-wide uppercase
```

### 4.9 Mobile Specifics Per Portal

| Portal | Key Mobile Adaptations |
|---|---|
| Agency | Bottom nav with prominent New Order button; wizard steps full-screen; margin calculator in bottom sheet |
| Agency Client | Large approve/reject buttons; deliverable files as a tappable list; swipe-friendly asset viewer |
| Referral Partner | Referral link copy button prominent at top; commission table as stacked cards |
| Direct Client | Order form full-screen; project status as a visual stepper card |
| Admin | All tables as mobile cards; approve/suspend in card footer; alert banner pinned below topbar |

---

## 5. Project Structure

```
nexxtt-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.jsx
│   │   └── layout.jsx
│   ├── agency/
│   │   ├── layout.jsx           ← agency shell (sidebar + topbar + bottom nav)
│   │   ├── dashboard/page.jsx
│   │   ├── orders/
│   │   │   ├── page.jsx
│   │   │   ├── new/
│   │   │   │   ├── page.jsx
│   │   │   │   └── [service]/page.jsx
│   │   │   └── [id]/page.jsx
│   │   ├── clients/
│   │   │   ├── page.jsx
│   │   │   └── invite/page.jsx
│   │   ├── finance/
│   │   │   ├── profit/page.jsx
│   │   │   └── balance/page.jsx
│   │   └── settings/
│   │       ├── page.jsx
│   │       └── portal-preview/page.jsx
│   ├── portal/
│   │   └── [agencySlug]/
│   │       └── [clientSlug]/
│   │           ├── layout.jsx   ← white-label shell with brand injection
│   │           ├── page.jsx
│   │           ├── projects/[id]/page.jsx
│   │           ├── brief/page.jsx
│   │           └── review/page.jsx
│   ├── referral/
│   │   ├── layout.jsx
│   │   └── dashboard/page.jsx
│   ├── direct/
│   │   ├── layout.jsx
│   │   ├── dashboard/page.jsx
│   │   ├── orders/page.jsx
│   │   └── account/page.jsx
│   ├── admin/
│   │   ├── layout.jsx           ← admin shell (purple sidebar)
│   │   ├── page.jsx
│   │   ├── agencies/page.jsx
│   │   ├── clients/page.jsx
│   │   ├── referrals/page.jsx
│   │   ├── orders/page.jsx
│   │   ├── services/page.jsx
│   │   ├── finance/page.jsx
│   │   └── settings/page.jsx
│   ├── api/
│   │   ├── auth/callback/route.js
│   │   ├── agencies/route.js
│   │   ├── clients/route.js
│   │   ├── jobs/route.js
│   │   ├── projects/route.js
│   │   ├── services/route.js
│   │   ├── referrals/route.js
│   │   ├── finance/route.js
│   │   ├── admin/route.js
│   │   └── webhooks/stripe/route.js
│   ├── layout.jsx               ← root layout (fonts, providers)
│   └── globals.css
├── components/
│   ├── ui/                      ← shadcn/ui (auto-generated, do not edit manually)
│   ├── layout/
│   │   ├── AgencySidebar.jsx
│   │   ├── AdminSidebar.jsx
│   │   ├── ClientSidebar.jsx
│   │   ├── Topbar.jsx
│   │   ├── BottomNav.jsx        ← mobile-only bottom tab bar
│   │   └── MobileDrawer.jsx     ← shadcn Sheet wrapping sidebar nav
│   ├── tables/
│   │   ├── OrdersTable.jsx      ← MUI DataGrid + mobile card fallback
│   │   ├── ClientsTable.jsx
│   │   ├── AgenciesTable.jsx
│   │   ├── FinanceTable.jsx
│   │   └── MobileTableCard.jsx  ← card used on mobile instead of DataGrid rows
│   ├── order/
│   │   ├── ServiceSelector.jsx
│   │   ├── OrderSummaryPanel.jsx
│   │   └── MarginCalculator.jsx
│   ├── invite/
│   │   ├── InviteStepDetails.jsx
│   │   ├── InviteStepCustomise.jsx
│   │   ├── InviteStepConfirm.jsx
│   │   └── EmailPreview.jsx
│   ├── stat/
│   │   └── StatCard.jsx
│   └── shared/
│       ├── StatusBadge.jsx
│       ├── PortalPill.jsx
│       ├── EmptyState.jsx
│       └── PageHeader.jsx
├── lib/
│   ├── supabase/
│   │   ├── client.js            ← browser client (anon key)
│   │   ├── server.js            ← server client + admin client
│   │   └── middleware.js
│   ├── muiTheme.js              ← MUI theme override
│   ├── stripe.js
│   ├── resend.js
│   ├── utils.js                 ← formatCurrency, formatDate, slugify
│   └── constants.js             ← service catalog, status labels
├── hooks/
│   ├── useAgency.js
│   ├── useJobs.js
│   ├── useClients.js
│   ├── useBalance.js
│   ├── useRealtime.js           ← Supabase Realtime subscriptions
│   └── useMediaQuery.js         ← responsive switching hook
├── emails/
│   ├── ClientInvite.jsx
│   ├── AgencyWelcome.jsx
│   ├── OrderConfirmation.jsx
│   └── ...
├── middleware.js                ← Next.js middleware (auth + custom domain)
├── tailwind.config.js
└── next.config.js
```

---

## 6. Supabase Setup

### 6.1 Client Setup

```js
// lib/supabase/client.js — use in Client Components
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

```js
// lib/supabase/server.js — use in Server Components and Route Handlers
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}

// Admin client — bypasses RLS. Server-side only. Never expose to browser.
export function createAdminSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { get: () => null } }
  )
}
```

### 6.2 Auth Middleware

```js
// middleware.js
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (name) => req.cookies.get(name)?.value,
                 set: (name, value, options) => res.cookies.set({ name, value, ...options }) } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const role = session?.user?.user_metadata?.role
  const path = req.nextUrl.pathname

  // Unauthenticated → redirect to login
  const protectedPrefixes = ['/agency', '/admin', '/referral', '/direct', '/portal']
  if (!session && protectedPrefixes.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Role guards
  if (path.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/agency/:path*', '/admin/:path*', '/referral/:path*', '/direct/:path*', '/portal/:path*']
}
```

### 6.3 Magic Link — Client Invite

```js
// app/api/clients/[agencyId]/invite/route.js
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendInviteEmail } from '@/lib/resend'

export async function POST(req, { params }) {
  const body = await req.json()
  const { clientEmail, clientName, portalUrl, agencyName, fromEmail, customMessage, signOff } = body
  const supabase = createAdminSupabaseClient()

  // Create/invite user in Supabase Auth
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(clientEmail, {
    data: { role: 'agency_client', agencyId: params.agencyId },
    redirectTo: portalUrl
  })
  if (error) return Response.json({ error: error.message }, { status: 400 })

  // Send branded email via Resend (suppress Supabase default)
  await sendInviteEmail({ to: clientEmail, agencyName, fromEmail, clientName, portalUrl, customMessage, signOff })

  // Update client record
  await supabase.from('clients')
    .update({
      portal_status: 'invited',
      invite_sent_at: new Date().toISOString(),
      invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('contact_email', clientEmail)
    .eq('agency_id', params.agencyId)

  return Response.json({ success: true })
}
```

### 6.4 Row Level Security (RLS) Policies

Enable RLS on every table. Key patterns:

```sql
-- Agencies see only their own jobs
CREATE POLICY "agency_own_jobs" ON jobs
  FOR ALL USING (
    agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
  );

-- Clients see only projects in their jobs
CREATE POLICY "client_own_projects" ON projects
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM jobs WHERE client_id = (
        SELECT id FROM clients WHERE portal_user_id = auth.uid()
      )
    )
  );

-- Admin service-role key bypasses all RLS (server-side only)

-- Strip sensitive fields for client portal via view
CREATE VIEW client_project_view AS
  SELECT id, status, service_id, due_date, delivered_at
  -- cost_price_cents and agency_profit intentionally excluded
  FROM projects;
```

### 6.5 Supabase Storage Buckets

| Bucket | Access | Contents |
|---|---|---|
| `delivered-files` | Private (signed URLs) | Final deliverable files per project |
| `agency-logos` | Public | Agency logo images for white-label portal |
| `brief-uploads` | Private | Reference files uploaded with briefs |
| `brand-assets` | Private | Brand guidelines assets |

```js
// Server-side: generate signed URL for file download
const { data } = await supabase.storage
  .from('delivered-files')
  .createSignedUrl(`${projectId}/${fileName}`, 60 * 60 * 24) // 24h
```

---

## 7. Database Schema (Supabase / PostgreSQL)

All tables use `uuid` primary keys. Monetary values are **integers in cents** (AUD). Timestamps are `timestamptz`.

```sql
-- Platform-wide config (single row)
CREATE TABLE platform_config (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text NOT NULL DEFAULT 'nexxtt.io',
  support_email               text NOT NULL,
  commission_rate             numeric NOT NULL DEFAULT 0.20,
  commission_months           int NOT NULL DEFAULT 12,
  rush_surcharge              numeric NOT NULL DEFAULT 0.50,
  agency_portal_enabled       boolean DEFAULT true,
  direct_portal_enabled       boolean DEFAULT true,
  referral_program_enabled    boolean DEFAULT true,
  white_label_enabled         boolean DEFAULT true,
  rush_orders_enabled         boolean DEFAULT true,
  maintenance_mode            boolean DEFAULT false,
  updated_at                  timestamptz DEFAULT now()
);

-- Agencies
CREATE TABLE agencies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  slug                  text UNIQUE NOT NULL,
  status                text NOT NULL DEFAULT 'pending', -- pending | active | suspended | archived
  plan                  text NOT NULL DEFAULT 'starter', -- starter | pro | elite
  contact_name          text NOT NULL,
  contact_email         text NOT NULL,
  phone                 text,
  website               text,
  abn                   text,
  balance_cents         int NOT NULL DEFAULT 0,
  auto_topup_enabled    boolean DEFAULT false,
  auto_topup_threshold  int DEFAULT 50000,
  auto_topup_amount     int DEFAULT 200000,
  joined_at             timestamptz DEFAULT now(),
  approved_at           timestamptz
);

-- Agency white-label brand config
CREATE TABLE agency_brands (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  logo_url        text,
  primary_colour  text DEFAULT '#0B1F3A',
  accent_colour   text DEFAULT '#00B8A9',
  portal_domain   text,
  portal_slug     text UNIQUE NOT NULL,
  support_email   text NOT NULL,
  default_invite_message text,
  sign_off_name   text NOT NULL
);

-- Extends Supabase auth.users
CREATE TABLE user_profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL, -- agency | agency_client | referral_partner | direct_client | admin
  first_name      text,
  last_name       text,
  phone           text,
  agency_id       uuid REFERENCES agencies(id),
  created_at      timestamptz DEFAULT now(),
  last_login_at   timestamptz
);

-- Clients (of agencies)
CREATE TABLE clients (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id             uuid REFERENCES agencies(id) ON DELETE CASCADE,
  portal_user_id        uuid REFERENCES auth.users(id),
  business_name         text NOT NULL,
  contact_name          text NOT NULL,
  contact_email         text NOT NULL,
  phone                 text,
  industry              text,
  internal_note         text,
  portal_status         text NOT NULL DEFAULT 'no_access', -- no_access | invited | active
  portal_access_level   text NOT NULL DEFAULT 'full',      -- full | view_and_approve
  portal_slug           text NOT NULL,
  invite_sent_at        timestamptz,
  invite_expires_at     timestamptz,
  portal_activated_at   timestamptz,
  created_at            timestamptz DEFAULT now()
);

-- Referral partners
CREATE TABLE referral_partners (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name         text NOT NULL,
  referral_code         text UNIQUE NOT NULL,
  total_earned_cents    int DEFAULT 0,
  pending_payout_cents  int DEFAULT 0,
  joined_at             timestamptz DEFAULT now()
);

-- Referral attribution links
CREATE TABLE referrals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_partner_id   uuid REFERENCES referral_partners(id),
  referred_user_id      uuid REFERENCES auth.users(id),
  referred_at           timestamptz DEFAULT now(),
  first_order_at        timestamptz,
  commission_expires_at timestamptz,
  is_active             boolean DEFAULT true
);

-- Services catalog
CREATE TABLE services (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  slug                  text UNIQUE NOT NULL,
  icon                  text NOT NULL,
  cost_price_cents      int NOT NULL,
  default_retail_cents  int NOT NULL,
  sla_days              int NOT NULL,
  rush_sla_days         int NOT NULL,
  is_active             boolean DEFAULT true,
  sort_order            int DEFAULT 0
);

-- Jobs (one invoice group per order)
CREATE TABLE jobs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number                text UNIQUE NOT NULL,  -- NXT-2025-0045
  agency_id                 uuid REFERENCES agencies(id),
  client_id                 uuid REFERENCES clients(id),
  direct_client_user_id     uuid REFERENCES auth.users(id),
  placed_by                 uuid REFERENCES auth.users(id),
  status                    text NOT NULL DEFAULT 'brief_pending',
  is_rush                   boolean DEFAULT false,
  total_cost_cents          int NOT NULL DEFAULT 0,
  total_retail_cents        int NOT NULL DEFAULT 0,
  payment_method            text DEFAULT 'balance',
  stripe_payment_intent_id  text,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- Projects (one service per project, many per job)
CREATE TABLE projects (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              uuid REFERENCES jobs(id) ON DELETE CASCADE,
  service_id          uuid REFERENCES services(id),
  status              text NOT NULL DEFAULT 'brief_pending',
  cost_price_cents    int NOT NULL,
  retail_price_cents  int NOT NULL,
  is_rush             boolean DEFAULT false,
  due_date            date,
  delivered_at        timestamptz,
  approved_at         timestamptz,
  approved_by         uuid REFERENCES auth.users(id),
  revision_count      int DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Briefs (jsonb, one per project)
CREATE TABLE briefs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  service_slug  text NOT NULL,
  data          jsonb NOT NULL DEFAULT '{}',
  submitted_at  timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Delivered files
CREATE TABLE delivered_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid REFERENCES projects(id) ON DELETE CASCADE,
  name          text NOT NULL,
  storage_path  text NOT NULL,
  size_bytes    int,
  mime_type     text,
  uploaded_at   timestamptz DEFAULT now()
);

-- Referral commission entries
CREATE TABLE commission_entries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id           uuid REFERENCES referrals(id),
  referral_partner_id   uuid REFERENCES referral_partners(id),
  job_id                uuid REFERENCES jobs(id),
  period_month          text NOT NULL,
  order_value_cents     int NOT NULL,
  commission_cents      int NOT NULL,
  status                text DEFAULT 'pending',
  paid_at               timestamptz,
  created_at            timestamptz DEFAULT now()
);

-- Agency balance transactions
CREATE TABLE balance_transactions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                 uuid REFERENCES agencies(id),
  type                      text NOT NULL,
  amount_cents              int NOT NULL,
  balance_after_cents       int NOT NULL,
  description               text,
  stripe_payment_intent_id  text,
  related_job_id            uuid REFERENCES jobs(id),
  created_at                timestamptz DEFAULT now()
);

-- Admin action log
CREATE TABLE admin_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid REFERENCES auth.users(id),
  action      text NOT NULL,
  target_type text,
  target_id   uuid,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
```

---

## 8. Screen Inventory

### 8.1 Agency Portal

| Screen ID | Route | Name | Description |
|---|---|---|---|
| `s01` | `/login` | Login | Role-based login |
| `s02` | `/agency/onboarding` | Setup Wizard | 3-step agency registration |
| `s03` | `/agency/approved` | Approval Confirmed | Account active, CTA to dashboard |
| `s04` | `/agency/dashboard` | Agency Dashboard | KPI stats, active orders, activity feed |
| `s05` | `/agency/orders/new` | New Order Builder | 4-step: Service → Brief → Client → Payment |
| `s05b` | `/agency/orders/new/website` | Website Brief | Multi-step website design brief |
| `s05c` | `/agency/orders/new/logo` | Logo Brief | 4-step logo design brief |
| `s05d` | `/agency/orders/new/brand` | Brand Brief | Brand guidelines brief |
| `s05e` | `/agency/orders/new/social` | Social Media Brief | Social media pack brief |
| `s05f` | `/agency/orders/new/content` | Content Brief | Content writing brief |
| `s06` | `/agency/orders` | All Orders | MUI DataGrid, cost/retail/profit columns |
| `s07` | `/agency/orders/[id]` | Project View — Website | Progress, files, comments |
| `s07b` | `/agency/orders/[id]/logo` | Project View — Logo | Concept review |
| `s07c` | `/agency/orders/[id]/social` | Social Media Hub | Post calendar, approvals |
| `s07d` | `/agency/orders/[id]/delivered` | Delivered Project | Download files, sign-off |
| `s07e` | `/agency/orders/[id]/post/[postId]` | Post Detail | Platform preview |
| `s07f` | `/agency/orders/[id]/brief` | Weekly Brief | Recurring social brief |
| `s07g` | `/agency/orders/[id]/client-view` | Client Approval View | White-label preview |
| `s07h` | `/agency/orders/[id]/brand` | Project View — Brand | Brand stages |
| `s07i` | `/agency/orders/[id]/content` | Project View — Content | Content drafts |
| `s08` | `/agency/clients` | Client Manager | MUI DataGrid + mobile cards, portal status |
| `sInv` | `/agency/clients/invite` | Invite Client | 3-step invite flow with live email preview |
| `s09` | `/agency/finance/profit` | Profit Dashboard | Revenue vs profit chart, per-client breakdown |
| `s10` | `/agency/finance/balance` | Balance & Top-Ups | Prepaid balance, transaction history |
| `s11` | `/agency/settings` | Brand Settings | White-label config |
| `s12` | `/agency/settings/portal-preview` | Portal Preview | Live preview of client portal |

### 8.2 Agency Client Portal (White-Label)

Routes relative to `/portal/[agencySlug]/[clientSlug]/` or agency custom domain.

| Screen ID | Relative Route | Name |
|---|---|---|
| `s13` | `/login` | Client Login |
| `s12` | `/` | Client Dashboard |
| `s15` | `/brief` | Submit New Brief |
| `s16` | `/projects` | All Projects |
| `s16-web` | `/projects/[id]/website` | Website Project |
| `s16-social` | `/projects/[id]/social` | Social Media Project |
| `s16-logo` | `/projects/[id]/logo` | Logo Project |
| `s16-content` | `/projects/[id]/content` | Content Project |
| `s16-post` | `/projects/[id]/post/[postId]` | Post Approval |
| `s19` | `/review` | Leave a Review |
| `s20` | `/refer` | Refer a Friend |
| `s07g` | `/projects/[id]/approve` | Approve Deliverable |

### 8.3 Referral Partner Portal

| Screen ID | Route | Name |
|---|---|---|
| `sRef` | `/referral/dashboard` | Referral Dashboard |

### 8.4 Direct Client Portal

| Screen ID | Route | Name |
|---|---|---|
| `dcDash` | `/direct/dashboard` | Direct Client Dashboard |
| `dcOrders` | `/direct/orders` | My Orders |
| `dcOrder` | `/direct/orders/new` | Place New Order |
| `dcProject` | `/direct/orders/[id]` | Project Detail |
| `dcAccount` | `/direct/account` | Account Settings |

### 8.5 Admin Portal

| Screen ID | Route | Name |
|---|---|---|
| `sAdm` | `/admin` | Admin Dashboard |
| `sAdmAgencies` | `/admin/agencies` | Agency Management |
| `sAdmClients` | `/admin/clients` | All Clients |
| `sAdmReferrals` | `/admin/referrals` | Referral Partners |
| `sAdmOrders` | `/admin/orders` | All Orders |
| `sAdmServices` | `/admin/services` | Service Catalog |
| `sAdmFinance` | `/admin/finance` | Platform Finance |
| `sAdmSettings` | `/admin/settings` | Platform Settings |

---

## 9. Service Catalog

Stored in `services` table. Admin-editable at `/admin/services`.

| Service | Icon | Cost | Default Retail | Margin | SLA | Rush SLA |
|---|---|---|---|---|---|---|
| Website Design | 🌐 | $420 | $700 | 40% | 7 days | 3–4 days |
| Logo Design | ✦ | $180 | $400 | 55% | 3–5 days | 2 days |
| Brand Guidelines | 🎨 | $320 | $650 | 51% | 7–10 days | 4–5 days |
| Social Media Pack | 📱 | $150 | $350 | 57% | 5 days | 2–3 days |
| Content Writing | ✍️ | $130 | $280 | 54% | 5 days | 2–3 days |

All stored as cents (e.g. Website Design cost = 42000). Rush surcharge = +50% on cost.

---

## 10. Business Rules

### 10.1 Order & Pricing
1. Profit = `retail_price_cents - cost_price_cents`. Agency sets retail — minimum is cost price (0% margin allowed).
2. Client portal never exposes cost or profit — stripped via RLS views.
3. Rush adds 50% to cost. Agency configures markup handling in Brand Settings.
4. A Job is one order group; each service inside is a Project.
5. Job number: `NXT-YYYY-XXXX` (auto-generated, sequential).

### 10.2 Balance / Prepaid Credit
1. Balance stored as `balance_cents` on `agencies`.
2. Debit before confirming order. If insufficient → prompt top-up or card.
3. Packages: Starter $2,200, Growth $4,000 (10% bonus → $4,400 credited).
4. Auto top-up via pg_cron: checks `balance_cents < auto_topup_threshold` nightly.
5. Card payments: Stripe PaymentIntent → credits balance on `payment_intent.succeeded` webhook.

### 10.3 Referral Commissions
1. 20% of every order for 12 months from first order.
2. Commission on the retail price the end client pays.
3. Created by Supabase Edge Function on `jobs.status → delivered`.
4. Monthly pg_cron aggregates pending commissions. Admin approves payout.
5. No cap on referrals or streams.

### 10.4 Client Invite
1. Agency invites via `/agency/clients/invite` — 3-step flow.
2. Email sent from agency brand via Resend. Supabase default invite email disabled.
3. Magic link via `supabase.auth.admin.inviteUserByEmail()`. Expires 7 days.
4. On sign-up: `portal_status → active`. Supabase Auth webhook creates `user_profiles` row.
5. Revoke: `supabase.auth.admin.deleteUser()` + `portal_status → no_access`.

### 10.5 White-Label
1. Client portal loads `agency_brands` and injects brand tokens server-side.
2. nexxtt.io must **never** appear in any client-facing surface.
3. CSS brand tokens generated from `agency_brands` and injected as `<style>` in layout.
4. Custom domain: CNAME → `proxy.nexxtt.io`, middleware matches host → correct portal.

### 10.6 Order Lifecycle
```
brief_pending → in_progress → in_review → delivered → [archived]
                                  ↑              ↓
                             revision_requested  disputed
```

### 10.7 Agency Onboarding
1. 3-step wizard → `agencies` row with `status = 'pending'`.
2. Manual admin approval → `status = 'active'` + welcome email.
3. Suspended: cannot place orders, client portals read-only.

---

## 11. Brief Data Schemas (stored as jsonb)

### Website Design
```js
{ businessName, tagline, websiteGoal, pages: [], targetAudience,
  designStyle: [], inspirationUrls: [], mustInclude, mustAvoid,
  colourPreferences, existingLogo, existingBrandAssets, deadline, additionalNotes }
```

### Logo Design
```js
{ businessName, tagline, industry, logoStyle: [], colourPreferences,
  moodKeywords: [], inspirationLogos: [], competitorLogos: [],
  avoidStyles, deliverables: [] }
```

### Brand Guidelines
```js
{ businessName, hasExistingLogo, existingColours, targetAudience,
  brandPersonality: [], competitors: [], deliverables: [] }
```

### Social Media Pack
```js
{ platforms: [], postTypes: [], numberOfTemplates, brandColours,
  brandFonts, tone, exampleAccounts: [], logoProvided }
```

### Content Writing
```js
{ contentType, numberOfPieces, wordCountPerPiece, topics: [],
  targetAudience, tone, seoKeywords: [], referenceUrls: [], avoidTopics }
```

---

## 12. Key User Flows

### Agency Onboarding
```
/agency/onboarding
  Step 1: Business info (name, ABN, website, contact)
  Step 2: Brand setup (logo → Supabase Storage, colours, portal slug)
  Step 3: Review & submit
→ agencies row (status: pending)
→ Admin notified → approves → status: active
→ Welcome email via Resend
→ Agency logs in → /agency/dashboard
```

### Order Placement
```
/agency/orders/new
  Step 1: Service selector (multi-select, live margin calculator)
  Step 2: Brief forms (per service, multi-step)
  Step 3: Client details (select existing or add inline)
  Step 4: Payment (balance deduct or Stripe card)
→ Job + Projects created → redirect to /agency/orders/[id]
```

### Client Invite
```
/agency/clients/invite
  Step 1: Client details + access level
  Step 2: Customise invite email (live preview, all fields editable)
  Step 3: Confirm & send
→ clients row (portal_status: invited)
→ supabase.auth.admin.inviteUserByEmail()
→ Branded email via Resend
→ Client accepts → portal_status: active → agency notified
```

### Deliverable Approval
```
nexxtt.io team uploads files → Supabase Storage
→ projects.status → in_review
→ Agency notified (email + Supabase Realtime)
→ Agency reviews → approve (delivered) or revise (revision_requested)
→ Signed URLs generated for client download (24h expiry)
```

### Referral Flow
```
/join → referral partner signs up
→ unique referral_code generated
→ Partner shares /r/[code]
→ New client signs up via link → referrals row created
→ Client places first order → first_order_at set → commission clock starts
→ Edge Function on job delivered → commission_entry created
→ Monthly pg_cron → aggregate pending → admin runs payout
```

---

## 13. API Route Handlers

Standard pattern for authenticated routes:

```js
// Validate session first in every Route Handler
export async function GET(req) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.user_metadata.role
  // ... role-specific logic
}
```

### Endpoints

```
POST  /api/auth/callback                            ← Supabase OAuth handler
POST  /api/auth/magic-link/resend

POST  /api/agencies                                 ← onboarding
GET   /api/agencies/[id]
PATCH /api/agencies/[id]

GET   /api/agencies/[id]/clients
POST  /api/agencies/[id]/clients
PATCH /api/agencies/[id]/clients/[clientId]
POST  /api/agencies/[id]/clients/[clientId]/invite
DELETE /api/agencies/[id]/clients/[clientId]/invite

POST  /api/jobs
GET   /api/jobs/[id]
PATCH /api/jobs/[id]
POST  /api/jobs/[id]/projects/[projectId]/approve
POST  /api/jobs/[id]/projects/[projectId]/revise

POST  /api/projects/[id]/brief
GET   /api/projects/[id]/brief
PATCH /api/projects/[id]/brief
GET   /api/projects/[id]/files                      ← returns signed URLs

POST  /api/balance/topup                            ← Stripe PaymentIntent
GET   /api/agencies/[id]/balance
GET   /api/agencies/[id]/transactions

GET   /api/referrals/[partnerId]/streams
GET   /api/referrals/[partnerId]/commissions

GET   /api/services
PATCH /api/services/[id]                            ← admin only
PATCH /api/services/[id]/toggle                     ← admin only

GET   /api/admin/dashboard
GET   /api/admin/agencies
PATCH /api/admin/agencies/[id]/approve
PATCH /api/admin/agencies/[id]/suspend
POST  /api/admin/agencies/[id]/impersonate
GET   /api/admin/orders
GET   /api/admin/clients
GET   /api/admin/referrals
POST  /api/admin/referrals/payout-all
GET   /api/admin/finance
PATCH /api/admin/settings
PATCH /api/admin/settings/feature-flags

POST  /api/webhooks/stripe                          ← payment success
POST  /api/webhooks/supabase                        ← auth events
```

---

## 14. MUI DataGrid — Setup & Theming

```bash
npm install @mui/x-data-grid @mui/material @emotion/react @emotion/styled
```

```js
// lib/muiTheme.js
import { createTheme } from '@mui/material/styles'

export const muiTheme = createTheme({
  palette: {
    primary: { main: '#00B8A9' },
    secondary: { main: '#0B1F3A' },
  },
  typography: {
    fontFamily: "'Instrument Sans', sans-serif",
    fontSize: 13,
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid #E2E6ED',
          borderRadius: 10,
          fontSize: '0.82rem',
          fontFamily: "'Instrument Sans', sans-serif",
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#F7F8FA',
            color: '#6B7A92',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
          },
          '& .MuiDataGrid-row:hover': { backgroundColor: '#F7F8FA' },
          '& .MuiDataGrid-cell': { borderColor: '#E2E6ED', color: '#374357' },
          '& .MuiDataGrid-footerContainer': { borderColor: '#E2E6ED' },
        },
      },
    },
  },
})
```

```jsx
// app/layout.jsx — wrap everything
'use client'
import { ThemeProvider } from '@mui/material/styles'
import { muiTheme } from '@/lib/muiTheme'

export default function Providers({ children }) {
  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
}
```

**Standard DataGrid pattern with mobile fallback:**

```jsx
// components/tables/OrdersTable.jsx
'use client'
import { DataGrid } from '@mui/x-data-grid'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import MobileTableCard from './MobileTableCard'
import StatusBadge from '@/components/shared/StatusBadge'

const columns = [
  { field: 'jobNumber', headerName: '#', width: 130 },
  { field: 'service',   headerName: 'Service', flex: 1 },
  { field: 'client',    headerName: 'Client',  flex: 1 },
  { field: 'status',    headerName: 'Status',  width: 140,
    renderCell: ({ value }) => <StatusBadge status={value} /> },
  { field: 'retail',    headerName: 'Retail',  width: 100,
    valueFormatter: ({ value }) => `$${(value / 100).toFixed(0)}` },
  { field: 'profit',    headerName: 'Profit',  width: 100,
    valueFormatter: ({ value }) => `$${(value / 100).toFixed(0)}` },
  { field: 'dueDate',   headerName: 'Due',     width: 100 },
]

export default function OrdersTable({ rows, onRowClick }) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        {rows.map(row => (
          <MobileTableCard
            key={row.id}
            title={row.service}
            subtitle={row.client}
            status={row.status}
            value={`$${(row.retail / 100).toFixed(0)}`}
            meta={`Due ${row.dueDate}`}
            onClick={() => onRowClick(row)}
          />
        ))}
      </div>
    )
  }

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      pageSize={10}
      rowsPerPageOptions={[10, 25, 50]}
      density="compact"
      autoHeight
      disableSelectionOnClick
      onRowClick={({ row }) => onRowClick(row)}
      sx={{ cursor: 'pointer' }}
    />
  )
}
```

---

## 15. Design Tokens (tailwind.config.js)

```js
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:       '#0B1F3A',
        'navy-mid': '#152d52',
        teal:       '#00B8A9',
        'teal-l':   '#00d4c3',
        'teal-pale':'#e6f9f8',
        off:        '#F7F8FA',
        lg:         '#EEF0F4',
        border:     '#E2E6ED',
        muted:      '#6B7A92',
        body:       '#374357',
        green:      '#10B981',
        amber:      '#F59E0B',
        red:        '#EF4444',
        blue:       '#3B82F6',
        adm:        '#7c3aed',
        'adm-l':    '#a78bfa',
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", 'sans-serif'],
        body:    ["'Instrument Sans'", 'sans-serif'],
      },
      borderRadius: { DEFAULT: '10px', lg: '16px', xl: '22px' },
      boxShadow: {
        sm: '0 1px 4px rgba(11,31,58,0.06)',
        md: '0 4px 20px rgba(11,31,58,0.09)',
        lg: '0 12px 40px rgba(11,31,58,0.13)',
      },
    },
  },
  plugins: [],
}
```

---

## 16. Email Templates (Resend + React Email)

```bash
npm install resend @react-email/components
```

Templates in `emails/`. Render server-side, send via Resend.

| Template | From | Key Variables |
|---|---|---|
| `AgencyWelcome.jsx` | nexxtt.io | `agencyName`, `loginUrl` |
| `ClientInvite.jsx` | Agency brand | `agencyName`, `fromEmail`, `clientName`, `portalUrl`, `customMessage`, `signOff` |
| `ClientInviteReminder.jsx` | Agency brand | Same + `expiresInDays` |
| `OrderConfirmation.jsx` | nexxtt.io | `jobNumber`, `services[]`, `totalCost` |
| `DraftReady.jsx` | nexxtt.io → Agency | `projectName`, `clientName`, `reviewUrl` |
| `DeliverableDelivered.jsx` | Agency brand → Client | `projectName`, `agencyName`, `downloadUrl` |
| `CommissionPayout.jsx` | nexxtt.io | `partnerName`, `amount`, `period` |
| `LowBalanceAlert.jsx` | nexxtt.io → Agency | `currentBalance`, `topUpUrl` |

---

## 17. Feature Flags

Stored in `platform_config`. Togglable from `/admin/settings`.

| Flag | Default | Effect when OFF |
|---|---|---|
| `agency_portal_enabled` | `true` | Agency login → maintenance page |
| `direct_portal_enabled` | `true` | Direct client sign-up disabled |
| `referral_program_enabled` | `true` | Referral links earn no commission |
| `white_label_enabled` | `true` | Client portal shows nexxtt.io brand |
| `rush_orders_enabled` | `true` | Rush option hidden from order builder |
| `maintenance_mode` | `false` | All portals show maintenance page |

---

## 18. Security Rules

1. **RLS on every table.** Anon Supabase client enforces row ownership. Service-role key only in Route Handlers.
2. **Role middleware.** Check `session.user.user_metadata.role` in `middleware.js` before serving protected pages.
3. **Agency data isolation.** Always filter by `agency_id` from session — never trust client-supplied IDs.
4. **White-label API responses.** Never return `cost_price_cents`, `agency_profit`, or nexxtt.io strings to client portals. Enforce via RLS views.
5. **Admin impersonation.** Log every action in `admin_actions`. Never allow impersonation of another admin.
6. **Signed file URLs.** All storage buckets (except `agency-logos`) are private. 24h signed URLs, generated server-side.
7. **Magic links.** Managed by Supabase Auth — single-use, 7-day expiry. Do not implement custom tokens.
8. **Stripe webhooks.** Always validate `stripe-signature` header before processing.
9. **No secrets client-side.** Only `NEXT_PUBLIC_*` vars in browser. All keys (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`) are server-only.

---

## 19. Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # server-only

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...             # server-only
STRIPE_WEBHOOK_SECRET=whsec_...           # server-only

# Resend
RESEND_API_KEY=re_...                     # server-only

# App
NEXT_PUBLIC_APP_URL=https://nexxtt.io
NEXT_PUBLIC_SUPABASE_REDIRECT_URL=https://nexxtt.io/api/auth/callback
```

---

## 20. Routing Strategy

### Phase 1 — Path-based (build first)
```
/agency/*                              → Agency portal
/admin/*                               → Admin portal
/referral/*                            → Referral partner portal
/direct/*                              → Direct client portal
/portal/[agencySlug]/[clientSlug]/*    → White-label client portal
```

### Phase 2 — Custom Domain (production)
Agency sets CNAME: `portal.theiragency.com → proxy.nexxtt.io`

```js
// middleware.js — custom domain rewrite
const hostname = req.headers.get('host')
if (!hostname.includes('nexxtt.io')) {
  const supabase = createAdminSupabaseClient()
  const { data: brand } = await supabase
    .from('agency_brands')
    .select('portal_slug')
    .eq('portal_domain', hostname)
    .single()

  if (brand) {
    return NextResponse.rewrite(
      new URL(`/portal/${brand.portal_slug}${req.nextUrl.pathname}`, req.url)
    )
  }
}
```

---

## 21. Build Order

Build in this sequence to ship incrementally:

1. **Scaffold** — Next.js app, Tailwind config with tokens, shadcn/ui init, MUI install, Supabase project, env vars
2. **DB schema** — all tables, RLS policies, seed services + platform_config
3. **Auth** — Supabase Auth for all 5 roles, middleware, login pages
4. **Agency layout** — sidebar (with mobile drawer), topbar, bottom nav, responsive shell
5. **Agency dashboard** — stat cards, orders table (MUI DataGrid + mobile cards), activity feed
6. **Order builder** — service selector, all 5 brief forms, client step, payment step
7. **Orders list & detail** — all project view screens, status updates, Supabase Realtime
8. **Client Manager** — MUI DataGrid + mobile cards, invite flow (3 steps), magic link via Resend
9. **Client portal (white-label)** — brand injection layout, dashboard, project views, approve flow
10. **Balance & Stripe** — top-up flow, Stripe webhook, balance deduction
11. **Profit Dashboard** — Recharts charts, per-client MUI DataGrid
12. **Brand Settings** — white-label config, portal preview
13. **Referral Partner Portal** — dashboard, commission streams, referral link
14. **Direct Client Portal** — all 5 screens
15. **Admin Portal** — all 8 screens with MUI DataGrids, feature flags, payout tools
16. **Email templates** — all 8 Resend + React Email templates
17. **Mobile audit** — test every screen at 375px, fix overflow/layout issues, verify bottom nav
18. **Custom domain** — CNAME middleware rewrite for white-label portals

---

## 22. Dashboard Variants (A / B / C / D)

The agency dashboard has 4 selectable layout styles. The active variant is stored in `user_profiles.dashboard_variant` (default `'A'`) and persisted to Supabase on change. The A/B/C/D pill switcher appears in the topbar of every dashboard variant.

| Variant | Route | Layout | Key Components |
|---|---|---|---|
| **A — Color-energized** | `/agency/dashboard` | Sidebar + stats + table | Gradient sidebar, sparkline KPI cards, rose inverted profit card, bold status pills |
| **B — Bento grid** | `/agency/dashboard?v=B` | Sidebar + bento tiles | Giant gradient hero tile, amber earnings tile, progress-bar order rows, vertical dot timeline |
| **C — Hero + Kanban** | `/agency/dashboard?v=C` | Horizontal topnav only | Orange gradient hero with huge profit number, 4-column kanban pipeline, dot activity feed |
| **D — Command center** | `/agency/dashboard?v=D` | Wide sidebar + gantt | Profile card, priority unlock bar, Gantt timeline with TODAY marker, dark SVG earnings chart |

### 22.1 Variant-specific Components

**Sparkline bars (A)** — CSS-only bar charts using flexbox. Heights are hardcoded per KPI; in production, calculate from last 7 data points from `balance_transactions` or `jobs` grouped by day.

**Bento grid (B)** — CSS Grid `grid-template-columns: 2.2fr 1fr 1fr` with the hero spanning rows 1–2. On mobile collapses to 2-col with hero spanning full width.

**Kanban (C)** — Four columns: `brief_pending` → `in_progress` → `in_review` → `delivered`. Each column queries `projects` filtered by `status`. Drag-and-drop is **Phase 2** — for Phase 1 render as static cards. Use `@dnd-kit/core` for drag-and-drop when ready.

**Gantt timeline (D)** — Render a 14-day window centred on today. Each row is a `project`. Bar position = `((start_date - window_start) / 14) * 100%`. Bar width = `((due_date - start_date) / 14) * 100%`. TODAY marker = `((today - window_start) / 14) * 100%`.

### 22.2 Variant Switcher Implementation

```js
// app/agency/dashboard/page.jsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardA from '@/components/dashboard/DashboardA'
import DashboardB from '@/components/dashboard/DashboardB'
import DashboardC from '@/components/dashboard/DashboardC'
import DashboardD from '@/components/dashboard/DashboardD'

const VARIANTS = { A: DashboardA, B: DashboardB, C: DashboardC, D: DashboardD }

export default function DashboardPage() {
  const params = useSearchParams()
  const variant = params.get('v') || 'A'
  const Component = VARIANTS[variant] ?? DashboardA
  return <Component activeVariant={variant} />
}
```

---

## 23. Notifications System

The notification bell (🔔) appears in every app-screen topbar. Notifications are stored in a `notifications` table and delivered via Supabase Realtime.

### 23.1 Notifications Table

```sql
CREATE TABLE notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text NOT NULL, -- order_update | payment | client_action | system | commission
  title         text NOT NULL,
  body          text,
  link          text,          -- relative URL to navigate to on click
  is_read       boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- RLS: users see only their own
CREATE POLICY "own_notifications" ON notifications FOR ALL
  USING (user_id = auth.uid());
```

### 23.2 Notification Types & Triggers

| Type | Trigger | Who receives |
|---|---|---|
| `order_update` | Project status changes | Agency + client (if active portal) |
| `payment` | Balance top-up, deduction, invoice | Agency |
| `client_action` | Client approves/rejects deliverable | Agency |
| `commission` | Commission earned, payout processed | Referral partner |
| `system` | Agency approved, invite accepted | Agency |

### 23.3 Realtime Subscription

```js
// hooks/useNotifications.js
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return
    // Initial fetch
    supabase.from('notifications').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        setNotifications(data || [])
        setUnread((data || []).filter(n => !n.is_read).length)
      })
    // Realtime
    const channel = supabase.channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, payload => {
        setNotifications(prev => [payload.new, ...prev])
        setUnread(prev => prev + 1)
      }).subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', userId).eq('is_read', false)
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  return { notifications, unread, markAllRead }
}
```

### 23.4 Notification Bell UI

Use a shadcn `Popover` triggered by the bell button. Inside: scrollable list of notifications, "Mark all read" link, "View all" link. Show a red badge with count when `unread > 0`.

---

## 24. Global Search

The search bar in the agency dashboard topbar (Option A) and the `⌘K search` in Option D open a **command palette** search across orders, clients, and services.

### 24.1 Implementation

Use shadcn `Command` component (built on `cmdk`). Search is client-side across cached data + server-side for full results.

```js
// components/shared/CommandSearch.jsx
'use client'
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from '@/components/ui/command'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

export function CommandSearch({ open, onOpenChange }) {
  const router = useRouter()
  const { data } = useSWR('/api/search/index') // returns { orders, clients, services }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl">
        <Command>
          <CommandInput placeholder="Search orders, clients, services…" />
          <CommandList>
            <CommandGroup heading="Orders">
              {data?.orders?.map(o => (
                <CommandItem key={o.id} onSelect={() => { router.push(`/agency/orders/${o.id}`); onOpenChange(false) }}>
                  {o.job_number} — {o.client_name} · {o.service_name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Clients">
              {data?.clients?.map(c => (
                <CommandItem key={c.id} onSelect={() => { router.push(`/agency/clients`); onOpenChange(false) }}>
                  {c.business_name} — {c.contact_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
```

Keyboard shortcut: `⌘K` (Mac) / `Ctrl+K` (Windows) — register in the root layout with a `useEffect` listener.

---

## 25. Zustand Store Structure

```js
// lib/stores/useAgencyStore.js
import { create } from 'zustand'

export const useAgencyStore = create((set, get) => ({
  // Agency data
  agency: null,
  balance: 0,
  dashboardVariant: 'A',

  setAgency: (agency) => set({ agency }),
  setBalance: (balance) => set({ balance }),
  setDashboardVariant: (v) => set({ dashboardVariant: v }),

  // Order builder state
  orderDraft: { services: [], clientId: null, isRush: false, brief: {} },
  setOrderDraft: (patch) => set(state => ({ orderDraft: { ...state.orderDraft, ...patch } })),
  clearOrderDraft: () => set({ orderDraft: { services: [], clientId: null, isRush: false, brief: {} } }),

  // UI state
  sidebarOpen: false,
  commandSearchOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setCommandSearchOpen: (v) => set({ commandSearchOpen: v }),
}))

// lib/stores/useAdminStore.js
export const useAdminStore = create((set) => ({
  impersonating: null, // { userId, role, agencyId } | null
  setImpersonating: (v) => set({ impersonating: v }),
  clearImpersonation: () => set({ impersonating: null }),
}))
```

---

## 26. Loading, Empty & Error States

Every data-fetching component must handle all three states. Use consistent patterns:

### 26.1 Loading Skeletons

```js
// components/shared/SkeletonCard.jsx
import { Skeleton } from '@/components/ui/skeleton'

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-2xl p-6">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12 ml-auto" />
        </div>
      ))}
    </div>
  )
}
```

### 26.2 Empty States

```js
// components/shared/EmptyState.jsx
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-5xl mb-4 opacity-30">{icon}</div>
      <h3 className="font-display font-bold text-dark text-lg mb-2">{title}</h3>
      <p className="text-muted text-sm max-w-xs mb-5">{description}</p>
      {action}
    </div>
  )
}
// Usage: <EmptyState icon="📋" title="No orders yet" description="Place your first order to get started." action={<Button onClick={() => router.push('/agency/orders/new')}>+ New Order</Button>} />
```

### 26.3 Error Boundaries

Wrap each portal layout in an error boundary. On error, show a recovery card with "Try again" and "Contact support" links. Log errors to Sentry.

```js
// app/agency/error.jsx  (Next.js error boundary file convention)
'use client'
export default function AgencyError({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="font-display font-bold text-xl">Something went wrong</h2>
      <p className="text-muted text-sm">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

---

## 27. Toast Notification System

Use shadcn `Toaster` + `useToast` hook globally. Place `<Toaster />` in root layout.

### Standard Toast Patterns

```js
import { useToast } from '@/components/ui/use-toast'

// Success
toast({ title: 'Order placed', description: 'Job #NXT-2025-0047 is now in production.', variant: 'default' })

// Error
toast({ title: 'Payment failed', description: error.message, variant: 'destructive' })

// With action
toast({
  title: 'Invite sent',
  description: 'Lena Marsh will receive an email from Bright Agency Co.',
  action: <ToastAction altText="Undo" onClick={cancelInvite}>Undo</ToastAction>
})
```

---

## 28. Priority Unlock System

Agencies unlock features as they place more orders. This gamifies engagement. Track via `agencies.total_jobs_count` (maintained by a DB trigger).

| Milestone | Jobs Required | Unlocked Feature |
|---|---|---|
| Starter | 0 | Basic portal, 3 services |
| Rising | 5 | All 5 services, custom portal URL |
| Pro | 10 | Priority support, rush orders, white-label email |
| Elite | 25 | Dedicated account manager, custom pricing, API access |

```sql
-- DB trigger to keep total_jobs_count updated
CREATE OR REPLACE FUNCTION update_agency_job_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agencies SET total_jobs_count = (
    SELECT COUNT(*) FROM jobs WHERE agency_id = NEW.agency_id AND status != 'archived'
  ) WHERE id = NEW.agency_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_job_inserted AFTER INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_agency_job_count();
```

Show the progress bar in Option D sidebar and the "3 until Priority Unlock" badge in Option A Quick Stats.

---

## 29. File Upload System

### 29.1 Brief Reference Uploads

Agencies can attach reference images/files when filling a brief. Max 10 files, 20MB each. Accepted: images, PDFs, ZIPs.

```js
// components/order/FileUploadArea.jsx
'use client'
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'

export function FileUploadArea({ projectId, onUploaded }) {
  const supabase = createClient()

  const onDrop = useCallback(async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      const path = `briefs/${projectId}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('brief-uploads').upload(path, file)
      if (!error) onUploaded(path)
    }
  }, [projectId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxSize: 20 * 1024 * 1024, accept: { 'image/*': [], 'application/pdf': [], 'application/zip': [] }
  })

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-teal bg-teal-pale' : 'border-border hover:border-teal'}`}>
      <input {...getInputProps()} />
      <p className="text-muted text-sm">{isDragActive ? 'Drop files here…' : 'Drag files here or click to browse'}</p>
      <p className="text-muted text-xs mt-1">Images, PDFs, ZIPs · max 20MB each</p>
    </div>
  )
}
```

Install: `npm install react-dropzone`

### 29.2 Deliverable File Downloads

Generated in Route Handlers using Supabase signed URLs:

```js
// app/api/projects/[id]/files/route.js
export async function GET(req, { params }) {
  const supabase = createServerSupabaseClient()
  const { data: files } = await supabase.from('delivered_files')
    .select('*').eq('project_id', params.id)

  const signedFiles = await Promise.all(files.map(async f => {
    const { data } = await supabase.storage.from('delivered-files')
      .createSignedUrl(f.storage_path, 86400) // 24h
    return { ...f, url: data.signedUrl }
  }))

  return Response.json(signedFiles)
}
```

### 29.3 Agency Logo Upload

In Brand Settings, agency uploads their logo which is stored in the public `agency-logos` bucket. Accept SVG, PNG, WEBP. Max 2MB. Resize to 400×200 max using Supabase Edge Function image transform.

---

## 30. Realtime Order Updates

Agencies and clients get live updates when project status changes. Implement in the order detail page:

```js
// hooks/useRealtimeProject.js
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

export function useRealtimeProject(projectId, onStatusChange) {
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (!projectId) return
    const channel = supabase.channel(`project:${projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'projects',
        filter: `id=eq.${projectId}`
      }, payload => {
        onStatusChange(payload.new)
        toast({
          title: 'Project updated',
          description: `Status changed to ${payload.new.status.replace(/_/g,' ')}`
        })
      }).subscribe()

    return () => supabase.removeChannel(channel)
  }, [projectId])
}
```

---

## 31. Supabase Edge Functions

Deploy these as Supabase Edge Functions (Deno runtime). Create in `supabase/functions/`.

### 31.1 `calculate-commission`

Triggered by a DB webhook when `jobs.status` changes to `delivered`.

```js
// supabase/functions/calculate-commission/index.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

Deno.serve(async (req) => {
  const { record } = await req.json() // jobs row
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

  // Find if the client was referred
  const { data: referral } = await supabase.from('referrals')
    .select('*, referral_partners(*)')
    .eq('referred_user_id', record.direct_client_user_id ?? record.client_id)
    .eq('is_active', true)
    .single()

  if (!referral) return new Response('No referral', { status: 200 })

  // Check 12-month window
  if (referral.commission_expires_at && new Date(referral.commission_expires_at) < new Date()) {
    await supabase.from('referrals').update({ is_active: false }).eq('id', referral.id)
    return new Response('Commission expired', { status: 200 })
  }

  const commission = Math.round(record.total_retail_cents * 0.20)
  const month = new Date().toISOString().slice(0, 7) // "2025-04"

  await supabase.from('commission_entries').insert({
    referral_id: referral.id,
    referral_partner_id: referral.referral_partner_id,
    job_id: record.id,
    period_month: month,
    order_value_cents: record.total_retail_cents,
    commission_cents: commission,
    status: 'pending'
  })

  // Update partner pending total
  await supabase.from('referral_partners')
    .update({ pending_payout_cents: supabase.rpc('increment', { x: commission }) })
    .eq('id', referral.referral_partner_id)

  return new Response('OK', { status: 200 })
})
```

### 31.2 `expire-invites`

Run via `pg_cron` daily at midnight. Sets `portal_status = 'no_access'` for expired invites.

```sql
-- pg_cron job (run in Supabase SQL editor)
SELECT cron.schedule('expire-client-invites', '0 0 * * *', $$
  UPDATE clients
  SET portal_status = 'no_access', invite_expires_at = null, invite_sent_at = null
  WHERE portal_status = 'invited'
    AND invite_expires_at < NOW()
    AND portal_user_id IS NULL;
$$);
```

### 31.3 `auto-topup`

Run via `pg_cron` nightly. Checks agencies with `auto_topup_enabled = true` and `balance_cents < auto_topup_threshold`, then creates a Stripe PaymentIntent.

```sql
SELECT cron.schedule('auto-topup-check', '0 1 * * *', $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/auto-topup',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := json_build_object('agency_ids',
      ARRAY(SELECT id FROM agencies
            WHERE auto_topup_enabled = true
              AND balance_cents < auto_topup_threshold
              AND status = 'active')
    )::text
  );
$$);
```

---

## 32. Stripe Integration Details

### 32.1 Balance Top-Up Flow

```js
// app/api/balance/topup/route.js
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req) {
  const { agencyId, amountCents, packageType } = await req.json()
  // packageType: 'starter' (220000) | 'growth' (400000→440000 credited) | 'custom'

  const bonusCents = packageType === 'growth' ? Math.round(amountCents * 0.10) : 0

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'aud',
    metadata: { agencyId, packageType, creditCents: amountCents + bonusCents }
  })

  return Response.json({ clientSecret: paymentIntent.client_secret })
}
```

### 32.2 Webhook Handler

```js
// app/api/webhooks/stripe/route.js
import Stripe from 'stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req) {
  const sig = req.headers.get('stripe-signature')
  const body = await req.text()
  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response('Webhook Error', { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const { agencyId, creditCents } = event.data.object.metadata
    const supabase = createAdminSupabaseClient()
    const { data: agency } = await supabase.from('agencies').select('balance_cents').eq('id', agencyId).single()
    const newBalance = agency.balance_cents + parseInt(creditCents)

    await supabase.from('agencies').update({ balance_cents: newBalance }).eq('id', agencyId)
    await supabase.from('balance_transactions').insert({
      agency_id: agencyId, type: 'top_up',
      amount_cents: parseInt(creditCents),
      balance_after_cents: newBalance,
      description: `Balance top-up · ${event.data.object.metadata.packageType}`,
      stripe_payment_intent_id: event.data.object.id
    })

    // Create notification
    await supabase.from('notifications').insert({
      user_id: (await supabase.from('user_profiles').select('id').eq('agency_id', agencyId).single()).data.id,
      type: 'payment',
      title: 'Balance top-up confirmed',
      body: `$${(parseInt(creditCents)/100).toFixed(0)} added to your balance.`,
      link: '/agency/finance/balance'
    })
  }

  return new Response('OK', { status: 200 })
}
```

### 32.3 Stripe Elements (Frontend)

```js
// components/payment/StripePaymentForm.jsx
'use client'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

export function StripePaymentForm({ clientSecret, onSuccess }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <CheckoutForm onSuccess={onSuccess} />
    </Elements>
  )
}

function CheckoutForm({ onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: window.location.href } })
    if (!error) onSuccess()
  }
  return <form onSubmit={handleSubmit}><PaymentElement /><button type="submit">Pay</button></form>
}
```

Install: `npm install @stripe/stripe-js @stripe/react-stripe-js`

---

## 33. Job Number Generation

Job numbers follow the format `NXT-YYYY-XXXX`. Generate server-side in the order Route Handler:

```sql
-- Function to generate next job number
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS text AS $$
DECLARE
  year_str text := TO_CHAR(NOW(), 'YYYY');
  seq_num int;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num
  FROM jobs WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  RETURN 'NXT-' || year_str || '-' || LPAD(seq_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

```js
// In the POST /api/jobs route handler:
const { data: jobNum } = await supabase.rpc('generate_job_number')
const job = await supabase.from('jobs').insert({ job_number: jobNum, ... })
```

---

## 34. SWR Data Fetching Patterns

Use SWR for all client-side data fetching. Define a central fetcher and key convention:

```js
// lib/fetcher.js
export const fetcher = (url) => fetch(url).then(r => {
  if (!r.ok) throw new Error('API error')
  return r.json()
})

// Key convention: always include the resource path
// /api/agencies/[id]/jobs         → agency jobs
// /api/agencies/[id]/clients      → agency clients
// /api/agencies/[id]/balance      → balance + transactions
// /api/admin/agencies             → admin agency list
```

```js
// Example hook
// hooks/useJobs.js
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

export function useJobs(agencyId) {
  const { data, error, isLoading, mutate } = useSWR(
    agencyId ? `/api/agencies/${agencyId}/jobs` : null,
    fetcher,
    { revalidateOnFocus: true, revalidateOnReconnect: true }
  )
  return { jobs: data ?? [], error, isLoading, refresh: mutate }
}
```

Mutate (invalidate) SWR cache after any mutation (order placed, status changed, etc.) using `mutate('/api/agencies/${agencyId}/jobs')`.

---

## 35. Form Validation Rules

All forms use **React Hook Form** (`npm install react-hook-form`). No Zod — use built-in register validation rules.

### 35.1 Order Builder Validation

| Step | Required fields | Rules |
|---|---|---|
| Service select | At least 1 service selected | — |
| Client details | `clientName`, `clientBiz`, `clientEmail` | Email must contain `@` |
| Brief | Varies per service (see §11) | `businessName` always required |
| Payment | Payment method selected | If card: all card fields via Stripe Elements |

### 35.2 Client Invite Validation

| Field | Rule |
|---|---|
| `businessName` | Required, min 2 chars |
| `contactName` | Required |
| `contactEmail` | Required, valid email format |
| `portalSlug` | Required, lowercase alphanumeric + hyphens only (`/^[a-z0-9-]+$/`) |
| `inviteMessage` | Optional, max 500 chars |

### 35.3 Slug Auto-generation

Auto-generate `portalSlug` from `businessName` as the user types:

```js
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
// e.g. "Coastal Realty & Sons" → "coastal-realty-sons"
```

Validate uniqueness server-side before sending the invite.

---

## 36. White-Label Brand Injection

The client portal layout reads the agency's brand config and injects it as CSS custom properties server-side:

```js
// app/portal/[agencySlug]/[clientSlug]/layout.jsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function ClientPortalLayout({ children, params }) {
  const supabase = createServerSupabaseClient()
  const { data: brand } = await supabase.from('agency_brands')
    .select('*').eq('portal_slug', params.agencySlug).single()

  if (!brand) notFound()

  const cssVars = `
    :root {
      --wl-primary: ${brand.primary_colour};
      --wl-accent:  ${brand.accent_colour};
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <title>{brand.display_name}</title>
      {children}
    </>
  )
}
```

Never cache the brand layout with long TTLs — agencies change their branding and expect it to reflect immediately. Use `cache: 'no-store'` or `revalidate: 60`.

---

## 37. Admin Impersonation

When an admin clicks "Impersonate" on an agency or client, the system:
1. Creates a signed impersonation token (short-lived, 1 hour)
2. Logs the action in `admin_actions`
3. Navigates to the relevant portal with the token in a cookie
4. The portal layout detects the token and renders an **admin banner** at the top

```js
// app/api/admin/agencies/[id]/impersonate/route.js
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req, { params }) {
  const supabase = createAdminSupabaseClient()
  const session = await supabase.auth.getSession()
  const adminId = session.data.session.user.id

  // Log it
  await supabase.from('admin_actions').insert({
    admin_id: adminId, action: 'impersonate',
    target_type: 'agency', target_id: params.id,
    metadata: { timestamp: new Date().toISOString() }
  })

  // Set short-lived cookie
  cookies().set('impersonating_agency', params.id, {
    httpOnly: true, secure: true, maxAge: 3600, path: '/'
  })

  return Response.json({ redirect: '/agency/dashboard' })
}
```

The agency layout checks for this cookie and shows a purple "Admin Mode" banner with a "Stop Impersonating" button.

---

## 38. Dispute Resolution Flow

When an order is disputed (`status = 'disputed'`), the following happens:

1. Agency or client marks an order as disputed via a "Raise dispute" button on the project detail page
2. Project `status` → `disputed`
3. Admin is notified (`notifications` insert + email)
4. Admin sees the order in `/admin/orders` with a red ⚑ flag
5. Admin reviews both sides via the order detail page (can see all comments, files, timeline)
6. Admin resolves: either reopens the order (`status → in_progress`), forces delivery (`status → delivered`), or issues a refund

```sql
-- Dispute resolution via admin
UPDATE projects SET status = 'in_progress', revision_count = revision_count + 1
WHERE id = $1;
-- OR
UPDATE projects SET status = 'delivered', delivered_at = NOW() WHERE id = $1;
```

For refunds: trigger a Stripe refund via the API and credit the agency's balance:

```js
await stripe.refunds.create({ payment_intent: job.stripe_payment_intent_id, amount: refundAmountCents })
await supabase.from('balance_transactions').insert({ type: 'refund', amount_cents: refundAmountCents, ... })
```

---

## 39. SEO & Metadata

### 39.1 Agency Portal — No public SEO (auth required)

```js
// app/agency/layout.jsx
export const metadata = { robots: 'noindex, nofollow' }
```

### 39.2 Client Portal — Branded metadata

```js
// app/portal/[agencySlug]/[clientSlug]/layout.jsx
export async function generateMetadata({ params }) {
  const brand = await getBrand(params.agencySlug)
  return {
    title: `${brand.display_name} · Project Portal`,
    description: `Track your creative projects with ${brand.display_name}`,
    robots: 'noindex, nofollow', // clients' portals are private
  }
}
```

### 39.3 Public Pages (referral signup, login)

```js
export const metadata = {
  title: 'nexxtt.io — White-label design for agencies',
  description: 'Help your clients get world-class design. nexxtt.io handles production; you handle the relationship.',
  openGraph: { images: ['/og-image.png'] }
}
```

---

## 40. Accessibility (a11y)

| Requirement | Implementation |
|---|---|
| Focus management on navigation | Use `router.push()` + `document.title` update; set focus to main heading |
| All buttons have labels | Add `aria-label` to icon-only buttons (hamburger, notification bell, ✕ close) |
| Color contrast | All text meets WCAG AA (4.5:1 minimum). Teal (#00B8A9) on white = ✓ |
| Keyboard navigation | shadcn components are keyboard-accessible by default |
| Screen reader for live updates | Wrap realtime status updates in `aria-live="polite"` region |
| Form errors | Use `aria-describedby` linking inputs to error messages |
| Table headers | Always include `<th scope="col">` in MUI DataGrid via `renderHeader` |
| Skip to content | Add `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>` in root layout |

---

## 41. Performance

| Optimization | Implementation |
|---|---|
| Route-level code splitting | Next.js App Router handles this automatically per `page.jsx` |
| Dashboard variant lazy loading | `const DashboardD = dynamic(() => import('./DashboardD'), { ssr: false })` |
| MUI DataGrid tree-shaking | Import from `@mui/x-data-grid` (not `@mui/x-data-grid-pro`) |
| Image optimization | Use `next/image` for all agency logos and brand assets |
| Font loading | Use `next/font/google` with `display: 'swap'` |
| SWR deduplication | SWR deduplicates identical requests within 2s automatically |
| Supabase connection pooling | Use `@supabase/ssr` which reuses connections per request |
| Bundle size budget | Keep page JS < 100KB gzipped. Audit with `next build --profile` |

---

## 42. Deployment (Vercel)

### 42.1 `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "no-store" }]
    }
  ],
  "rewrites": [
    { "source": "/r/:code", "destination": "/referral/join?ref=:code" }
  ]
}
```

### 42.2 Environment Setup

Set all variables from §19 in Vercel project settings under "Environment Variables". Separate values for `Development`, `Preview`, and `Production` environments.

### 42.3 Custom Domain Config

- Main app: `nexxtt.io` → Vercel deployment
- White-label proxy: Add `*.nexxtt.io` wildcard in Vercel domains OR configure Vercel to accept any incoming hostname and handle it in middleware

### 42.4 Supabase Production Checklist

- [ ] Enable RLS on all tables
- [ ] Set `JWT expiry` to 3600s (1 hour)
- [ ] Enable `Email confirmations` for direct client + referral signup
- [ ] Disable email confirmation for agency client invites (magic link handles it)
- [ ] Set SMTP provider to Resend in Supabase Auth settings
- [ ] Configure Supabase Storage CORS to allow `nexxtt.io` and `*.nexxtt.io`
- [ ] Enable Point-in-Time Recovery (PITR) on production DB
- [ ] Set up pg_cron extension: `CREATE EXTENSION pg_cron;`

---

## 43. Initial Seed Data

Run this in Supabase SQL editor after creating the schema. Claude Code should create a `supabase/seed.sql` file:

```sql
-- Platform config
INSERT INTO platform_config (name, support_email, commission_rate, commission_months, rush_surcharge)
VALUES ('nexxtt.io', 'support@nexxtt.io', 0.20, 12, 0.50);

-- Services catalog
INSERT INTO services (name, slug, icon, cost_price_cents, default_retail_cents, sla_days, rush_sla_days, sort_order) VALUES
  ('Website Design',   'website-design',   '🌐', 42000, 70000,  7,  3, 1),
  ('Logo Design',      'logo-design',      '✦',  18000, 40000,  5,  2, 2),
  ('Brand Guidelines', 'brand-guidelines', '🎨', 32000, 65000, 10,  5, 3),
  ('Social Media Pack','social-media-pack','📱', 15000, 35000,  5,  3, 4),
  ('Content Writing',  'content-writing',  '✍️', 13000, 28000,  5,  3, 5);

-- Admin user (create via Supabase Auth dashboard first, then insert profile)
-- INSERT INTO user_profiles (id, role, first_name, last_name) VALUES ('<admin-uuid>', 'admin', 'Riya', 'Tanaka');
```

---

## 44. Testing Strategy

Claude Code should create basic tests. Do not over-invest in tests on first build — focus on critical paths.

### 44.1 Unit Tests (Vitest)

```bash
npm install -D vitest @testing-library/react @testing-library/user-event
```

Test: `slugify()`, `formatCurrency()`, `calculateCommission()`, `generateJobNumber()`.

### 44.2 Integration Tests

Test the three most critical API routes:
- `POST /api/jobs` — order placement, balance deduction
- `POST /api/clients/[agencyId]/invite` — invite creation, email send
- `POST /api/webhooks/stripe` — balance credit on payment success

### 44.3 E2E (Playwright — Phase 2 only)

Core flows to cover eventually:
1. Agency signup → approval → first order → delivered
2. Client invite → accept → view project → approve deliverable
3. Referral partner signup → share link → client signs up → commission created

---

## 45. `.gitignore` & Project Setup Commands

### 45.1 Setup Commands (run in order)

```bash
# 1. Create Next.js app
npx create-next-app@latest nexxtt-app --js --tailwind --eslint --app --src-dir=no --import-alias='@/*'
cd nexxtt-app

# 2. Install shadcn/ui
npx shadcn-ui@latest init
# Choose: Default style, CSS variables, slate base color

# 3. Add shadcn components needed
npx shadcn-ui@latest add button input label select textarea card badge dialog sheet dropdown-menu command popover tabs toast separator avatar

# 4. Install MUI
npm install @mui/x-data-grid @mui/material @emotion/react @emotion/styled

# 5. Install Supabase
npm install @supabase/supabase-js @supabase/ssr

# 6. Install other packages
npm install swr zustand react-hook-form react-dropzone resend @react-email/components recharts
npm install @stripe/stripe-js @stripe/react-stripe-js stripe
npm install lucide-react

# 7. Install Supabase CLI (for local dev + edge functions)
npm install -D supabase

# 8. Initialize Supabase locally
npx supabase init
npx supabase start  # starts local Supabase stack via Docker
```

### 45.2 `.gitignore` additions

```
.env.local
.env.*.local
.supabase/
supabase/.branches/
supabase/.temp/
```

---

## 46. Updated Build Order

Updated to reflect all additions above. Each step is a standalone deliverable Claude Code can complete and test independently.

1. **Scaffold** — `create-next-app`, Tailwind tokens, shadcn init, MUI theme, env vars
2. **Supabase schema** — all tables + RLS + `seed.sql`, run locally with Supabase CLI
3. **Auth** — login pages for all 5 roles, middleware, session reading
4. **Agency portal shell** — gradient sidebar, topbar, hamburger drawer, bottom nav, `useAgencyStore`
5. **Dashboard variants A–D** — all 4 layouts with switcher, sparklines, bento, kanban, gantt
6. **Notifications** — `notifications` table, `useNotifications` hook, popover bell
7. **Global search** — shadcn Command palette, `⌘K` shortcut
8. **Order builder** — 4-step wizard (service → brief → client → payment) with `react-dropzone` brief uploads
9. **All 5 brief forms** — per-service multi-step forms with validation
10. **Orders list** — MUI DataGrid + mobile cards, status badges, realtime updates
11. **Project detail screens** — all 9 project views (website/logo/brand/social/content/delivered/etc.)
12. **Priority unlock** — DB trigger, progress bar in sidebar, feature gating
13. **Job number generation** — `generate_job_number()` SQL function
14. **Client Manager** — DataGrid + mobile cards, filter tabs, invite flow
15. **Client invite** — 3-step form, live email preview, Supabase magic link, Resend email
16. **Client portal (white-label)** — brand injection layout, dashboard, project views, approval flow, mobile bottom nav
17. **Balance + Stripe** — top-up packages, Stripe Elements, webhook handler, `balance_transactions`
18. **Profit dashboard** — Recharts area/bar charts, per-client DataGrid
19. **Brand settings** — logo upload (Supabase Storage), colour picker, portal preview, slug config
20. **Referral portal** — dashboard, commission streams, referral link, calculator
21. **Direct client portal** — all 5 screens
22. **Admin portal** — all 8 screens, impersonation (cookie + banner + `admin_actions` log), feature flags
23. **Dispute resolution** — flag UI, admin resolve flow, Stripe refund
24. **Email templates** — all 8 Resend + React Email templates
25. **Edge functions** — `calculate-commission`, `expire-invites`, `auto-topup` (Supabase CLI deploy)
26. **pg_cron jobs** — invite expiry, auto top-up, monthly commission aggregation
27. **Toast + error states** — shadcn Toaster, empty states, skeletons, error boundaries
28. **SEO + metadata** — page titles, noindex on private portals, OG image
29. **Accessibility audit** — aria-labels, focus management, color contrast check
30. **Mobile audit** — test every screen at 375px, overflow fixes, bottom nav verification
31. **Performance** — dynamic imports for dashboard variants, bundle size audit
32. **Custom domain** — CNAME middleware rewrite, Vercel wildcard domain config
33. **Deploy to production** — Vercel deploy, Supabase production project, Stripe live keys
