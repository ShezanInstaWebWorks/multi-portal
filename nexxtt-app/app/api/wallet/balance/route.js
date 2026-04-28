import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { getBalanceCents, listTransactions, resolveWalletOwnerForViewer } from "@/lib/wallet";

// GET /api/wallet/balance — returns the viewer's own wallet balance +
// transaction history. Admin + agency viewers don't have a wallet of their
// own; they use the admin adjust endpoint to see specific clients.
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, role, agency_id, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return Response.json({ error: "No profile" }, { status: 403 });

  const owner = await resolveWalletOwnerForViewer(admin, user, profile);
  if (!owner) {
    return Response.json({ ownerKind: null, balanceCents: 0, transactions: [] });
  }
  const [balanceCents, transactions] = await Promise.all([
    getBalanceCents(admin, { clientId: owner.clientId, directUserId: owner.directUserId }),
    listTransactions(admin, { clientId: owner.clientId, directUserId: owner.directUserId, limit: 25 }),
  ]);
  return Response.json({
    ownerKind: owner.ownerKind,
    label: owner.label,
    balanceCents,
    transactions,
  });
}
