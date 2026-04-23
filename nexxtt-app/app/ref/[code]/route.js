import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

// Public referral landing — `/ref/<code>` from the partner's share link.
// 1. Look up the partner by referral_code (case-insensitive)
// 2. If valid, drop a 30-day attribution cookie and redirect to /login
//    with a banner-friendly query param so the visitor sees who referred them.
// 3. If invalid, redirect to /login silently — never reveal whether a code exists.
//
// Future: when a real signup flow exists, the signup handler must read this
// cookie and insert a `referrals` row pointing at the new user. The cookie
// outlives the visitor's session by design (industry-standard 30-day window).

export const REFERRAL_COOKIE = "nx_ref";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(req, { params }) {
  const { code } = await params;
  const url = new URL(req.url);

  const admin = createAdminSupabaseClient();

  // Case-insensitive match — share links can land in any casing.
  const { data: partner } = await admin
    .from("referral_partners")
    .select("id, referral_code, business_name, user_id")
    .ilike("referral_code", code)
    .maybeSingle();

  const dest = new URL("/login", url.origin);

  if (partner) {
    dest.searchParams.set("ref", partner.referral_code);

    const res = NextResponse.redirect(dest, { status: 302 });
    const cookieStore = await cookies();
    cookieStore.set(REFERRAL_COOKIE, JSON.stringify({
      partnerId: partner.id,
      code: partner.referral_code,
      seenAt: new Date().toISOString(),
    }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    // Fire-and-forget visit log — useful for partners to see click counts later.
    admin.from("admin_actions").insert({
      admin_id: partner.user_id,
      action: "referral_link_visit",
      target_type: "referral_partner",
      target_id: partner.id,
      metadata: {
        code: partner.referral_code,
        ip: req.headers.get("x-forwarded-for") ?? null,
        ua: req.headers.get("user-agent")?.slice(0, 200) ?? null,
        at: new Date().toISOString(),
      },
    }).then(() => {}, () => {});

    return res;
  }

  return NextResponse.redirect(dest, { status: 302 });
}
