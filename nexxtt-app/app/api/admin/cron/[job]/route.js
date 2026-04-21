import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST /api/admin/cron/[job] — manually triggers a scheduled job. Admin-only.
// Supported jobs: "expire-invites", "generate-commissions"
// Returns: { ok, job, result }
export async function POST(req, { params }) {
  const { job } = await params;

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

  const admin = createAdminSupabaseClient();
  let rpc;
  if (job === "expire-invites") rpc = "expire_invites";
  else if (job === "generate-commissions") rpc = "generate_monthly_commissions";
  else return Response.json({ error: "Unknown job" }, { status: 400 });

  const { data, error } = await admin.rpc(rpc);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await admin.from("admin_actions").insert({
    admin_id:    user.id,
    action:      `manual_run_${job.replace(/-/g, "_")}`,
    target_type: "system",
    metadata:    { triggered_at: new Date().toISOString(), result: data },
  });

  return Response.json({ ok: true, job, result: data });
}
