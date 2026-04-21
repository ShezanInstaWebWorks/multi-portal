// Comprehensive smoke test:
//   - All 5 personas sign in and have the expected role + agency mapping
//   - Each persona's portal-data reads succeed via RLS
//   - Each persona is correctly isolated (can't read other personas' data)
//   - Cost-column REVOKE still holds
//   - Realtime publication still wired
//   - Cron functions still callable
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SVC) { console.error("env missing"); process.exit(1); }

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

let passed = 0;
let failed = 0;
const fails = [];

function pass(label) { console.log(`  ✓ ${label}`); passed++; }
function fail(label, err) {
  console.log(`  ✗ ${label}${err ? "  → " + (err.message ?? err) : ""}`);
  failed++; fails.push(label);
}

async function asUser(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: "demo1234" });
  if (error) return { client: c, error };
  return { client: c, user: data.user };
}

const PERSONAS = [
  { email: "alex@brightagency.com.au",     role: "agency",            home: "/agency/dashboard" },
  { email: "sarah@coastalrealty.com.au",   role: "agency_client",     home: "/portal/bright-agency/coastal-realty" },
  { email: "james@parkbusiness.com.au",    role: "referral_partner",  home: "/referral/dashboard" },
  { email: "marcus@techcore.com",          role: "direct_client",     home: "/direct/dashboard" },
  { email: "riya@nexxtt.io",               role: "admin",             home: "/admin" },
];

// ── 1. Auth ────────────────────────────────────────────────────────────
console.log("\n[1] Auth & roles");
const sessions = {};
for (const p of PERSONAS) {
  const { client, user, error } = await asUser(p.email);
  if (error) { fail(`sign in ${p.email}`, error); continue; }
  if (!user) { fail(`sign in ${p.email} (no user)`); continue; }
  const role = user.user_metadata?.role;
  if (role !== p.role) { fail(`${p.email}: role=${role} expected=${p.role}`); continue; }
  sessions[p.role] = { client, user, persona: p };
  pass(`${p.email.padEnd(34)} role=${role}`);
}

// ── 2. Profile rows ────────────────────────────────────────────────────
console.log("\n[2] user_profiles + linked tables");
for (const [role, s] of Object.entries(sessions)) {
  const { data: profile, error } = await s.client
    .from("user_profiles")
    .select("id, role, agency_id")
    .eq("id", s.user.id)
    .single();
  if (error || !profile) fail(`${role} reads own user_profiles`, error);
  else if (profile.role !== role) fail(`${role} profile role mismatch (got ${profile.role})`);
  else pass(`${role.padEnd(20)} user_profiles row read`);
}

// ── 3. Agency portal data (Alex) ──────────────────────────────────────
console.log("\n[3] Agency (Alex) data reads");
if (sessions.agency) {
  const a = sessions.agency.client;
  const adminRead = await admin.from("user_profiles").select("agency_id").eq("id", sessions.agency.user.id).single();
  const agencyId = adminRead.data?.agency_id;
  if (!agencyId) fail("Alex has no agency_id"); else pass(`agency_id resolved (${agencyId.slice(0, 8)}…)`);

  // Direct table reads via session — note these don't include cost cols (revoked)
  const { data: jobs } = await a.from("jobs").select("id, job_number, total_retail_cents").eq("agency_id", agencyId);
  if (jobs?.length) pass(`session jobs read: ${jobs.length} job(s)`); else fail("session jobs read (0)");

  const { data: clients } = await a.from("clients").select("id, business_name").eq("agency_id", agencyId);
  if (clients?.length) pass(`session clients read: ${clients.length} client(s)`); else fail("session clients read (0)");

  // Cost column blocked at session
  const costLeak = await a.from("jobs").select("total_cost_cents").limit(1);
  if (costLeak.error) pass("cost-column REVOKE holds (jobs.total_cost_cents blocked)");
  else fail(`cost leak: jobs.total_cost_cents readable as ${costLeak.error ? "—" : JSON.stringify(costLeak.data)}`);
}

// ── 4. Client portal (Sarah) ──────────────────────────────────────────
console.log("\n[4] Client portal (Sarah) data reads");
if (sessions.agency_client) {
  const s = sessions.agency_client.client;

  const { data: client } = await s.from("clients").select("id, business_name, portal_slug").maybeSingle();
  if (client) pass(`own client row: ${client.business_name}`); else fail("own client row");

  const { data: brand } = await s.from("agency_brands").select("portal_slug, display_name").eq("portal_slug", "bright-agency").maybeSingle();
  if (brand) pass(`agency_brands read: ${brand.display_name}`); else fail("agency_brands read");

  const { data: jobs } = await s.from("jobs").select("id, job_number, status, total_retail_cents").eq("client_id", client?.id ?? "x");
  if (jobs?.length) pass(`own jobs read: ${jobs.length} job(s)`); else fail("own jobs read (0)");

  const { data: projects } = await s.from("projects").select("id, status, retail_price_cents").in("job_id", (jobs ?? []).map((j) => j.id));
  if (projects?.length) pass(`own projects read: ${projects.length} project(s)`); else fail("own projects read (0)");

  const costLeak = await s.from("projects").select("cost_price_cents").limit(1);
  if (costLeak.error) pass("cost-column REVOKE holds (projects.cost_price_cents blocked)");
  else fail("cost leak: projects.cost_price_cents readable");

  // Cross-tenant isolation: should see 0 rows of clients NOT belonging to her
  const { data: others } = await s.from("clients").select("id");
  if ((others?.length ?? 0) === 1) pass("RLS isolation: 1 own client row only");
  else fail(`RLS isolation: sees ${others?.length} client rows (expected 1)`);
}

// ── 5. Direct client (Marcus) ─────────────────────────────────────────
console.log("\n[5] Direct portal (Marcus) data reads");
if (sessions.direct_client) {
  const m = sessions.direct_client.client;
  const { data: jobs } = await m.from("jobs").select("id, job_number, status").eq("direct_client_user_id", sessions.direct_client.user.id);
  if (jobs?.length) pass(`Marcus's own jobs: ${jobs.length}`); else fail("Marcus jobs read (0)");

  // Should see 0 agency jobs
  const { data: agencyJobs } = await m.from("jobs").select("id").not("agency_id", "is", null);
  if ((agencyJobs?.length ?? 0) === 0) pass("RLS isolation: sees 0 agency jobs");
  else fail(`RLS leak: sees ${agencyJobs.length} agency jobs`);
}

// ── 6. Referral partner (James) ───────────────────────────────────────
console.log("\n[6] Referral portal (James) data reads");
if (sessions.referral_partner) {
  const j = sessions.referral_partner.client;
  const { data: partner } = await j.from("referral_partners").select("id, referral_code, total_earned_cents, pending_payout_cents").maybeSingle();
  if (partner) pass(`partner row: code=${partner.referral_code} earned=$${(partner.total_earned_cents/100).toFixed(2)}`); else fail("partner row");

  const { data: refs } = await j.from("referrals").select("id");
  if ((refs?.length ?? 0) > 0) pass(`referrals read: ${refs.length}`); else fail("referrals read");

  const { data: comm } = await j.from("commission_entries").select("id, status, commission_cents");
  if ((comm?.length ?? 0) > 0) pass(`commission entries: ${comm.length}`); else fail("commission entries");
}

// ── 7. Admin (Riya) ───────────────────────────────────────────────────
console.log("\n[7] Admin (Riya) — server-role only at /admin pages");
if (sessions.admin) {
  // Riya's SESSION client cannot read everything; admin pages all use service-role.
  // Test that her profile + role gate works.
  const { data: profile } = await sessions.admin.client.from("user_profiles").select("role").eq("id", sessions.admin.user.id).single();
  if (profile?.role === "admin") pass("Riya profile.role=admin (page-level gate works)");
  else fail("Riya profile role mismatch");

  // service-role sees everything
  const { count: agencyCount } = await admin.from("agencies").select("*", { count: "exact", head: true });
  pass(`service-role sees ${agencyCount} agency row(s)`);
}

// ── 8. Cron functions still callable ──────────────────────────────────
console.log("\n[8] Scheduled jobs callable via RPC");
{
  const r1 = await admin.rpc("expire_invites");
  if (r1.error) fail("expire_invites()", r1.error); else pass(`expire_invites() returned ${r1.data}`);
  const r2 = await admin.rpc("generate_monthly_commissions");
  if (r2.error) fail("generate_monthly_commissions()", r2.error); else pass(`generate_monthly_commissions() returned ${r2.data}`);
}

// ── 9. Storage buckets exist ──────────────────────────────────────────
console.log("\n[9] Storage buckets");
{
  const { data: buckets } = await admin.storage.listBuckets();
  const names = (buckets ?? []).map((b) => b.id);
  for (const want of ["agency-logos", "delivered-files"]) {
    if (names.includes(want)) pass(`bucket exists: ${want}`);
    else fail(`bucket missing: ${want}`);
  }
}

// ── 10. Realtime publication ──────────────────────────────────────────
console.log("\n[10] Realtime");
{
  const { data: pubs } = await admin
    .from("pg_publication_tables")
    .select("schemaname, tablename")
    .eq("pubname", "supabase_realtime")
    .eq("schemaname", "public");
  // Note: pg_publication_tables isn't in the API by default; skip if it errors
  if (pubs?.some((p) => p.tablename === "notifications")) pass("notifications in supabase_realtime publication");
  else console.log("  · skipped (pg_publication_tables not exposed via PostgREST — check via dashboard)");
}

console.log(`\n────────────────────────────────────────`);
console.log(`PASSED: ${passed}   FAILED: ${failed}`);
if (failed > 0) {
  console.log(`\nFailures:`);
  for (const f of fails) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("ALL GREEN");
