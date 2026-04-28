// Wallet helpers. Balance is derived from the `wallet_transactions` ledger.
// Credits are positive cents (top-ups / refunds), debits are negative cents
// (job charges / adjustments). Never mutate; always insert a row.

export async function resolveWalletOwnerForViewer(admin, user, profile) {
  // Returns { clientId, directUserId, ownerKind, label } for the current viewer's own wallet,
  // or null if the viewer doesn't have a wallet (agency / admin users don't).
  if (!user || !profile) return null;
  if (profile.role === "agency_client") {
    const { data: client } = await admin
      .from("clients")
      .select("id, business_name")
      .eq("portal_user_id", user.id)
      .maybeSingle();
    if (!client) return null;
    return {
      clientId: client.id,
      directUserId: null,
      ownerKind: "agency_client",
      label: client.business_name ?? "Your wallet",
    };
  }
  if (profile.role === "direct_client") {
    return {
      clientId: null,
      directUserId: user.id,
      ownerKind: "direct_client",
      label: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Your wallet",
    };
  }
  return null;
}

export async function getBalanceCents(admin, { clientId = null, directUserId = null }) {
  let q = admin.from("wallet_transactions").select("amount_cents");
  if (clientId)          q = q.eq("client_id", clientId).is("direct_client_user_id", null);
  else if (directUserId) q = q.eq("direct_client_user_id", directUserId).is("client_id", null);
  else return 0;
  const { data } = await q;
  return (data ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
}

export async function listTransactions(admin, { clientId = null, directUserId = null, limit = 50 }) {
  let q = admin.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(limit);
  if (clientId)          q = q.eq("client_id", clientId).is("direct_client_user_id", null);
  else if (directUserId) q = q.eq("direct_client_user_id", directUserId).is("client_id", null);
  else return [];
  const { data } = await q;
  return data ?? [];
}

// Debit the wallet synchronously. Used by the convert-to-job flow to charge
// the client before the job row is created. Throws on insufficient balance.
export async function debitWallet(admin, {
  clientId = null,
  directUserId = null,
  amountCents,
  description,
  jobId = null,
  projectRequestId = null,
  actorUserId = null,
}) {
  if (amountCents <= 0) throw new Error("debitWallet requires a positive amount");
  const balance = await getBalanceCents(admin, { clientId, directUserId });
  if (balance < amountCents) {
    const need = (amountCents / 100).toFixed(2);
    const have = (balance     / 100).toFixed(2);
    const err = new Error(`Insufficient wallet balance — need $${need}, have $${have}`);
    err.code = "INSUFFICIENT_BALANCE";
    err.required = amountCents;
    err.available = balance;
    throw err;
  }
  const { error } = await admin.from("wallet_transactions").insert({
    client_id: clientId,
    direct_client_user_id: directUserId,
    amount_cents: -amountCents,
    kind: "job_charge",
    description,
    job_id: jobId,
    project_request_id: projectRequestId,
    created_by: actorUserId,
  });
  if (error) throw new Error(error.message);
}

export async function creditWallet(admin, {
  clientId = null,
  directUserId = null,
  amountCents,
  kind = "topup",
  description,
  stripePaymentIntentId = null,
  jobId = null,
  projectRequestId = null,
  actorUserId = null,
}) {
  if (amountCents <= 0) throw new Error("creditWallet requires a positive amount");
  const { error } = await admin.from("wallet_transactions").insert({
    client_id: clientId,
    direct_client_user_id: directUserId,
    amount_cents: amountCents,
    kind,
    description,
    stripe_payment_intent_id: stripePaymentIntentId,
    job_id: jobId,
    project_request_id: projectRequestId,
    created_by: actorUserId,
  });
  if (error) throw new Error(error.message);
}
