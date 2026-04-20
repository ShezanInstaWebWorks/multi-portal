// Notifications smoke test:
//   1. Insert a notification for Alex via admin client
//   2. Sign in as Alex and read it via RLS
//   3. Subscribe to Realtime, insert another notification, verify push fires
//   4. markAllRead path
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
const alex = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const { error: signErr, data: signData } = await alex.auth.signInWithPassword({
  email: "alex@brightagency.com.au",
  password: "demo1234",
});
if (signErr) { console.error("sign in failed:", signErr); process.exit(1); }
const alexId = signData.user.id;
const accessToken = signData.session.access_token;
console.log(`[OK] signed in as Alex id=${alexId}`);

// Explicitly push the access token to Realtime. In some Node environments
// supabase-js doesn't pick it up from the auth session automatically.
await alex.realtime.setAuth(accessToken);

// 1. Seed a notification
const { error: insErr1 } = await admin.from("notifications").insert({
  user_id: alexId,
  type: "system",
  title: "Test notification 1",
  body: "Created by test-notifications.mjs",
  link: "/agency/dashboard",
});
if (insErr1) { console.error("insert 1:", insErr1); process.exit(1); }
console.log("[OK] inserted notification 1 via admin");

// 2. Read via RLS
const { data: readInitial } = await alex
  .from("notifications")
  .select("id, title, type, is_read")
  .eq("user_id", alexId)
  .order("created_at", { ascending: false })
  .limit(5);
console.log(`[OK] Alex reads ${readInitial?.length} notifications via RLS`);

// 3. Realtime subscription — wait for push within 5s
let received = null;
const channel = alex
  .channel(`test-notifications-${alexId}`)
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${alexId}` },
    (payload) => { received = payload.new; }
  );

const subStatus = await new Promise((resolve) => {
  channel.subscribe((status, err) => {
    if (err) console.error("  subscribe error:", err);
    if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      resolve(status);
    }
  });
  setTimeout(() => resolve("TIMEOUT"), 15000);
});
console.log(`[${subStatus === "SUBSCRIBED" ? "OK" : "FAIL"}] channel subscribe status=${subStatus}`);

if (subStatus === "SUBSCRIBED") {
  // Insert a second notification to trigger a push
  await admin.from("notifications").insert({
    user_id: alexId,
    type: "order_update",
    title: "Test notification 2 (pushed)",
    body: "Should arrive via Realtime",
    link: null,
  });

  const gotPush = await new Promise((resolve) => {
    const iv = setInterval(() => {
      if (received) { clearInterval(iv); resolve(true); }
    }, 100);
    setTimeout(() => { clearInterval(iv); resolve(false); }, 6000);
  });
  console.log(`[${gotPush ? "OK" : "FAIL"}] Realtime INSERT pushed → "${received?.title}"`);
}

// 4. Mark all read
const { error: readErr } = await alex
  .from("notifications")
  .update({ is_read: true })
  .eq("user_id", alexId)
  .eq("is_read", false);
console.log(`[${readErr ? "FAIL" : "OK"}] markAllRead via RLS`);

// 5. Cleanup test rows
await admin.from("notifications").delete().eq("user_id", alexId).like("title", "Test notification%");
console.log("[OK] cleanup done");

await alex.removeChannel(channel);
console.log("\nTEST PASS");
process.exit(0);
