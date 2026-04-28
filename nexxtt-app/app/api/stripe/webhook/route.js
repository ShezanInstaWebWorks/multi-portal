import { getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { creditWallet } from "@/lib/wallet";

// POST /api/stripe/webhook
// Stripe posts here when a PaymentIntent succeeds. We look at the metadata we
// attached when creating the intent to figure out whose wallet to credit.
//
// Configure in the Stripe dashboard:
//   https://<host>/api/stripe/webhook
//   Event: payment_intent.succeeded (also charge.refunded for refunds)
//   Copy the signing secret into STRIPE_WEBHOOK_SECRET.
export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });

  const rawBody = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    return new Response(`Signature verification failed: ${err.message}`, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const metadata = intent.metadata ?? {};
    const kind = metadata.wallet_kind;
    const clientId = metadata.client_id ?? null;
    const directUserId = metadata.direct_client_user_id ?? null;
    const amountCents = intent.amount_received ?? intent.amount;

    if (!amountCents || !(clientId || directUserId)) {
      // Not a wallet top-up — ignore.
      return Response.json({ received: true, handled: false });
    }

    // Idempotency: same PaymentIntent id must not double-credit.
    const { data: existing } = await admin
      .from("wallet_transactions")
      .select("id")
      .eq("stripe_payment_intent_id", intent.id)
      .maybeSingle();
    if (existing) return Response.json({ received: true, handled: "duplicate" });

    try {
      await creditWallet(admin, {
        clientId,
        directUserId,
        amountCents,
        kind: "topup",
        description: "Wallet top-up",
        stripePaymentIntentId: intent.id,
      });
    } catch (e) {
      return new Response(`Ledger insert failed: ${e.message}`, { status: 500 });
    }
    return Response.json({ received: true, handled: "credited", amountCents });
  }

  if (event.type === "charge.refunded") {
    // When a refund is issued on a top-up, debit the wallet by the refund amount.
    const charge = event.data.object;
    const intentId = charge.payment_intent;
    const refundedCents = charge.amount_refunded ?? 0;
    if (!intentId || !refundedCents) {
      return Response.json({ received: true, handled: false });
    }

    // Find the original top-up ledger row to learn whose wallet to debit.
    const { data: topup } = await admin
      .from("wallet_transactions")
      .select("client_id, direct_client_user_id")
      .eq("stripe_payment_intent_id", intentId)
      .eq("kind", "topup")
      .maybeSingle();
    if (!topup) {
      return Response.json({ received: true, handled: "no_topup_found" });
    }

    // Idempotency: per refund id.
    const refundKey = `refund:${charge.id}`;
    const { data: existing } = await admin
      .from("wallet_transactions")
      .select("id")
      .eq("stripe_payment_intent_id", refundKey)
      .maybeSingle();
    if (existing) return Response.json({ received: true, handled: "duplicate" });

    const { error } = await admin.from("wallet_transactions").insert({
      client_id: topup.client_id,
      direct_client_user_id: topup.direct_client_user_id,
      amount_cents: -refundedCents,
      kind: "refund",
      description: `Refund on top-up ${intentId}`,
      stripe_payment_intent_id: refundKey,
    });
    if (error) return new Response(`Refund ledger insert failed: ${error.message}`, { status: 500 });
    return Response.json({ received: true, handled: "refunded", amountCents: refundedCents });
  }

  return Response.json({ received: true, handled: false });
}
