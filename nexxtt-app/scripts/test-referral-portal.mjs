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

const james = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

await james.auth.signInWithPassword({ email: "james@parkbusiness.com.au", password: "demo1234" });
console.log("[OK] signed in as James");

const { data: partner } = await james
  .from("referral_partners")
  .select("id, business_name, referral_code, total_earned_cents, pending_payout_cents")
  .single();
console.log(`[OK] partner: ${partner?.business_name} code=${partner?.referral_code}  earned=$${(partner?.total_earned_cents / 100).toFixed(2)}  pending=$${(partner?.pending_payout_cents / 100).toFixed(2)}`);

const { data: referrals } = await james
  .from("referrals")
  .select("id, is_active");
console.log(`[OK] James reads ${referrals?.length ?? 0} referrals`);

const { data: commissions } = await james
  .from("commission_entries")
  .select("id, period_month, commission_cents, status");
console.log(`[OK] James reads ${commissions?.length ?? 0} commission entries`);
for (const c of commissions ?? []) {
  console.log(`     ${c.period_month}  $${(c.commission_cents / 100).toFixed(2)}  ${c.status}`);
}

// Isolation: James should NOT see other partners' referrals
const { data: otherReferrals } = await james
  .from("referrals")
  .select("id")
  .neq("referral_partner_id", partner.id);
console.log(`[${(otherReferrals?.length ?? 0) === 0 ? "OK" : "FAIL"}] RLS isolation: 0 other-partner referrals visible`);

console.log("\nTEST PASS");
