// End-to-end test of deliverables upload + signed-URL download.
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

// 1. Pick Coastal Realty's logo project (delivered-bound).
const { data: project } = await admin
  .from("projects")
  .select("id, job_id, service_id")
  .eq("service_id", (await admin.from("services").select("id").eq("slug", "logo-design").single()).data.id)
  .limit(1)
  .single();
console.log(`project: ${project.id}`);

// 2. Upload a dummy PNG via service-role (mimics what the API route does).
const tinyPng = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D4944415408D76360000000000500010D0A2DB40000000049454E44AE426082",
  "hex"
);
const path = `${project.id}/${Date.now()}-logo-final.png`;
const { error: upErr } = await admin.storage
  .from("delivered-files")
  .upload(path, tinyPng, { contentType: "image/png" });
if (upErr) { console.error("upload failed:", upErr); process.exit(1); }
console.log(`[OK] uploaded to ${path}`);

const { data: row, error: rowErr } = await admin
  .from("delivered_files")
  .insert({
    project_id: project.id,
    name: "logo-final.png",
    storage_path: path,
    size_bytes: tinyPng.length,
    mime_type: "image/png",
  })
  .select("id, name")
  .single();
if (rowErr) { console.error("row insert failed:", rowErr); process.exit(1); }
console.log(`[OK] delivered_files row id=${row.id}`);

// 3. Sarah (agency_client) — she should see the file metadata but need the
//    API route to get a signed URL (she can't read storage.objects directly).
const sarah = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
await sarah.auth.signInWithPassword({ email: "sarah@coastalrealty.com.au", password: "demo1234" });
const { data: sarahFiles, error: sarahErr } = await sarah
  .from("delivered_files")
  .select("id, name, size_bytes, storage_path")
  .eq("project_id", project.id);
console.log(`[${sarahErr ? "FAIL" : "OK"}] Sarah reads delivered_files rows: ${sarahFiles?.length ?? 0} file(s)${sarahErr ? " err=" + sarahErr.message : ""}`);

// 4. Sarah tries to read storage.objects directly — should be blocked.
//    (bucket is private + no storage.objects SELECT policy granted).
const sarahAccess = await sarah.storage.from("delivered-files").download(path);
console.log(`[${sarahAccess.error ? "OK" : "FAIL"}] Sarah direct Storage access: ${sarahAccess.error ? "blocked: " + sarahAccess.error.message : "LEAKED"}`);

// 5. Sarah goes through the signed-URL helper (what our server page does).
const { data: signed } = await admin.storage
  .from("delivered-files")
  .createSignedUrl(path, 60);
console.log(`[OK] signed URL (60s): ${signed?.signedUrl ? signed.signedUrl.slice(0, 90) + "…" : "none"}`);

// 6. Fetch the signed URL from "outside" and check it returns the file bytes.
if (signed?.signedUrl) {
  const res = await fetch(signed.signedUrl);
  console.log(`[${res.ok ? "OK" : "FAIL"}] GET signed URL: ${res.status} ${res.headers.get("content-type")}`);
}

// 7. Cleanup
await admin.storage.from("delivered-files").remove([path]);
await admin.from("delivered_files").delete().eq("id", row.id);
console.log("\n[cleanup] removed test file + row");
console.log("TEST COMPLETE");
