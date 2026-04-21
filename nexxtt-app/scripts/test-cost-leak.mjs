// Verify the column-level revoke: clients cannot SELECT cost columns
// even though RLS allows them to read the row.
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

async function asUser(email) {
  const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  await c.auth.signInWithPassword({ email, password: "demo1234" });
  return c;
}

console.log("=== as Sarah (agency_client) ===");
{
  const sarah = await asUser("sarah@coastalrealty.com.au");

  // Safe read — should succeed, no cost column
  const safe = await sarah.from("projects").select("id, status, retail_price_cents").limit(1);
  console.log(`[${safe.error ? "FAIL" : "OK"}] safe select (no cost):  rows=${safe.data?.length ?? 0}${safe.error ? " err="+safe.error.message : ""}`);

  // Leaky read — should now fail with 42501
  const leak = await sarah.from("projects").select("id, cost_price_cents").limit(1);
  console.log(`[${leak.error ? "OK" : "FAIL"}] leak select (cost):     ${leak.error ? "blocked: " + leak.error.message : "LEAKED data=" + JSON.stringify(leak.data)}`);

  // Jobs total_cost
  const leak2 = await sarah.from("jobs").select("id, total_cost_cents").limit(1);
  console.log(`[${leak2.error ? "OK" : "FAIL"}] leak select (jobs cost):${leak2.error ? "blocked: " + leak2.error.message : "LEAKED data=" + JSON.stringify(leak2.data)}`);

  // Safe jobs read — should succeed
  const safeJobs = await sarah.from("jobs").select("id, job_number, total_retail_cents").limit(1);
  console.log(`[${safeJobs.error ? "FAIL" : "OK"}] safe jobs (retail):     rows=${safeJobs.data?.length ?? 0}${safeJobs.error ? " err="+safeJobs.error.message : ""}`);
}

console.log("\n=== as Marcus (direct_client) ===");
{
  const marcus = await asUser("marcus@techcore.com");
  const leak = await marcus.from("projects").select("id, cost_price_cents").limit(1);
  console.log(`[${leak.error ? "OK" : "FAIL"}] leak select (cost):     ${leak.error ? "blocked" : "LEAKED"}`);
}

console.log("\n=== as Alex (agency) — session client loses cost too, now expected ===");
{
  const alex = await asUser("alex@brightagency.com.au");
  const leak = await alex.from("projects").select("id, cost_price_cents").limit(1);
  console.log(`[${leak.error ? "OK" : "??"}] direct session cost read: ${leak.error ? "blocked — agency pages use admin client via resolveAgencyContext" : "returned (was permitted pre-session-27)"}`);
  const safe = await alex.from("jobs").select("id, job_number, total_retail_cents").limit(1);
  console.log(`[${safe.error ? "FAIL" : "OK"}] retail still fine:      rows=${safe.data?.length ?? 0}`);
}

console.log("\n=== admin client (service role) still sees cost ===");
{
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data } = await admin.from("projects").select("cost_price_cents").limit(1);
  console.log(`[${data?.[0]?.cost_price_cents != null ? "OK" : "FAIL"}] admin reads cost: first row cost = ${data?.[0]?.cost_price_cents}`);
}

console.log("\nTEST COMPLETE");
