import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { getStripe, ensureDirectStripeCustomer } from "@/lib/stripe";

// POST /api/wallet/topup-intent
// Body: { amountCents: number }
// Returns: { clientSecret, publishableKey, amountCents }
// Creates (or reuses) a Stripe Customer for the viewer, then a PaymentIntent
// for the requested top-up amount. The webhook flips it into a wallet credit.
export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in", code: "NO_SESSION" }, { status: 401 });

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const amountCents = Math.round(Number(body?.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return Response.json({ error: "Minimum top-up is $1.00", code: "VALIDATION" }, { status: 400 });
  }
  if (amountCents > 1_000_000 * 100) {
    return Response.json({ error: "Amount too large", code: "VALIDATION" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return Response.json({ error: "No profile" }, { status: 403 });

  if (profile.role !== "direct_client") {
    return Response.json({ error: "Only direct clients can top up a wallet", code: "ROLE" }, { status: 403 });
  }

  let customerId;
  let metadata;
  try {
    customerId = await ensureDirectStripeCustomer(admin, user.id, admin);
    metadata = { wallet_kind: "direct_client", direct_client_user_id: user.id };
  } catch (e) {
    return Response.json({ error: e.message ?? "Stripe customer setup failed" }, { status: 500 });
  }

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "aud",
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    setup_future_usage: "off_session",
    description: `Wallet top-up`,
    metadata,
  });

  return Response.json({
    clientSecret: intent.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    amountCents,
  });
}
