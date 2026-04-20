// Smoke test: sign in as each persona and verify the session carries the expected role.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const PERSONAS = [
  { email: "alex@brightagency.com.au",   expected: "agency" },
  { email: "sarah@coastalrealty.com.au", expected: "agency_client" },
  { email: "james@parkbusiness.com.au",  expected: "referral_partner" },
  { email: "marcus@techcore.com",        expected: "direct_client" },
  { email: "riya@nexxtt.io",             expected: "admin" },
];

for (const p of PERSONAS) {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: p.email,
    password: "demo1234",
  });
  if (error) {
    console.log(`[FAIL] ${p.email}  ${error.message}`);
    continue;
  }
  const role = data.user?.user_metadata?.role;
  const ok = role === p.expected ? "OK  " : "WRONG";
  console.log(`[${ok}] ${p.email}  role=${role}  expected=${p.expected}`);

  // Verify RLS: user_profiles.id = auth.uid() returns exactly this row.
  const { data: prof, error: profErr } = await supabase
    .from("user_profiles")
    .select("id, role, first_name, agency_id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profErr) console.log(`        user_profiles read error: ${profErr.message}`);
  else console.log(`        profile: role=${prof?.role} name=${prof?.first_name} agency=${prof?.agency_id ?? "—"}`);
}
