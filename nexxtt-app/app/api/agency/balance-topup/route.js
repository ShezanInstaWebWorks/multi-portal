import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return Response.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id || !["agency", "admin"].includes(profile.role)) {
    return Response.json({ error: "Agency account required", code: "NOT_AGENCY" }, { status: 403 });
  }
  const agencyId = profile.agency_id;

  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "BAD_JSON" }, { status: 400 });
  }

  const { amountCents, description } = payload ?? {};
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return Response.json(
      { error: "Minimum top-up is $1.00", code: "VALIDATION" },
      { status: 400 }
    );
  }
  if (amountCents > 100000000) {
    return Response.json(
      { error: "Maximum top-up is $1,000,000", code: "VALIDATION" },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();

  // Get current balance
  const { data: agency, error: agencyErr } = await admin
    .from("agencies")
    .select("balance_cents")
    .eq("id", agencyId)
    .single();

  if (agencyErr) {
    return Response.json({ error: agencyErr.message, code: "AGENCY_FETCH" }, { status: 500 });
  }

  const currentBalance = agency?.balance_cents ?? 0;
  const newBalance = currentBalance + amountCents;

  // Update agency balance
  const { error: updateErr } = await admin
    .from("agencies")
    .update({ balance_cents: newBalance })
    .eq("id", agencyId);

  if (updateErr) {
    return Response.json({ error: updateErr.message, code: "BALANCE_UPDATE" }, { status: 500 });
  }

  // Record balance transaction
  const { error: txErr } = await admin.from("balance_transactions").insert({
    agency_id: agencyId,
    type: "credit",
    amount_cents: amountCents,
    balance_after_cents: newBalance,
    description: description ?? "Balance top-up",
    related_job_id: null,
  });

  if (txErr) {
    console.error("balance_transactions insert failed:", txErr);
  }

  return Response.json({ success: true, newBalance, amountCents }, { status: 200 });
}
