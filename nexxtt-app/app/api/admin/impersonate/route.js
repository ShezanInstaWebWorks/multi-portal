import { cookies } from "next/headers";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { IMPERSONATE_AGENCY_COOKIE, IMPERSONATE_EXPIRY_SECONDS } from "@/lib/impersonation";

export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return Response.json({ error: "Admin role required" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { agencyId } = body ?? {};
  if (!agencyId) {
    return Response.json({ error: "agencyId is required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: agency } = await admin
    .from("agencies")
    .select("id, name")
    .eq("id", agencyId)
    .maybeSingle();
  if (!agency) {
    return Response.json({ error: "Agency not found" }, { status: 404 });
  }

  // Log the action
  await admin.from("admin_actions").insert({
    admin_id:    user.id,
    action:      "impersonate_agency",
    target_type: "agency",
    target_id:   agency.id,
    metadata:    { agency_name: agency.name, started_at: new Date().toISOString() },
  });

  // Set signed-in cookie (httpOnly — client code doesn't need to read it)
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_AGENCY_COOKIE, agency.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: IMPERSONATE_EXPIRY_SECONDS,
    path: "/",
  });

  return Response.json({ ok: true, agencyId: agency.id, redirect: "/agency/dashboard" });
}

export async function DELETE(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const impersonatedId = cookieStore.get(IMPERSONATE_AGENCY_COOKIE)?.value;
  cookieStore.delete(IMPERSONATE_AGENCY_COOKIE);

  if (impersonatedId) {
    const admin = createAdminSupabaseClient();
    await admin.from("admin_actions").insert({
      admin_id:    user.id,
      action:      "stop_impersonate_agency",
      target_type: "agency",
      target_id:   impersonatedId,
      metadata:    { stopped_at: new Date().toISOString() },
    });
  }

  return Response.json({ ok: true, redirect: "/admin" });
}
