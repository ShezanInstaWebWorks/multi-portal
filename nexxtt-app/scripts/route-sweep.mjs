// Sign each persona in via /api/auth (gotrue), capture sb-* cookies, then curl every gated route.
// Reports HTTP status per (persona, route). 500s = real bugs.
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

const URL_BASE = "http://localhost:3210";
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SB_ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Project ref from URL: https://qzxaneidqcyzfqwqdvzo.supabase.co
const projectRef = SB_URL.replace(/^https?:\/\//, "").split(".")[0];
const COOKIE_NAME = `sb-${projectRef}-auth-token`;

async function getSession(email) {
  const c = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: "demo1234" });
  if (error) throw error;
  // Supabase v2 SSR cookie format: base64-prefixed JSON of session
  const session = data.session;
  // The @supabase/ssr cookie contains a JSON-stringified session, base64-prefixed with "base64-"
  const json = JSON.stringify(session);
  const b64 = Buffer.from(json, "utf8").toString("base64");
  return `base64-${b64}`;
}

async function curlStatus(path, cookieValue) {
  const cookieHeader = cookieValue ? `${COOKIE_NAME}=${cookieValue}` : "";
  const res = await fetch(URL_BASE + path, {
    method: "GET",
    redirect: "manual",
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  return res.status;
}

const ROUTES_BY_ROLE = {
  agency: [
    "/agency/dashboard", "/agency/orders", "/agency/clients",
    "/agency/finance/profit", "/agency/finance/transactions", "/agency/settings",
  ],
  agency_client: [
    "/portal/bright-agency/coastal-realty",
    "/portal/bright-agency/coastal-realty/orders",
    "/portal/bright-agency/coastal-realty/balance",
    "/portal/bright-agency/coastal-realty/order",
  ],
  direct_client: [
    "/direct/dashboard", "/direct/orders", "/direct/order", "/direct/balance",
  ],
  referral_partner: [
    "/referral/dashboard", "/referral/referrals", "/referral/commissions", "/referral/payouts",
  ],
  admin: [
    "/admin", "/admin/agencies", "/admin/orders", "/admin/clients",
    "/admin/referrals", "/admin/services", "/admin/finance",
    "/admin/settings", "/admin/email-preview",
  ],
};

const PERSONA_BY_ROLE = {
  agency: "alex@brightagency.com.au",
  agency_client: "sarah@coastalrealty.com.au",
  referral_partner: "james@parkbusiness.com.au",
  direct_client: "marcus@techcore.com",
  admin: "riya@nexxtt.io",
};

const issues = [];
for (const [role, email] of Object.entries(PERSONA_BY_ROLE)) {
  console.log(`\n=== ${role.padEnd(18)} (${email})`);
  let cookie;
  try {
    cookie = await getSession(email);
    console.log(`  signed in, cookie ${COOKIE_NAME} (${cookie.length}b)`);
  } catch (e) {
    console.log(`  ✗ sign-in failed: ${e.message}`);
    issues.push(`${role}: sign-in failed (${e.message})`);
    continue;
  }
  for (const route of ROUTES_BY_ROLE[role]) {
    const status = await curlStatus(route, cookie);
    const flag = status >= 500 ? "✗" : status === 404 ? "·" : status >= 300 ? "→" : "✓";
    console.log(`  ${flag} ${String(status).padEnd(4)} ${route}`);
    if (status >= 500) issues.push(`${role} ${route} → ${status}`);
    if (status === 404) issues.push(`${role} ${route} → 404 (route doesn't exist)`);
  }
}

console.log("\n──────────────────────────────────────");
if (issues.length === 0) console.log("ALL ROUTES OK");
else {
  console.log(`ISSUES (${issues.length}):`);
  for (const i of issues) console.log(`  · ${i}`);
}
