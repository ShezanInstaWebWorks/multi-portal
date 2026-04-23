import { render } from "@react-email/render";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { ClientInviteEmail } from "@/emails/ClientInviteEmail";
import { OrderPlacedEmail } from "@/emails/OrderPlacedEmail";
import { CommissionPaidEmail } from "@/emails/CommissionPaidEmail";

export const metadata = { title: "Email Preview · Admin", robots: "noindex, nofollow" };

export default async function EmailPreviewPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Render sample previews for each template.
  const samples = [
    {
      key: "client-invite",
      label: "Client invite",
      description: "White-label agency → client invite with temporary password credentials.",
      html: await render(
        <ClientInviteEmail
          brand={{
            display_name: "Bright Agency Co.",
            primary_colour: "#0B1F3A",
            accent_colour: "#00B8A9",
          }}
          contactName="Lena Marsh"
          subject="Your project portal is ready — Bright Agency Co."
          message={`Hi Lena,\n\nWe're excited to welcome you to your project portal! Track your project progress, review and approve deliverables, and download your final files — all in one place.\n\nYour sign-in details are below. You can change your password after you sign in.`}
          cta="Sign In →"
          signOff="Alex Johnson, Bright Agency Co."
          loginEmail="lena@riverviewdental.com.au"
          tempPassword="xK9mPn3Lt-4Q"
          loginUrl="https://nexxtt.io/login?next=%2Fportal%2Fbright-agency%2Friverview-dental"
          portalUrl="nexxtt.io/portal/bright-agency/riverview-dental"
        />
      ),
    },
    {
      key: "order-placed-agency",
      label: "Order placed — agency",
      description: "Agency owner receives a confirmation with profit breakdown.",
      html: await render(
        <OrderPlacedEmail
          recipientName="Alex"
          jobNumber="NXT-2026-0001"
          services={[
            { name: "Logo Design",     icon: "✦", retail_cents: 40000 },
            { name: "Content Writing", icon: "✍️", retail_cents: 28000 },
          ]}
          totalRetailCents={68000}
          totalProfitCents={18000}
          link="https://example.com/agency/orders/xyz"
          viewer="agency"
        />
      ),
    },
    {
      key: "order-placed-client",
      label: "Order placed — client (same email, client viewer)",
      description: "No cost/profit shown; copy is 'new work is underway'.",
      html: await render(
        <OrderPlacedEmail
          recipientName="Sarah"
          jobNumber="NXT-2026-0001"
          services={[
            { name: "Logo Design",     icon: "✦", retail_cents: 40000 },
          ]}
          totalRetailCents={40000}
          link="https://example.com/portal/bright-agency/coastal-realty"
          viewer="agency_client"
          brandName="Bright Agency Co."
          brandPrimaryColour="#0B1F3A"
        />
      ),
    },
    {
      key: "commission-paid",
      label: "Commission paid",
      description: "Monthly payout confirmation for a referral partner.",
      html: await render(
        <CommissionPaidEmail
          partnerName="James"
          periodMonth="2026-04"
          amountCents={32125}
          entryCount={2}
          link="https://example.com/referral/dashboard"
        />
      ),
    },
  ];

  return (
    <>
      <AdminTopbar title="Email Preview" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        <h1 className="font-display text-[1.2rem] font-extrabold text-dark mb-1">
          Email templates
        </h1>
        <p className="text-sm text-muted mb-5 max-w-[680px]">
          Visual QA for every outgoing email. Each iframe renders the same HTML
          Resend will ship.{" "}
          <strong className="text-dark">
            {process.env.RESEND_API_KEY ? "Resend key detected — real emails will send." : "Resend key not set — sends are no-ops."}
          </strong>
        </p>

        <div className="flex flex-col gap-6">
          {samples.map((s) => (
            <section
              key={s.key}
              className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden"
            >
              <header className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-display text-[0.95rem] font-extrabold text-dark">
                    {s.label}
                  </h2>
                  <p className="text-[0.78rem] text-muted mt-0.5">{s.description}</p>
                </div>
                <code className="text-[0.7rem] text-muted font-mono">{s.key}</code>
              </header>
              <div style={{ background: "#f0f2f5", padding: 16 }}>
                <iframe
                  title={s.label}
                  srcDoc={s.html}
                  style={{
                    width: "100%",
                    height: 640,
                    border: "none",
                    borderRadius: 12,
                    background: "white",
                    boxShadow: "0 4px 20px rgba(11,31,58,0.08)",
                  }}
                />
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
