-- Service packages — three tiers per service (Starter / Growth / Premium).
-- Each package has its own cost, retail, feature list, delivery SLA. The
-- request flow picks packages (not services); the picked package's cost/
-- retail/sla flow into the resulting projects on convert.
--
-- Apply via Supabase dashboard → SQL editor. Idempotent — safe to re-run.
-- Seeds the five services that ship with the platform (website-design,
-- logo-design, brand-guidelines, social-media-pack, content-writing) with
-- three tiers each. If you've renamed/removed any of those slugs, the
-- corresponding INSERTs will silently no-op (the lookup returns no row).

create table if not exists service_packages (
  id              uuid primary key default gen_random_uuid(),
  service_id      uuid not null references services(id) on delete cascade,
  tier            text not null check (tier in ('starter','growth','premium')),
  name            text not null,
  description     text,
  cost_cents      integer not null check (cost_cents >= 0),
  retail_cents    integer not null check (retail_cents >= 0),
  features        text[] default '{}'::text[] not null,
  delivery_days   integer,
  is_popular      boolean default false not null,
  sort_order      integer default 0 not null,
  is_active       boolean default true not null,
  created_at      timestamptz default now() not null,
  unique (service_id, tier)
);

create index if not exists idx_service_packages_service on service_packages (service_id, sort_order);

-- Add package_ids to project_requests so a request can carry an array of
-- selected packages (across multiple services).
alter table project_requests
  add column if not exists package_ids uuid[] default '{}'::uuid[] not null;

create index if not exists idx_project_requests_package_ids
  on project_requests using gin (package_ids);

-- ---------- SEED ----------
-- Re-runnable: ON CONFLICT (service_id, tier) DO UPDATE keeps the data fresh
-- if you tweak prices/features here and re-run.

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'starter', 'Landing Page',
       'Perfect for new businesses needing a strong online presence fast.',
       42000, 70000,
       array['Single page / landing page design','Mobile responsive layout','Contact form integration','1 round of revisions','Delivered in 5 days'],
       5, false, 1
  from services s where s.slug = 'website-design'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'growth', 'Multi-Page Website',
       'A complete website for growing businesses ready to scale.',
       65000, 110000,
       array['Up to 5 custom pages','CMS for easy content updates','SEO foundations built-in','Blog-ready structure','2 rounds of revisions','Delivered in 7 days'],
       7, true, 2
  from services s where s.slug = 'website-design'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'premium', 'Full Brand Website',
       'An enterprise-grade website with advanced functionality.',
       95000, 160000,
       array['Up to 10 fully custom pages','Animations & micro-interactions','CRM / booking integration','Advanced SEO setup','Unlimited revisions','Priority 7-day delivery'],
       7, false, 3
  from services s where s.slug = 'website-design'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

-- Logo Design
insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'starter', 'Essential Mark',
       'A clean, professional logo to get your client started.',
       18000, 40000,
       array['2 initial concept directions','1 round of revisions','PNG & JPG files','Light & dark versions','Delivered in 3 days'],
       3, false, 1
  from services s where s.slug = 'logo-design'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'growth', 'Brand Identity Logo',
       'A versatile logo system built for long-term brand growth.',
       30000, 55000,
       array['3 concept directions','2 rounds of revisions','All vector formats (SVG, AI, PDF)','Icon + wordmark variants','Mono & colour versions','Delivered in 5 days'],
       5, true, 2
  from services s where s.slug = 'logo-design'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'premium', 'Full Logo System',
       'A comprehensive logo system with every possible application covered.',
       48000, 90000,
       array['4 concept directions','Unlimited revisions','Full icon + mark + wordmark system','Favicon, app icon, social avatar','Usage guidelines document','Priority 5-day delivery'],
       5, false, 3
  from services s where s.slug = 'logo-design'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

-- Brand Guidelines
insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'starter', 'Brand Basics',
       'Core brand rules to maintain consistency across touchpoints.',
       25000, 50000,
       array['Colour palette (primary + secondary)','Typography selection','Logo usage rules','Simple PDF style guide','Delivered in 5 days'],
       5, false, 1
  from services s where s.slug = 'brand-guidelines'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'growth', 'Full Brand System',
       'Everything needed to build a consistent, recognisable brand.',
       42000, 80000,
       array['Complete colour & typography system','Tone of voice guidelines','Photography & imagery style','Social media template rules','Comprehensive PDF guide','Delivered in 7 days'],
       7, true, 2
  from services s where s.slug = 'brand-guidelines'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'premium', 'Enterprise Brand Bible',
       'A complete brand bible for ambitious brands built to last.',
       65000, 120000,
       array['Everything in Growth','Custom icon & pattern library','Print & digital collateral templates','Email & presentation templates','Do/don''t usage examples','Priority 7-day delivery'],
       7, false, 3
  from services s where s.slug = 'brand-guidelines'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

-- Social Media Pack
insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'starter', 'Single Platform',
       'Get one platform looking sharp and on-brand.',
       18000, 35000,
       array['5 feed post templates','1 platform (Instagram or Facebook)','Profile & cover image design','Editable Canva files','Delivered in 3 days'],
       3, false, 1
  from services s where s.slug = 'social-media-pack'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'growth', 'Multi-Platform Pack',
       'A consistent presence across your client''s key platforms.',
       32000, 60000,
       array['10 templates (feed + story)','2 platforms covered','Highlight cover icons','Profile & cover assets','Editable Canva + PNG exports','Delivered in 5 days'],
       5, true, 2
  from services s where s.slug = 'social-media-pack'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'premium', 'Full Social Suite',
       'A complete social media design system across all platforms.',
       52000, 98000,
       array['15 templates across all formats','3 platforms (Insta, FB, LinkedIn)','Ad creative designs included','Story, reel cover & highlight icons','Full Canva workspace setup','Delivered in 7 days'],
       7, false, 3
  from services s where s.slug = 'social-media-pack'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

-- Content Writing
insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'starter', 'Core Pages Copy',
       'Clean, professional copy for your client''s essential pages.',
       15000, 30000,
       array['3 website pages written','SEO-friendly headings','Clear calls to action','1 round of revisions','Delivered in 5 days'],
       5, false, 1
  from services s where s.slug = 'content-writing'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'growth', 'Full Website Copy',
       'Compelling copy across all pages with an SEO strategy built in.',
       28000, 55000,
       array['6 website pages written','Keyword research included','Meta titles & descriptions','About page & team bios','2 rounds of revisions','Delivered in 7 days'],
       7, true, 2
  from services s where s.slug = 'content-writing'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

insert into service_packages (service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order)
select s.id, 'premium', 'Content Strategy',
       'A full content strategy and copy suite for brands serious about growth.',
       45000, 85000,
       array['10 website pages written','Full SEO keyword strategy','Brand voice guide','1 long-form blog post','Email welcome sequence','Unlimited revisions'],
       7, false, 3
  from services s where s.slug = 'content-writing'
on conflict (service_id, tier) do update set
  name = excluded.name, description = excluded.description, cost_cents = excluded.cost_cents,
  retail_cents = excluded.retail_cents, features = excluded.features, delivery_days = excluded.delivery_days,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order;

-- RLS — packages catalog is public-read (same as services).
alter table service_packages enable row level security;
drop policy if exists service_packages_read on service_packages;
create policy service_packages_read on service_packages for select using (true);
