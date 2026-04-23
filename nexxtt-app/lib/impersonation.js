import { cache } from "react";
import { cookies } from "next/headers";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export const IMPERSONATE_AGENCY_COOKIE = "nx_impersonate_agency";
export const IMPERSONATE_EXPIRY_SECONDS = 60 * 60; // 1 hour, matches MD §37

/**
 * Resolves the "effective" agency context for an agency-scoped server page.
 *
 * The returned `supabase` client is **always the service-role (admin) client**.
 *
 * Why: as of session 27 we revoked SELECT on `projects.cost_price_cents` and
 * `jobs.total_cost_cents` from the `authenticated` role so client portals
 * can't leak cost columns even with a crafted query. Agencies *do* need to
 * see cost, so their reads have to route through service-role. Every call
 * site on the agency side already filters by `agencyId`, so losing RLS here
 * is safe as long as callers keep that filter in place.
 *
 * Contract:
 *  - Mutations stay on the user session (write API routes use their own
 *    `createServerSupabaseClient` to verify identity before an admin write).
 *  - Reads on agency-scoped pages use `ctx.supabase` + `.eq("agency_id", ctx.agencyId)`.
 *
 * Behaviour:
 *  - Admin with impersonation cookie → agencyId is the impersonated agency.
 *  - Otherwise → agencyId is the caller's own `user_profiles.agency_id`.
 *  - No session → `{ agencyId: null }`.
 */
export const resolveAgencyContext = cache(async () => {
  const userClient = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  // Parallelise: getUser is a network call to GoTrue; cookies() is local.
  const [{ data: { user } }, cookieStore] = await Promise.all([
    userClient.auth.getUser(),
    cookies(),
  ]);

  if (!user) {
    return {
      user: null, profile: null, agency: null, agencyId: null,
      agencyName: null, isImpersonating: false, supabase: admin,
    };
  }

  const impersonatedId = cookieStore.get(IMPERSONATE_AGENCY_COOKIE)?.value ?? null;

  // Resolve profile and (when admin is impersonating) the impersonated agency in parallel.
  const profilePromise = userClient
    .from("user_profiles")
    .select("agency_id, role, first_name, last_name")
    .eq("id", user.id)
    .single();
  const impersonatedAgencyPromise = impersonatedId
    ? admin.from("agencies")
        .select("id, name, status, plan, balance_cents, total_jobs_count")
        .eq("id", impersonatedId)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const [{ data: profile }, { data: impersonated }] = await Promise.all([
    profilePromise, impersonatedAgencyPromise,
  ]);

  // Admin impersonating a specific agency
  if (impersonated && profile?.role === "admin") {
    return {
      user, profile,
      agency: impersonated,
      agencyId: impersonated.id,
      agencyName: impersonated.name,
      isImpersonating: true,
      supabase: admin,
    };
  }

  // Otherwise the agency is the caller's own.
  let agency = null;
  if (profile?.agency_id) {
    const { data } = await admin
      .from("agencies")
      .select("id, name, status, plan, balance_cents, total_jobs_count")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agency = data;
  }

  return {
    user, profile, agency,
    agencyId: profile?.agency_id ?? null,
    agencyName: agency?.name ?? null,
    isImpersonating: false,
    supabase: admin,
  };
});

/**
 * Client portal impersonation — same idea but keyed on the portal slugs in
 * the URL. Admin doesn't need a cookie here because the layout already
 * accepts any agency/admin user and shows a preview banner (session 9).
 * This helper just centralises "is the current viewer NOT the owning client?"
 */
export async function readImpersonationBannerInfo() {
  const cookieStore = await cookies();
  return {
    impersonatedAgencyId: cookieStore.get(IMPERSONATE_AGENCY_COOKIE)?.value ?? null,
  };
}
