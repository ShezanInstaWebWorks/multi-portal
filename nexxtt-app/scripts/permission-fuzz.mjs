// Cross-role API permission fuzz.
// For every (persona, route) pair below, fires the request and asserts the
// expected outcome. Any deviation = a permission/security issue.
//
// Outcomes:
//   200/201 = OK (when the persona is allowed)
//   401     = unauth (no session)
//   403     = forbidden (wrong role)
//   404     = not found (e.g. missing project)
//   409     = conflict (stale state)
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
const ref = SB_URL.replace(/^https?:\/\//, "").split(".")[0];
const COOKIE = `sb-${ref}-auth-token`;

async function sessionCookie(email) {
  const c = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: "demo1234" });
  if (error) throw error;
  return `${COOKIE}=base64-${Buffer.from(JSON.stringify(data.session)).toString("base64")}`;
}

async function call({ persona, method, path, body, expect }) {
  const cookie = persona ? await sessionCookie(persona) : "";
  const res = await fetch(URL_BASE + path, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const ok = expect.includes(res.status);
  const tag = ok ? "✓" : "✗";
  console.log(`  ${tag} ${method.padEnd(6)} ${path.padEnd(50)} as ${(persona ?? "anon").padEnd(28)} → ${res.status} (expected ${expect.join("|")})`);
  return { ok, status: res.status };
}

console.log("\n=== ANON (no session) — must be 401 on every protected POST/PATCH/DELETE ===");
const anonChecks = [
  { method: "POST",   path: "/api/jobs", body: {} },
  { method: "POST",   path: "/api/clients/invite", body: {} },
  { method: "POST",   path: "/api/admin/cron/expire-invites" },
  { method: "POST",   path: "/api/admin/impersonate", body: { agencyId: "00000000-0000-0000-0000-000000000000" } },
  { method: "DELETE", path: "/api/admin/impersonate" },
  { method: "POST",   path: "/api/admin/projects/00000000-0000-0000-0000-000000000000/resolve", body: { action: "reopen" } },
  { method: "PATCH",  path: "/api/brand", body: {} },
  { method: "POST",   path: "/api/projects/00000000-0000-0000-0000-000000000000/dispute", body: { reason: "test" } },
  { method: "POST",   path: "/api/projects/00000000-0000-0000-0000-000000000000/approve" },
  { method: "POST",   path: "/api/projects/00000000-0000-0000-0000-000000000000/revision", body: { note: "test" } },
];
for (const c of anonChecks) await call({ persona: null, ...c, expect: [401] });

console.log("\n=== AGENCY (Alex) — must NOT reach admin endpoints ===");
const agencyForbidden = [
  { method: "POST", path: "/api/admin/cron/expire-invites" },
  { method: "POST", path: "/api/admin/impersonate", body: { agencyId: "00000000-0000-0000-0000-000000000000" } },
  { method: "POST", path: "/api/admin/projects/00000000-0000-0000-0000-000000000000/resolve", body: { action: "reopen" } },
];
for (const c of agencyForbidden) await call({ persona: "alex@brightagency.com.au", ...c, expect: [403] });

console.log("\n=== AGENCY_CLIENT (Sarah) — must NOT reach agency or admin endpoints ===");
const clientForbidden = [
  { method: "POST",  path: "/api/jobs", body: {} },                           // agency-or-direct-client only
  { method: "POST",  path: "/api/clients/invite", body: {} },                 // agency only
  { method: "PATCH", path: "/api/brand", body: {} },                          // agency only
  { method: "POST",  path: "/api/admin/cron/expire-invites" },                // admin only
];
for (const c of clientForbidden) await call({ persona: "sarah@coastalrealty.com.au", ...c, expect: [403] });

console.log("\n=== REFERRAL_PARTNER (James) — must NOT reach anything except his own portal ===");
const refForbidden = [
  { method: "POST",  path: "/api/jobs", body: {} },
  { method: "POST",  path: "/api/clients/invite", body: {} },
  { method: "PATCH", path: "/api/brand", body: {} },
  { method: "POST",  path: "/api/admin/cron/expire-invites" },
  { method: "POST",  path: "/api/admin/impersonate", body: { agencyId: "00000000-0000-0000-0000-000000000000" } },
];
for (const c of refForbidden) await call({ persona: "james@parkbusiness.com.au", ...c, expect: [403] });

console.log("\n=== DIRECT_CLIENT (Marcus) — can place own jobs but not touch agency/admin ===");
const directForbidden = [
  { method: "POST",  path: "/api/clients/invite", body: {} },                 // agency only
  { method: "PATCH", path: "/api/brand", body: {} },                          // agency only
  { method: "POST",  path: "/api/admin/impersonate", body: { agencyId: "00000000-0000-0000-0000-000000000000" } }, // admin only
];
for (const c of directForbidden) await call({ persona: "marcus@techcore.com", ...c, expect: [403] });

console.log("\n=== ADMIN (Riya) — must succeed on admin endpoints (200) or hit business-logic 4xx ===");
await call({ persona: "riya@nexxtt.io", method: "POST", path: "/api/admin/cron/expire-invites", expect: [200] });
await call({ persona: "riya@nexxtt.io", method: "POST", path: "/api/admin/impersonate", body: { agencyId: "00000000-0000-0000-0000-000000000000" }, expect: [404] });
await call({ persona: "riya@nexxtt.io", method: "DELETE", path: "/api/admin/impersonate", expect: [200] });

console.log("\nDONE");
