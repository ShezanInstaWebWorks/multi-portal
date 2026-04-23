import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { NexxttLogo } from "@/components/auth/NexxttLogo";

export const metadata = {
  title: "Awaiting approval · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function AgencyPendingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, agency_id, first_name")
    .eq("id", user.id)
    .single();

  // Wrong role lands them back on login.
  if (profile?.role !== "agency") redirect("/login");

  // If their agency is already approved, jump them straight to the dashboard.
  let agency = null;
  if (profile.agency_id) {
    const { data } = await admin
      .from("agencies")
      .select("name, status, joined_at")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agency = data;
  }
  if (agency?.status === "active") redirect("/agency/dashboard");

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-5 py-8"
      style={{ background: "linear-gradient(160deg, #0b1f3a 0%, #0f2d50 55%, #0b3040 100%)" }}
    >
      <div className="mb-3"><NexxttLogo width={140} /></div>

      <div
        className="w-full max-w-[460px] rounded-[20px] px-7 py-7 text-white"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase mb-4"
          style={{
            color: "var(--color-amber)",
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
            letterSpacing: "0.12em",
          }}
        >
          ⏳ Awaiting approval
        </div>

        <h1 className="font-display text-[1.4rem] font-extrabold tracking-tight mb-2 text-white">
          Thanks {profile.first_name ?? "there"} — we&apos;ve received your application
        </h1>

        <p className="text-[0.88rem] text-white/65 leading-relaxed mb-4">
          Your agency <strong className="text-white">{agency?.name ?? "account"}</strong> is
          currently <strong>{agency?.status ?? "pending"}</strong>. A nexxtt.io admin will
          review the details and activate your portal — usually within 1 business day.
          You&apos;ll receive an email when you&apos;re approved.
        </p>

        <div
          className="rounded-[10px] p-3 text-[0.78rem] text-white/70"
          style={{ background: "rgba(0,184,169,0.06)", border: "1px solid rgba(0,184,169,0.2)" }}
        >
          <strong className="text-teal">What&apos;s next?</strong>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>Admin reviews your agency details</li>
            <li>You receive an approval email</li>
            <li>Sign in and place your first order</li>
          </ul>
        </div>

        <div className="flex gap-2 mt-5">
          <Link
            href="/login"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[0.85rem] font-semibold text-white/70"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Sign out
          </Link>
        </div>
      </div>
    </div>
  );
}
