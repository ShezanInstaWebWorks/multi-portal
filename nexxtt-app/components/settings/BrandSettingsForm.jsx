"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, Bell, ExternalLink } from "lucide-react";
import { isValidSlug } from "@/lib/slug";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function BrandSettingsForm({ agency, brand }) {
  const router = useRouter();
  const [state, setState] = useState({
    display_name:            brand.display_name            ?? agency.name ?? "",
    logo_url:                brand.logo_url                ?? "",
    primary_colour:          brand.primary_colour          ?? "#0B1F3A",
    accent_colour:           brand.accent_colour           ?? "#00B8A9",
    portal_slug:             brand.portal_slug             ?? agency.slug ?? "",
    support_email:           brand.support_email           ?? "",
    sign_off_name:           brand.sign_off_name           ?? "",
    default_invite_message:  brand.default_invite_message  ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(null); // 'ok' | 'err' | null
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  function patch(next) {
    setState((s) => ({ ...s, ...next }));
    setSaved(null);
  }

  const primaryOk = HEX_RE.test(state.primary_colour);
  const accentOk  = HEX_RE.test(state.accent_colour);
  const slugOk    = isValidSlug(state.portal_slug);
  const canSave   = primaryOk && accentOk && slugOk && state.display_name.trim().length >= 2;

  async function uploadLogo(file) {
    if (!file) return;
    if (file.size > 524288) {
      setError("Logo must be 500 KB or smaller.");
      return;
    }
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/brand/logo", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? `Upload failed (${res.status})`);
      return;
    }
    patch({ logo_url: data.logoUrl });
  }

  async function save() {
    setSaving(true);
    setSaved(null);
    setError(null);
    const res = await fetch("/api/brand", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setSaved("err");
      setError(data.error ?? `Save failed (${res.status})`);
      return;
    }
    setSaved("ok");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
      {/* ── FORM ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Logo & Colours */}
        <Section title="Logo & Colours" subtitle="Shown to clients — nexxtt.io never appears in your portal.">
          <Field label="Agency logo">
            <div className="flex items-center gap-4 flex-wrap">
              <div
                className="w-[160px] h-[56px] rounded-[10px] flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{
                  border: "1.5px dashed var(--color-border)",
                  background: "var(--color-off)",
                }}
              >
                {state.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={state.logo_url} alt="" className="max-h-11 max-w-full object-contain" />
                ) : (
                  <span className="font-display text-[0.9rem] font-extrabold text-navy px-3 text-center leading-tight truncate">
                    {state.display_name || "Your agency"}
                  </span>
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => uploadLogo(e.target.files?.[0])}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-sm font-semibold bg-white border border-border hover:border-navy hover:shadow-md transition-all disabled:opacity-60"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "Uploading…" : state.logo_url ? "Replace logo" : "Upload logo"}
                </button>
                <div className="text-[0.72rem] text-muted mt-1.5">
                  PNG · SVG · JPEG · WebP · max 500 KB · transparent bg preferred
                </div>
                {state.logo_url && (
                  <button
                    onClick={() => patch({ logo_url: "" })}
                    className="text-[0.72rem] text-red mt-1 hover:underline"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColourField
              label="Primary colour"
              value={state.primary_colour}
              onChange={(v) => patch({ primary_colour: v })}
              valid={primaryOk}
            />
            <ColourField
              label="Accent colour"
              value={state.accent_colour}
              onChange={(v) => patch({ accent_colour: v })}
              valid={accentOk}
            />
          </div>
        </Section>

        {/* Client Portal Settings */}
        <Section title="Client portal settings" subtitle="What your clients see in the branded portal and invite emails.">
          <Field label="Display name" required>
            <input
              type="text"
              value={state.display_name}
              onChange={(e) => patch({ display_name: e.target.value })}
              className="input"
              placeholder="e.g. Bright Agency Co."
            />
          </Field>

          <Field label="nexxtt.io subdomain">
            <div className="flex items-center rounded-[10px] overflow-hidden" style={{ border: "1.5px solid var(--color-border)" }}>
              <input
                type="text"
                value={state.portal_slug}
                onChange={(e) => patch({ portal_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                className="flex-1 px-3 py-2.5 text-[0.88rem] outline-none bg-white"
              />
              <span
                className="px-3 py-2.5 text-[0.82rem] text-muted whitespace-nowrap"
                style={{ background: "var(--color-off)", borderLeft: "1px solid var(--color-border)" }}
              >
                .nexxtt.io
              </span>
            </div>
            <div className="text-[0.72rem] text-muted mt-1">
              Your portal URL: <strong>{state.portal_slug || "[slug]"}.nexxtt.io</strong>
              {!slugOk && (
                <span className="text-red ml-2">Must be 2+ chars, lowercase + hyphens only.</span>
              )}
            </div>
          </Field>

          <Field label="Support email (reply-to)">
            <input
              type="email"
              value={state.support_email}
              onChange={(e) => patch({ support_email: e.target.value })}
              className="input"
              placeholder="hello@yourdomain.com"
            />
          </Field>

          <Field label="Sign-off name (used in invite emails)">
            <input
              type="text"
              value={state.sign_off_name}
              onChange={(e) => patch({ sign_off_name: e.target.value })}
              className="input"
              placeholder="Alex Johnson, Bright Agency Co."
            />
          </Field>

          <Field label="Default invite message">
            <textarea
              value={state.default_invite_message}
              onChange={(e) => patch({ default_invite_message: e.target.value })}
              className="input min-h-[100px] resize-y"
              rows={4}
              placeholder="Welcome to our client portal…"
            />
          </Field>
        </Section>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={save}
            disabled={!canSave || saving}
            className="px-5 py-2.5 rounded-[10px] text-sm font-extrabold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px"
            style={{
              background: "var(--color-teal)",
              boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/portal/${state.portal_slug}/coastal-realty`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-sm font-semibold bg-white border border-border text-body hover:border-navy hover:shadow-md transition-all"
          >
            Preview client portal
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          {saved === "ok" && (
            <span className="inline-flex items-center gap-1 text-sm text-green font-semibold">
              ✓ Saved
            </span>
          )}
          {saved === "err" && error && (
            <span className="text-sm text-red">{error}</span>
          )}
        </div>
      </div>

      {/* ── LIVE PREVIEW ──────────────────────────────── */}
      <LivePreview state={state} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <section className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
      <header className="px-5 py-4 border-b border-border">
        <h2 className="font-display text-[0.95rem] font-extrabold text-dark">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[0.75rem] text-muted mt-0.5">{subtitle}</p>
        )}
      </header>
      <div className="px-5 py-4 flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-[0.75rem] font-bold text-body mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}

function ColourField({ label, value, onChange, valid }) {
  return (
    <label className="block">
      <span className="block text-[0.75rem] font-bold text-body mb-1.5">
        {label}
      </span>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-11 h-11 rounded-[8px] p-1 cursor-pointer bg-white"
          style={{ border: "1.5px solid var(--color-border)" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="input font-mono text-[0.85rem]"
          style={valid ? undefined : { borderColor: "var(--color-red)" }}
        />
      </div>
      {!valid && (
        <div className="text-[0.72rem] text-red mt-1">
          Must be a 6-digit hex, e.g. <code>#0B1F3A</code>.
        </div>
      )}
    </label>
  );
}

function LivePreview({ state }) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
      <div
        className="text-[0.72rem] font-bold uppercase text-muted"
        style={{ letterSpacing: "0.1em" }}
      >
        Live preview
      </div>

      {/* Portal topbar preview */}
      <div className="rounded-[16px] overflow-hidden border border-border shadow-sm">
        <div
          className="h-12 flex items-center justify-between px-4"
          style={{ background: state.primary_colour }}
        >
          <div className="font-display text-[0.9rem] font-extrabold text-white tracking-tight truncate">
            {state.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={state.logo_url} alt="" className="h-5 max-w-[120px] object-contain" />
            ) : (
              state.display_name || "Your agency"
            )}
          </div>
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-white/70" />
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-extrabold"
              style={{ background: state.accent_colour, color: state.primary_colour }}
            >
              SM
            </div>
          </div>
        </div>
        <div className="bg-off px-4 py-5">
          <div className="text-[0.6rem] uppercase text-muted font-bold mb-0.5" style={{ letterSpacing: "0.1em" }}>
            {state.display_name || "Your agency"}
          </div>
          <div className="font-display text-[0.98rem] font-extrabold text-dark">
            Welcome back, Sarah
          </div>
          <div className="mt-3 h-9 rounded-md flex items-center justify-center text-white text-[0.72rem] font-bold" style={{ background: state.primary_colour }}>
            Client dashboard
          </div>
        </div>
      </div>

      {/* Invite email preview */}
      <div
        className="rounded-[16px] overflow-hidden"
        style={{ border: "1px solid var(--color-border)", background: "#f0f2f5" }}
      >
        <div className="px-3 py-1.5 flex gap-1" style={{ background: "#e5e7ea" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="w-2 h-2 rounded-full" style={{ background: "#ffbd2e" }} />
          <div className="w-2 h-2 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <div className="bg-white">
          <div className="px-5 py-4" style={{ background: state.primary_colour }}>
            <div className="font-display text-[0.95rem] font-extrabold text-white truncate">
              {state.display_name || "Your agency"}
            </div>
            <div className="h-0.5 w-6 rounded mt-1" style={{ background: state.accent_colour }} />
          </div>
          <div className="px-4 py-4">
            <div className="text-[0.72rem] font-bold text-dark mb-1">
              Your project portal is ready
            </div>
            <div className="text-[0.68rem] text-body leading-relaxed">
              Hi there, welcome to your client portal…
            </div>
            <div className="text-center my-3">
              <span
                className="inline-block px-4 py-2 rounded-md font-display font-extrabold text-[0.7rem] text-white"
                style={{ background: state.primary_colour }}
              >
                Set Up My Portal →
              </span>
            </div>
            <div
              className="text-[0.62rem] text-center rounded px-2 py-1 break-all"
              style={{
                background: `${state.accent_colour}1a`,
                color: state.accent_colour,
              }}
            >
              {state.portal_slug || "your-agency"}.nexxtt.io
            </div>
            <div
              className="text-[0.7rem] mt-3 pt-2 border-t"
              style={{ borderColor: "var(--color-border)", color: "var(--color-body)" }}
            >
              Warm regards,
              <br />
              <strong>{state.sign_off_name || "Your name"}</strong>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
