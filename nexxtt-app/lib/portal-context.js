import { cache } from "react";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * Cached per-request resolver for /portal/[agencySlug]/[clientSlug] pages.
 * Layout, page, generateMetadata and any nested route can call this; React's
 * cache() dedupes within a single render, so we pay the network cost once.
 *
 * Returns `null` for brand/client when not found — callers decide whether to
 * 404 (layout) or fall back (metadata).
 */
export const resolvePortalContext = cache(async (agencySlug, clientSlug) => {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  // Brand lookup + getUser run in parallel — neither depends on the other.
  const [{ data: { user } }, { data: brand }] = await Promise.all([
    supabase.auth.getUser(),
    admin
      .from("agency_brands")
      .select(
        "agency_id, display_name, logo_url, primary_colour, accent_colour, portal_slug, support_email, sign_off_name"
      )
      .eq("portal_slug", agencySlug)
      .maybeSingle(),
  ]);

  if (!brand) return { user, supabase, admin, brand: null, client: null, profile: null };

  // Client + profile both need brand.agency_id (client) or user.id (profile);
  // they don't depend on each other.
  const clientPromise = admin
    .from("clients")
    .select("id, business_name, contact_name, portal_slug, portal_user_id")
    .eq("agency_id", brand.agency_id)
    .eq("portal_slug", clientSlug)
    .maybeSingle();
  const profilePromise = user
    ? supabase
        .from("user_profiles")
        .select("role, agency_id, first_name, last_name")
        .eq("id", user.id)
        .single()
    : Promise.resolve({ data: null });

  const [{ data: client }, { data: profile }] = await Promise.all([
    clientPromise,
    profilePromise,
  ]);

  return { user, supabase, admin, brand, client, profile };
});
