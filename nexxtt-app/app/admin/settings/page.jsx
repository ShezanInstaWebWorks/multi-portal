import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/layout/AdminTopbar";

export const metadata = { title: "Platform Settings · Admin · nexxtt.io", robots: "noindex, nofollow" };

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();
  const { data: config } = await admin.from("platform_config").select("*").limit(1).maybeSingle();
  const { data: actions } = await admin
    .from("admin_actions")
    .select("id, action, target_type, target_id, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <>
      <AdminTopbar title="Platform Settings" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        <h1 className="font-display text-[1.2rem] font-extrabold text-dark mb-1">
          Platform settings
        </h1>
        <p className="text-sm text-muted mb-5">
          Commission rules, feature flags, and the recent admin action log. Editing
          is disabled for this pass — changes land when the settings-edit flow is
          built.
        </p>

        {/* Commission rules */}
        <Section title="Commission & pricing rules">
          <Field label="Referral commission">
            <Value>{Math.round((config?.commission_rate ?? 0.2) * 100)}% of retail</Value>
          </Field>
          <Field label="Commission duration">
            <Value>{config?.commission_months ?? 12} months from first order</Value>
          </Field>
          <Field label="Rush surcharge">
            <Value>+{Math.round((config?.rush_surcharge ?? 0.5) * 100)}% on cost</Value>
          </Field>
          <Field label="Support email">
            <Value>{config?.support_email ?? "—"}</Value>
          </Field>
        </Section>

        {/* Feature flags */}
        <Section title="Feature flags">
          <Flag label="Agency portal"    on={config?.agency_portal_enabled} />
          <Flag label="Direct portal"    on={config?.direct_portal_enabled} />
          <Flag label="Referral program" on={config?.referral_program_enabled} />
          <Flag label="White label"      on={config?.white_label_enabled} />
          <Flag label="Rush orders"      on={config?.rush_orders_enabled} />
          <Flag
            label="Maintenance mode"
            on={config?.maintenance_mode}
            danger
          />
        </Section>

        {/* Admin action log */}
        <Section title="Recent admin actions">
          {(!actions || actions.length === 0) ? (
            <div className="text-sm text-muted">No admin actions recorded yet.</div>
          ) : (
            <div className="flex flex-col">
              {actions.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 py-2 ${
                    i < actions.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.85rem] flex-shrink-0"
                    style={{ background: "rgba(124,58,237,0.1)" }}
                  >
                    🛡️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-dark text-[0.85rem]">
                      {a.action}
                    </div>
                    <div className="text-[0.72rem] text-muted">
                      {a.target_type ? `${a.target_type} · ${a.target_id}` : "—"}
                    </div>
                  </div>
                  <div className="text-[0.72rem] text-muted whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString("en-AU", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </main>
    </>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden mb-4">
      <header className="px-5 py-4 border-b border-border">
        <h2 className="font-display text-[0.95rem] font-extrabold text-dark">
          {title}
        </h2>
      </header>
      <div className="px-5 py-4 flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[0.82rem] text-muted">{label}</span>
      {children}
    </div>
  );
}

function Value({ children }) {
  return <span className="text-[0.88rem] font-semibold text-dark">{children}</span>;
}

function Flag({ label, on, danger }) {
  const color = danger
    ? (on ? "var(--color-red)"   : "var(--color-muted)")
    : (on ? "var(--color-green)" : "var(--color-muted)");
  const bg = danger
    ? (on ? "rgba(239,68,68,0.1)"   : "var(--color-lg)")
    : (on ? "rgba(16,185,129,0.1)" : "var(--color-lg)");
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[0.82rem] text-muted">{label}</span>
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[0.72rem] font-bold"
        style={{ background: bg, color, border: `1px solid ${color}40` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {on ? "On" : "Off"}
      </span>
    </div>
  );
}
