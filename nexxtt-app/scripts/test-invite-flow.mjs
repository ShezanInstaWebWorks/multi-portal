// Smoke test the invite flow's core ops: generateLink + client insert.
// Uses service-role client — mirrors what /api/clients/invite does.
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

// Random suffix so we can re-run without collisions.
const suffix = Math.random().toString(36).slice(2, 7);
const EMAIL = `lena+${suffix}@riverviewdental.test`;
const SLUG = `riverview-dental-${suffix}`;
const BUSINESS = `Riverview Dental ${suffix}`;

function fail(label, err) {
  console.error(`FAIL: ${label}`, err ?? "");
  process.exit(1);
}

// 1. Look up Alex + Bright Agency
const { data: alex } = await admin
  .from("user_profiles")
  .select("id, agency_id")
  .eq("first_name", "Alex")
  .single();
if (!alex?.agency_id) fail("Alex not found");

// 2. Generate invite magic link
const redirectTo = `http://localhost:3000/portal/${SLUG}/setup`;
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: "invite",
  email: EMAIL,
  options: {
    redirectTo,
    data: {
      role: "agency_client",
      first_name: "Lena",
      last_name: "Marsh",
      agency_id: alex.agency_id,
    },
  },
});
if (linkErr) fail("generateLink", linkErr);
console.log(`[OK] generateLink: user id=${linkData.user.id}`);
console.log(`     action_link: ${linkData.properties.action_link.slice(0, 80)}…`);

// 3. Insert client row
const now = new Date();
const expires = new Date(Date.now() + 7 * 86400000);
const { data: client, error: clientErr } = await admin
  .from("clients")
  .insert({
    agency_id: alex.agency_id,
    portal_user_id: linkData.user.id,
    business_name: BUSINESS,
    contact_name: "Lena Marsh",
    contact_email: EMAIL,
    industry: "Healthcare",
    portal_status: "invited",
    portal_access_level: "full",
    portal_slug: SLUG,
    invite_sent_at: now.toISOString(),
    invite_expires_at: expires.toISOString(),
  })
  .select("id, business_name, portal_status, portal_slug")
  .single();
if (clientErr) fail("client insert", clientErr);
console.log(`[OK] client row: ${client.business_name}  status=${client.portal_status}  slug=${client.portal_slug}`);

// 4. Confirm the user_profiles row was auto-created by the trigger
const { data: prof } = await admin
  .from("user_profiles")
  .select("id, role, first_name, last_name")
  .eq("id", linkData.user.id)
  .single();
if (!prof) fail("user_profiles trigger did not create row");
console.log(`[OK] user_profiles: role=${prof.role}  name=${prof.first_name} ${prof.last_name}`);

// 5. Verify counts
const { count: clientCount } = await admin
  .from("clients")
  .select("*", { count: "exact", head: true })
  .eq("agency_id", alex.agency_id);
console.log(`\nTEST PASS  invited ${EMAIL}  → Bright Agency has ${clientCount} client(s) total`);

// Cleanup note
console.log(`\n(cleanup) to remove: DELETE FROM auth.users WHERE email='${EMAIL}'; DELETE FROM clients WHERE id='${client.id}';`);
