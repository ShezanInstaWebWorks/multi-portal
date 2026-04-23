import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// PATCH /api/admin/agencies/[id]
// Body: { action: "approve" | "suspend" | "reactivate" }
// Admin only. Toggles agencies.status and writes an admin_actions audit row.
//
//   approve     → status = active, approved_at = now (only valid from pending)
//   suspend     → status = suspended (from any non-archived state)
//   reactivate  → status = active (from suspended)
export async function PATCH(req, { params }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return Response.json({ error: "Admin role required" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const action = body?.action;
  if (!["approve", "suspend", "reactivate"].includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: agency } = await admin
    .from("agencies").select("id, status, name").eq("id", id).maybeSingle();
  if (!agency) return Response.json({ error: "Agency not found" }, { status: 404 });

  const now = new Date().toISOString();
  let patch = {};
  if (action === "approve") {
    if (agency.status !== "pending") {
      return Response.json({ error: `Can't approve agency in status "${agency.status}"` }, { status: 409 });
    }
    patch = { status: "active", approved_at: now };
  } else if (action === "suspend") {
    if (!["active", "pending"].includes(agency.status)) {
      return Response.json({ error: `Can't suspend agency in status "${agency.status}"` }, { status: 409 });
    }
    patch = { status: "suspended" };
  } else if (action === "reactivate") {
    if (agency.status !== "suspended") {
      return Response.json({ error: `Can't reactivate agency in status "${agency.status}"` }, { status: 409 });
    }
    patch = { status: "active" };
  }

  const { error: updErr } = await admin.from("agencies").update(patch).eq("id", id);
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

  await admin.from("admin_actions").insert({
    admin_id:    user.id,
    action:      `agency_${action}`,
    target_type: "agency",
    target_id:   id,
    metadata:    { agency_name: agency.name, previous_status: agency.status, at: now },
  });

  // Notify the agency's owner(s).
  const { data: members } = await admin
    .from("user_profiles").select("id").eq("agency_id", id).eq("role", "agency");
  if (members?.length) {
    const titleMap = {
      approve:    `🎉 ${agency.name} is approved — you can sign in now`,
      suspend:    `⚠ ${agency.name} has been suspended`,
      reactivate: `✓ ${agency.name} is active again`,
    };
    await admin.from("notifications").insert(
      members.map((m) => ({
        user_id: m.id,
        type: "system",
        title: titleMap[action],
        body: null,
        link: action === "approve" ? "/agency/dashboard" : null,
      }))
    );
  }

  return Response.json({ ok: true, status: patch.status });
}
