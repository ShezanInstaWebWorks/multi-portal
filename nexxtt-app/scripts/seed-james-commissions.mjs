// Seed 2 demo referrals for James Park + a handful of commission entries spanning
// the last 3 months so the referral portal has data to render.
// Idempotent: skips if James already has referrals.
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

// 1. James + his referral_partner row
const { data: james } = await admin
  .from("user_profiles")
  .select("id")
  .eq("first_name", "James")
  .single();
const { data: partner } = await admin
  .from("referral_partners")
  .select("id, referral_code, total_earned_cents, pending_payout_cents")
  .eq("user_id", james.id)
  .single();
if (!partner) { console.error("James's referral_partner row not found"); process.exit(1); }

// 2. Already seeded? skip
const { count: existing } = await admin
  .from("referrals")
  .select("*", { count: "exact", head: true })
  .eq("referral_partner_id", partner.id);
if ((existing ?? 0) > 0) {
  console.log(`James already has ${existing} referral(s) — skipping seed.`);
  process.exit(0);
}

// 3. Resolve the people he "referred" — reuse existing demo users so FK holds.
const { data: alex   } = await admin.from("user_profiles").select("id").eq("first_name", "Alex").single();
const { data: marcus } = await admin.from("user_profiles").select("id").eq("first_name", "Marcus").single();

// And the jobs those referrals drove — Alex's agency placed NXT-2026-0001,
// Marcus is the direct client on NXT-2026-0002.
const { data: jobAlex  } = await admin.from("jobs").select("id, total_retail_cents, created_at").eq("job_number", "NXT-2026-0001").single();
const { data: jobMarcus} = await admin.from("jobs").select("id, total_retail_cents, created_at").eq("job_number", "NXT-2026-0002").single();

// 4. Insert 2 referrals (Alex referred 75 days ago, Marcus 40 days ago)
const now = Date.now();
const twoMonthsAgo = new Date(now - 75 * 86400000);
const oneMonthAgo  = new Date(now - 40 * 86400000);

const { data: referrals, error: refErr } = await admin
  .from("referrals")
  .insert([
    {
      referral_partner_id:   partner.id,
      referred_user_id:      alex.id,
      referred_at:           twoMonthsAgo.toISOString(),
      first_order_at:        jobAlex.created_at,
      commission_expires_at: new Date(twoMonthsAgo.getTime() + 365 * 86400000).toISOString(),
      is_active:             true,
    },
    {
      referral_partner_id:   partner.id,
      referred_user_id:      marcus.id,
      referred_at:           oneMonthAgo.toISOString(),
      first_order_at:        jobMarcus.created_at,
      commission_expires_at: new Date(oneMonthAgo.getTime() + 365 * 86400000).toISOString(),
      is_active:             true,
    },
  ])
  .select("id, referred_user_id");
if (refErr) { console.error(refErr); process.exit(1); }
console.log(`[+] referrals ×${referrals.length}`);

// 5. Commission entries — 20% of order value, spanning 3 months
const COMMISSION_RATE = 0.2;
const entries = [];
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Alex stream: simulated monthly recurring, 3 periods
const alexRef = referrals.find((r) => r.referred_user_id === alex.id);
for (let i = 2; i >= 0; i--) {
  const d = new Date(now - i * 30 * 86400000);
  const orderValue = jobAlex.total_retail_cents;
  entries.push({
    referral_id:         alexRef.id,
    referral_partner_id: partner.id,
    job_id:              jobAlex.id,
    period_month:        monthKey(d),
    order_value_cents:   orderValue,
    commission_cents:    Math.round(orderValue * COMMISSION_RATE),
    status:              i === 0 ? "pending" : "paid",
    paid_at:             i === 0 ? null : new Date(d.getTime() + 5 * 86400000).toISOString(),
  });
}

// Marcus stream: 2 periods
const marcusRef = referrals.find((r) => r.referred_user_id === marcus.id);
for (let i = 1; i >= 0; i--) {
  const d = new Date(now - i * 30 * 86400000);
  const orderValue = jobMarcus.total_retail_cents;
  entries.push({
    referral_id:         marcusRef.id,
    referral_partner_id: partner.id,
    job_id:              jobMarcus.id,
    period_month:        monthKey(d),
    order_value_cents:   orderValue,
    commission_cents:    Math.round(orderValue * COMMISSION_RATE),
    status:              i === 0 ? "pending" : "paid",
    paid_at:             i === 0 ? null : new Date(d.getTime() + 5 * 86400000).toISOString(),
  });
}

const { error: entErr } = await admin.from("commission_entries").insert(entries);
if (entErr) { console.error(entErr); process.exit(1); }
console.log(`[+] commission_entries ×${entries.length}`);

// 6. Update partner totals
const totalEarned  = entries.filter((e) => e.status === "paid").reduce((a, e) => a + e.commission_cents, 0);
const pendingPayout = entries.filter((e) => e.status === "pending").reduce((a, e) => a + e.commission_cents, 0);
await admin
  .from("referral_partners")
  .update({ total_earned_cents: totalEarned, pending_payout_cents: pendingPayout })
  .eq("id", partner.id);
console.log(`[+] partner totals updated: earned=$${(totalEarned / 100).toFixed(2)}  pending=$${(pendingPayout / 100).toFixed(2)}`);

console.log("\nDone.");
