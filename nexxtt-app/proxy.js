import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/demoUsers";

const ROLE_ROUTES = [
  { prefix: "/admin",    roles: ["admin"] },
  { prefix: "/agency",   roles: ["agency", "admin"] },
  { prefix: "/referral", roles: ["referral_partner"] },
  { prefix: "/direct",   roles: ["direct_client"] },
  { prefix: "/portal",   roles: ["agency_client", "agency", "admin"] },
];

export async function proxy(req) {
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value);
          }
          res = NextResponse.next({ request: { headers: req.headers } });
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const demoRole = req.cookies.get(DEMO_COOKIE)?.value ?? null;
  const role = user?.user_metadata?.role ?? demoRole;

  const path = req.nextUrl.pathname;
  const rule = ROLE_ROUTES.find((r) => path.startsWith(r.prefix));

  if (rule) {
    if (!role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!rule.roles.includes(role)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/agency/:path*",
    "/admin/:path*",
    "/referral/:path*",
    "/direct/:path*",
    "/portal/:path*",
  ],
};
