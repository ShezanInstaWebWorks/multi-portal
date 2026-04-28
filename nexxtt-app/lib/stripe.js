import Stripe from "stripe";

// Lazy singleton so build-time tooling doesn't crash when the key is absent.
let stripeClient = null;
export function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// Find or create a Stripe customer for an agency-client. The id lives on the
// `clients` row so invoices + the saved-card list persist across top-ups.
export async function ensureClientStripeCustomer(admin, clientId) {
  const { data: client } = await admin
    .from("clients")
    .select("id, business_name, contact_email, stripe_customer_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) throw new Error("Client not found");
  if (client.stripe_customer_id) return client.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: client.business_name ?? undefined,
    email: client.contact_email ?? undefined,
    metadata: { client_id: client.id, kind: "agency_client" },
  });
  await admin.from("clients").update({ stripe_customer_id: customer.id }).eq("id", client.id);
  return customer.id;
}

// Same, for a direct-client user. The id lives on `user_profiles`.
export async function ensureDirectStripeCustomer(admin, userId, authAdmin) {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, first_name, last_name, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) throw new Error("User profile not found");
  if (profile.stripe_customer_id) return profile.stripe_customer_id;

  let email;
  try {
    const { data } = await authAdmin.auth.admin.getUserById(userId);
    email = data?.user?.email ?? undefined;
  } catch {
    // non-fatal; stripe just won't have the email
  }

  const stripe = getStripe();
  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || undefined;
  const customer = await stripe.customers.create({
    name,
    email,
    metadata: { user_id: profile.id, kind: "direct_client" },
  });
  await admin.from("user_profiles").update({ stripe_customer_id: customer.id }).eq("id", profile.id);
  return customer.id;
}
