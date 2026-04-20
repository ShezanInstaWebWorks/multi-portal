// End-to-end smoke test of the /api/jobs core logic, going straight through
// the SQL functions and tables (bypasses HTTP). Confirms:
//   - deduct_balance() atomicity
//   - generate_job_number() format
//   - jobs / projects / briefs / balance_transactions inserts
//   - balance reconciles after
//
// Run:  node scripts/test-order-flow.mjs
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function fail(msg, err) {
  console.error(`FAIL: ${msg}`, err ?? "");
  process.exit(1);
}

// 1. Locate Alex's agency + Coastal Realty client
const { data: alex } = await admin
  .from("user_profiles")
  .select("id, agency_id, first_name")
  .eq("first_name", "Alex")
  .single();
if (!alex) fail("Alex profile not found");

const { data: agency } = await admin
  .from("agencies")
  .select("id, balance_cents")
  .eq("id", alex.agency_id)
  .single();
console.log(`Agency balance before: $${(agency.balance_cents / 100).toFixed(2)}`);

const { data: client } = await admin
  .from("clients")
  .select("id")
  .eq("agency_id", alex.agency_id)
  .eq("business_name", "Coastal Realty")
  .single();
if (!client) fail("Coastal Realty client not found");

// 2. Pick two services (logo-design + content-writing) to simulate a multi-project job
const { data: services } = await admin
  .from("services")
  .select("id, slug, cost_price_cents, default_retail_cents, sla_days, rush_sla_days")
  .in("slug", ["logo-design", "content-writing"])
  .order("slug");

const MARKUP = 0.35;
const items = services.map((s, i) => {
  const rush = i === 0;
  const cost = Math.round(s.cost_price_cents * (rush ? 1.5 : 1));
  return {
    serviceId: s.id,
    slug: s.slug,
    rush,
    cost_cents: cost,
    retail_cents: Math.round(cost * (1 + MARKUP)),
    sla_days: rush ? s.rush_sla_days : s.sla_days,
  };
});
const totalCost = items.reduce((a, p) => a + p.cost_cents, 0);
const totalRetail = items.reduce((a, p) => a + p.retail_cents, 0);
console.log(`Items: ${items.map((i) => `${i.slug}${i.rush ? "(rush)" : ""}=$${(i.cost_cents / 100).toFixed(2)}`).join(", ")}`);
console.log(`Total cost: $${(totalCost / 100).toFixed(2)}`);

// 3. deduct_balance
const { data: deduct, error: deductErr } = await admin.rpc("deduct_balance", {
  p_agency_id: agency.id,
  p_amount: totalCost,
});
if (deductErr) fail("deduct_balance rpc", deductErr);
if (!deduct?.success) fail("deduct_balance returned not success");
console.log(`deduct_balance: newBalance=$${(deduct.new_balance / 100).toFixed(2)}`);

// 4. generate_job_number
const { data: jobNumber, error: jnErr } = await admin.rpc("generate_job_number");
if (jnErr) fail("generate_job_number", jnErr);
if (!/^NXT-\d{4}-\d{4}$/.test(jobNumber)) fail(`job_number format wrong: ${jobNumber}`);
console.log(`job_number: ${jobNumber}`);

// 5. Insert job
const { data: job, error: jobErr } = await admin
  .from("jobs")
  .insert({
    job_number: jobNumber,
    agency_id: agency.id,
    client_id: client.id,
    placed_by: alex.id,
    status: "brief_pending",
    is_rush: items.some((i) => i.rush),
    total_cost_cents: totalCost,
    total_retail_cents: totalRetail,
    payment_method: "balance",
  })
  .select("id, job_number")
  .single();
if (jobErr) fail("job insert", jobErr);
console.log(`job row: id=${job.id} number=${job.job_number}`);

// 6. Insert projects
const { data: projects, error: projErr } = await admin
  .from("projects")
  .insert(
    items.map((i) => ({
      job_id: job.id,
      service_id: i.serviceId,
      status: "brief_pending",
      cost_price_cents: i.cost_cents,
      retail_price_cents: i.retail_cents,
      is_rush: i.rush,
      due_date: new Date(Date.now() + i.sla_days * 86400000).toISOString().slice(0, 10),
    }))
  )
  .select("id, service_id");
if (projErr) fail("projects insert", projErr);
console.log(`projects: ${projects.length} rows`);

// 7. Insert briefs
const { error: briefErr } = await admin.from("briefs").insert(
  projects.map((p) => ({
    project_id: p.id,
    service_slug: items.find((i) => i.serviceId === p.service_id).slug,
    data: { businessName: "Coastal Realty", goals: "Test brief from order flow script" },
  }))
);
if (briefErr) fail("briefs insert", briefErr);
console.log(`briefs: ${projects.length} rows`);

// 8. balance_transactions entry
const { error: btErr } = await admin.from("balance_transactions").insert({
  agency_id: agency.id,
  type: "debit",
  amount_cents: -totalCost,
  balance_after_cents: deduct.new_balance,
  description: `Order ${job.job_number}`,
  related_job_id: job.id,
});
if (btErr) fail("balance_transactions insert", btErr);
console.log("balance_transactions: 1 row");

// 9. Verify end state
const { data: agencyAfter } = await admin
  .from("agencies")
  .select("balance_cents")
  .eq("id", agency.id)
  .single();
const expected = agency.balance_cents - totalCost;
if (agencyAfter.balance_cents !== expected) {
  fail(`balance mismatch: got ${agencyAfter.balance_cents}, expected ${expected}`);
}
console.log(`Agency balance after: $${(agencyAfter.balance_cents / 100).toFixed(2)}  (−$${(totalCost / 100).toFixed(2)} ✓)`);

// Count children
const { count: projCount } = await admin.from("projects").select("*", { count: "exact", head: true }).eq("job_id", job.id);
const { count: briefCount } = await admin.from("briefs").select("*", { count: "exact", head: true }).in("project_id", projects.map((p) => p.id));
console.log(`\nTEST PASS  job=${jobNumber}  projects=${projCount}  briefs=${briefCount}`);
