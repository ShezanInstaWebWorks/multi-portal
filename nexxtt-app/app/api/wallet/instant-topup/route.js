import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { creditWallet, resolveWalletOwnerForViewer } from "@/lib/wallet";

// POST /api/wallet/instant-topup
// Body: { amountCents: number }
//
// Demo / test top-up — credits the viewer's own wallet immediately, with no
// Stripe round-trip. Used while the Stripe webhook is not yet configured. The
// ledger row is tagged `kind='topup'` with a "Demo" description so it's easy
// to scrub when going live.
export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const amountCents = Math.round(Number(body?.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return Response.json({ error: "Minimum top-up is $1.00" }, { status: 400 });
  }
  if (amountCents > 1_000_000 * 100) {
    return Response.json({ error: "Amount too large" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, role, agency_id, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return Response.json({ error: "No profile" }, { status: 403 });

  const owner = await resolveWalletOwnerForViewer(admin, user, profile);
  if (!owner) {
    return Response.json({ error: "Only clients can top up a wallet" }, { status: 403 });
  }

  try {
    await creditWallet(admin, {
      clientId: owner.clientId,
      directUserId: owner.directUserId,
      amountCents,
      kind: "topup",
      description: "Demo top-up",
      actorUserId: user.id,
    });
  } catch (e) {
    return Response.json({ error: e.message ?? "Top-up failed" }, { status: 500 });
  }

  return Response.json({ ok: true, amountCents });
}
