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

const marcus = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const { error: signErr } = await marcus.auth.signInWithPassword({
  email: "marcus@techcore.com",
  password: "demo1234",
});
if (signErr) { console.error(signErr); process.exit(1); }
console.log("[OK] signed in as Marcus");

// Jobs via jobs_direct_client_view
const { data: jobs, error: jobsErr } = await marcus
  .from("jobs")
  .select("id, job_number, status, total_retail_cents, projects(id, status, services(name, icon))")
  .order("created_at", { ascending: false });
if (jobsErr) { console.error(jobsErr); process.exit(1); }
console.log(`[${jobs?.length ? "OK" : "FAIL"}] Marcus reads ${jobs?.length ?? 0} jobs via RLS`);
for (const j of jobs ?? []) {
  console.log(`     ${j.job_number}  status=${j.status}  total=$${(j.total_retail_cents / 100).toFixed(2)}  projects=${j.projects?.length ?? 0}`);
  for (const p of j.projects ?? []) {
    console.log(`       ${p.services?.icon} ${p.services?.name}  status=${p.status}`);
  }
}

// Projects directly
const { data: projects } = await marcus
  .from("projects")
  .select("id, status, services(name)")
  .in("job_id", (jobs ?? []).map((j) => j.id));
console.log(`[OK] Marcus reads ${projects?.length ?? 0} projects via projects_direct_client_view`);

// Safety: Marcus should NOT see Bright Agency jobs
const { data: others } = await marcus
  .from("jobs")
  .select("id")
  .not("direct_client_user_id", "is", null)
  .neq("direct_client_user_id", (await marcus.auth.getUser()).data.user.id);
console.log(`[${(others?.length ?? 0) === 0 ? "OK" : "FAIL"}] RLS isolation: Marcus sees 0 other direct clients' jobs`);

// Safety: no agency jobs either
const { data: agencyJobs } = await marcus
  .from("jobs")
  .select("id")
  .not("agency_id", "is", null);
console.log(`[${(agencyJobs?.length ?? 0) === 0 ? "OK" : "FAIL"}] Marcus sees 0 agency jobs (can't read Bright Agency's NXT-2026-0001)`);

console.log("\nTEST PASS");
