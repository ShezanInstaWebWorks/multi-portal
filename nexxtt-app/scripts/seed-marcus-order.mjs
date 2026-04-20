// Seed 1 demo order for Marcus (direct_client) so his portal has data to show.
// Idempotent: skips if an order already exists for Marcus.
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

// 1. Marcus
const { data: marcus } = await admin
  .from("user_profiles")
  .select("id, first_name")
  .eq("first_name", "Marcus")
  .single();
if (!marcus) { console.error("Marcus not found"); process.exit(1); }

// 2. Already has an order? Skip.
const { count } = await admin
  .from("jobs")
  .select("*", { count: "exact", head: true })
  .eq("direct_client_user_id", marcus.id);
if ((count ?? 0) > 0) {
  console.log(`Marcus already has ${count} job(s) — skipping seed.`);
  process.exit(0);
}

// 3. Generate job number
const { data: jobNumber } = await admin.rpc("generate_job_number");

// 4. Pick 2 services: logo + website
const { data: services } = await admin
  .from("services")
  .select("id, slug, cost_price_cents, default_retail_cents, sla_days")
  .in("slug", ["logo-design", "website-design"])
  .order("slug");

const items = services.map((s) => {
  // Direct clients pay retail with no markup on top (nexxtt.io's retail = their cost)
  return {
    service_id: s.id,
    cost_price_cents: s.default_retail_cents,
    retail_price_cents: s.default_retail_cents,
    sla_days: s.sla_days,
    status: s.slug === "logo-design" ? "in_review" : "in_progress",
  };
});

const totalCost   = items.reduce((a, i) => a + i.cost_price_cents, 0);
const totalRetail = items.reduce((a, i) => a + i.retail_price_cents, 0);

// 5. Insert job (no agency_id / client_id — this is a direct-client order)
const { data: job, error: jobErr } = await admin
  .from("jobs")
  .insert({
    job_number: jobNumber,
    direct_client_user_id: marcus.id,
    placed_by: marcus.id,
    status: "in_progress",
    is_rush: false,
    total_cost_cents: totalCost,
    total_retail_cents: totalRetail,
    payment_method: "stripe",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
  })
  .select("id, job_number")
  .single();
if (jobErr) { console.error(jobErr); process.exit(1); }
console.log(`[+] job ${job.job_number}  id=${job.id}`);

// 6. Insert projects
const now = Date.now();
const projectRows = items.map((i, ix) => ({
  job_id: job.id,
  service_id: i.service_id,
  status: i.status,
  cost_price_cents: i.cost_price_cents,
  retail_price_cents: i.retail_price_cents,
  is_rush: false,
  due_date: new Date(now + i.sla_days * 86400000).toISOString().slice(0, 10),
}));
const { data: projects, error: projErr } = await admin
  .from("projects")
  .insert(projectRows)
  .select("id, service_id");
if (projErr) { console.error(projErr); process.exit(1); }
console.log(`[+] projects ×${projects.length}`);

// 7. Briefs
const briefRows = projects.map((p) => {
  const svc = services.find((s) => s.id === p.service_id);
  return {
    project_id: p.id,
    service_slug: svc.slug,
    data: {
      businessName: "TechCore SaaS",
      goals: "Modern brand that signals enterprise trust but stays approachable for SMB buyers.",
    },
  };
});
await admin.from("briefs").insert(briefRows);
console.log(`[+] briefs ×${briefRows.length}`);

console.log(`\nDone. Marcus now has order ${job.job_number}.`);
