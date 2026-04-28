import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { creditWallet } from "@/lib/wallet";

// POST /api/wallet/adjust — admin-only manual adjustment (credit or debit).
// Body: { clientId?, directUserId?, amountCents, description }
// amountCents may be negative to debit.
export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const clientId     = body?.clientId ?? null;
  const directUserId = body?.directUserId ?? null;
  const amountCents  = Math.round(Number(body?.amountCents));
  const description  = typeof body?.description === "string" ? body.description.trim() : "";

  if (!clientId && !directUserId) {
    return Response.json({ error: "clientId or directUserId required" }, { status: 400 });
  }
  if (clientId && directUserId) {
    return Response.json({ error: "Pass only one of clientId / directUserId" }, { status: 400 });
  }
  if (!Number.isFinite(amountCents) || amountCents === 0) {
    return Response.json({ error: "amountCents must be non-zero" }, { status: 400 });
  }

  const { error } = await admin.from("wallet_transactions").insert({
    client_id: clientId,
    direct_client_user_id: directUserId,
    amount_cents: amountCents,
    kind: "adjustment",
    description: description || (amountCents > 0 ? "Manual credit" : "Manual debit"),
    created_by: user.id,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
