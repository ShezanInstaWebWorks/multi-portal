import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST /api/account/password
// Body: { currentPassword, newPassword }
// Verifies the current password, then updates to the new one. Any signed-in
// user can change their own password via this route.
export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return Response.json({ error: "Not signed in", code: "NO_SESSION" }, { status: 401 });
  }

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON", code: "BAD_JSON" }, { status: 400 }); }

  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return Response.json({ error: "Current password is required", code: "VALIDATION" }, { status: 400 });
  }
  if (!newPassword || newPassword.length < 8) {
    return Response.json({ error: "New password must be at least 8 characters", code: "VALIDATION" }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return Response.json({ error: "New password must be different from current", code: "VALIDATION" }, { status: 400 });
  }

  // Verify the current password on a stateless client so the user's existing
  // session cookies are untouched on failure. A successful signIn here just
  // proves the caller knows the password — we discard the resulting session.
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );
  const { error: verifyErr } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyErr) {
    return Response.json({ error: "Current password is incorrect", code: "WRONG_PASSWORD" }, { status: 403 });
  }

  // Update via service-role.
  const admin = createAdminSupabaseClient();
  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (updateErr) {
    return Response.json({ error: updateErr.message, code: "UPDATE_ERROR" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
