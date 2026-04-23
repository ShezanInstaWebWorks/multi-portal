import { createAdminSupabaseClient } from "@/lib/supabase/server";

// POST /api/auth/signup/direct
// Self-service direct-client registration. Creates the auth user with
// role=direct_client. The handle_new_user trigger inserts user_profiles.
// No approval needed — direct clients can place orders immediately.
//
// Returns { ok, userId, email }. Client follows up with signInWithPassword.
export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { email, password, firstName, lastName, businessName } = body ?? {};

  if (!email || !/.+@.+\..+/.test(email)) {
    return Response.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!firstName || firstName.trim().length < 1) {
    return Response.json({ error: "First name is required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const emailLower = email.trim().toLowerCase();

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: emailLower,
    password,
    email_confirm: true,
    user_metadata: {
      role: "direct_client",
      first_name: firstName.trim(),
      last_name: (lastName ?? "").trim() || null,
      business_name: (businessName ?? "").trim() || null,
    },
  });
  if (authErr) {
    const status = /already.*registered|exists/i.test(authErr.message) ? 409 : 500;
    return Response.json({ error: authErr.message }, { status });
  }

  return Response.json({
    ok: true,
    userId: authData.user.id,
    email: emailLower,
  }, { status: 201 });
}
