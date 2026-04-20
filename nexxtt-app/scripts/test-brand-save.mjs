// Smoke test: write a brand update via admin client (mirrors what /api/brand does),
// verify the portal reads it, then revert.
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

// 1. Locate Bright Agency brand row
const { data: before } = await admin
  .from("agency_brands")
  .select("agency_id, display_name, primary_colour, accent_colour, portal_slug")
  .eq("portal_slug", "bright-agency")
  .single();
console.log(`before: accent=${before.accent_colour} primary=${before.primary_colour}`);

// 2. Apply a test change
const newAccent = "#ff6b35";
const { error: updErr } = await admin
  .from("agency_brands")
  .update({ accent_colour: newAccent })
  .eq("agency_id", before.agency_id);
if (updErr) { console.error("update failed:", updErr); process.exit(1); }

// 3. Read back via the anon client as Sarah (portal reader)
const sarah = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
await sarah.auth.signInWithPassword({ email: "sarah@coastalrealty.com.au", password: "demo1234" });

const { data: observed } = await sarah
  .from("agency_brands")
  .select("accent_colour, primary_colour")
  .eq("portal_slug", "bright-agency")
  .single();
console.log(`observed via portal: accent=${observed.accent_colour}`);
const match = observed.accent_colour === newAccent ? "OK" : "FAIL";
console.log(`[${match}] write reflected in client portal reads`);

// 4. Bucket exists + write works
const testPath = `smoke-test/${Date.now()}.png`;
const tinyPng = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D4944415408D76360000000000500010D0A2DB40000000049454E44AE426082",
  "hex"
);
const { error: upErr } = await admin.storage
  .from("agency-logos")
  .upload(testPath, tinyPng, { contentType: "image/png", upsert: true });
if (upErr) console.log(`[FAIL] bucket upload: ${upErr.message}`);
else {
  const { data: pub } = admin.storage.from("agency-logos").getPublicUrl(testPath);
  console.log(`[OK] bucket upload: ${pub.publicUrl.slice(0, 80)}…`);
  await admin.storage.from("agency-logos").remove([testPath]);
}

// 5. Revert
await admin
  .from("agency_brands")
  .update({ accent_colour: before.accent_colour })
  .eq("agency_id", before.agency_id);
console.log(`reverted accent to ${before.accent_colour}`);

console.log("\nTEST PASS");
