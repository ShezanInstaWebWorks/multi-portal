// Seeds Supabase auth.users + user_profiles + linked agency/client/referral rows
// for the five demo personas used by the login page.
//
// Run:  node scripts/seed-demo-users.mjs
//
// Idempotent: re-runnable. Existing users are left in place with their UUID reused.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal .env.local reader (no deps).
const envPath = resolve(__dirname, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "demo1234";

const PERSONAS = [
  { email: "alex@brightagency.com.au",    role: "agency",            first: "Alex",   last: "Johnson"   },
  { email: "sarah@coastalrealty.com.au",  role: "agency_client",     first: "Sarah",  last: "Mitchell"  },
  { email: "james@parkbusiness.com.au",   role: "referral_partner",  first: "James",  last: "Park"      },
  { email: "marcus@techcore.com",         role: "direct_client",     first: "Marcus", last: "Reid"      },
  { email: "riya@nexxtt.io",              role: "admin",             first: "Riya",   last: "Tanaka"    },
];

async function findByEmail(email) {
  // listUsers paginates; scan first 200 to find our seed user.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function upsertUser(p) {
  const existing = await findByEmail(p.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { role: p.role, first_name: p.first, last_name: p.last },
    });
    if (error) throw error;
    console.log(`[=] ${p.email} (${p.role})  id=${existing.id}`);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: p.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role: p.role, first_name: p.first, last_name: p.last },
  });
  if (error) throw error;
  console.log(`[+] ${p.email} (${p.role})  id=${data.user.id}`);
  return data.user.id;
}

async function main() {
  // 1. Create / update auth users
  const ids = {};
  for (const p of PERSONAS) {
    ids[p.role] = await upsertUser(p);
  }

  // 2. Upsert Bright Agency Co. (owner = Alex)
  const agencySlug = "bright-agency";
  const existingAgency = await admin
    .from("agencies")
    .select("id")
    .eq("slug", agencySlug)
    .maybeSingle();

  let agencyId = existingAgency.data?.id;
  if (!agencyId) {
    const { data, error } = await admin
      .from("agencies")
      .insert({
        name: "Bright Agency Co.",
        slug: agencySlug,
        status: "active",
        plan: "starter",
        contact_name: "Alex Johnson",
        contact_email: "alex@brightagency.com.au",
        balance_cents: 400000, // $4,000 balance for demo
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    agencyId = data.id;
    console.log(`[+] agency  Bright Agency Co.  id=${agencyId}`);
  } else {
    console.log(`[=] agency  Bright Agency Co.  id=${agencyId}`);
  }

  // Agency brand
  const { error: brandErr } = await admin.from("agency_brands").upsert(
    {
      agency_id: agencyId,
      display_name: "Bright Agency Co.",
      primary_colour: "#0B1F3A",
      accent_colour: "#00B8A9",
      portal_slug: "bright-agency",
      support_email: "hello@brightagency.com.au",
      sign_off_name: "Bright Agency Team",
    },
    { onConflict: "agency_id" }
  );
  if (brandErr) throw brandErr;

  // 3. user_profiles rows
  const profileRows = [
    { id: ids.agency,           role: "agency",           first_name: "Alex",   last_name: "Johnson",  agency_id: agencyId },
    { id: ids.agency_client,    role: "agency_client",    first_name: "Sarah",  last_name: "Mitchell", agency_id: null      },
    { id: ids.referral_partner, role: "referral_partner", first_name: "James",  last_name: "Park",     agency_id: null      },
    { id: ids.direct_client,    role: "direct_client",    first_name: "Marcus", last_name: "Reid",     agency_id: null      },
    { id: ids.admin,            role: "admin",            first_name: "Riya",   last_name: "Tanaka",   agency_id: null      },
  ];
  for (const row of profileRows) {
    const { error } = await admin.from("user_profiles").upsert(row, { onConflict: "id" });
    if (error) throw error;
  }
  console.log(`[=] user_profiles x${profileRows.length}`);

  // 4. Coastal Realty client (belongs to Bright Agency, portal user = Sarah)
  const { data: existingClient } = await admin
    .from("clients")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("contact_email", "sarah@coastalrealty.com.au")
    .maybeSingle();

  if (!existingClient) {
    const { error } = await admin.from("clients").insert({
      agency_id: agencyId,
      portal_user_id: ids.agency_client,
      business_name: "Coastal Realty",
      contact_name: "Sarah Mitchell",
      contact_email: "sarah@coastalrealty.com.au",
      industry: "Real Estate",
      portal_status: "active",
      portal_access_level: "full",
      portal_slug: "coastal-realty",
      portal_activated_at: new Date().toISOString(),
    });
    if (error) throw error;
    console.log(`[+] client  Coastal Realty`);
  } else {
    console.log(`[=] client  Coastal Realty`);
  }

  // 5. Referral partner for James
  const { data: existingRef } = await admin
    .from("referral_partners")
    .select("id")
    .eq("user_id", ids.referral_partner)
    .maybeSingle();

  if (!existingRef) {
    const { error } = await admin.from("referral_partners").insert({
      user_id: ids.referral_partner,
      business_name: "Park Business Consulting",
      referral_code: "JPARK01",
    });
    if (error) throw error;
    console.log(`[+] referral_partner  James Park`);
  } else {
    console.log(`[=] referral_partner  James Park`);
  }

  console.log("\nDone. All 5 personas can log in with password:", PASSWORD);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
