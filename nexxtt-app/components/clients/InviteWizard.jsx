"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Send } from "lucide-react";
import { slugify, isValidSlug } from "@/lib/slug";

const INDUSTRIES = [
  "Healthcare", "Real Estate", "Technology", "Beauty & Retail",
  "Finance", "Hospitality", "Professional Services", "Other",
];

const STEPS = [
  { n: 1, label: "Client Details" },
  { n: 2, label: "Customise Invite" },
  { n: 3, label: "Confirm & Send" },
];

export function InviteWizard({ agency, brand, profileName }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const agencyBrandName  = brand?.display_name ?? agency?.name ?? "Your agency";
  const agencyPortalSlug = brand?.portal_slug ?? agency?.slug ?? "your-agency";
  const defaultSignoff   = brand?.sign_off_name ?? (profileName ? `${profileName}, ${agencyBrandName}` : agencyBrandName);

  const [draft, setDraft] = useState({
    businessName:  "",
    industry:      "Other",
    contactName:   "",
    jobTitle:      "",
    contactEmail:  "",
    phone:         "",
    internalNote:  "",
    accessLevel:   "full",
    slug:          "",
    subject:       `Your project portal is ready — ${agencyBrandName}`,
    message:
      brand?.default_invite_message ??
      `Hi,\n\nWe're excited to welcome you to your project portal! Track your project progress, review and approve deliverables, and download your final files — all in one place.`,
    cta: "Set Up My Portal →",
    signoff: defaultSignoff,
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const derivedSlug = useMemo(
    () => (draft.slug.trim() ? draft.slug : slugify(draft.businessName)),
    [draft.slug, draft.businessName]
  );
  const portalUrl = `${agencyPortalSlug}.nexxtt.io/portal/${derivedSlug}`;

  const canAdvance = {
    1:
      draft.businessName.trim().length >= 2 &&
      draft.contactName.trim().length >= 2 &&
      /.+@.+/.test(draft.contactEmail),
    2:
      draft.subject.trim().length > 0 &&
      draft.message.trim().length > 0 &&
      draft.cta.trim().length > 0 &&
      isValidSlug(derivedSlug),
    3: true,
  }[step];

  async function send() {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/clients/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName:     draft.businessName.trim(),
        industry:         draft.industry,
        contactName:      draft.contactName.trim(),
        contactEmail:     draft.contactEmail.trim().toLowerCase(),
        phone:            draft.phone.trim(),
        internalNote:     draft.internalNote.trim(),
        portalAccessLevel: draft.accessLevel === "view" ? "view_and_approve" : "full",
        portalSlug:       derivedSlug,
        inviteSubject:    draft.subject.trim(),
        inviteMessage:    draft.message.trim(),
        inviteCta:        draft.cta.trim(),
        signOffName:      draft.signoff.trim(),
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? `Request failed (${res.status})`);
      setSubmitting(false);
      return;
    }

    setResult(body);
    setSubmitting(false);
  }

  // After successful send, show the result card (with copyable magic link).
  if (result) {
    return <InviteSuccess result={result} router={router} onCopy={() => {
      navigator.clipboard.writeText(result.actionLink ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }} copied={copied} portalUrl={portalUrl} />;
  }

  const stepProps = { draft, setDraft, agencyBrandName, agencyPortalSlug, derivedSlug, portalUrl, profileName, INDUSTRIES };

  return (
    <div>
      <Link
        href="/agency/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to clients
      </Link>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8 flex-wrap">
        {STEPS.map((s, i) => {
          const state = step === s.n ? "active" : step > s.n ? "done" : "pending";
          return (
            <div key={s.n} className="flex items-center gap-2.5 flex-1 min-w-[140px]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] font-extrabold flex-shrink-0 transition-all"
                style={
                  state === "active"
                    ? { background: "var(--color-navy)", color: "white", boxShadow: "0 4px 14px rgba(11,31,58,0.25)", transform: "scale(1.08)" }
                    : state === "done"
                    ? { background: "var(--color-teal)", color: "white", boxShadow: "0 4px 12px rgba(0,184,169,0.3)" }
                    : { background: "white", color: "var(--color-muted)", border: "2px solid var(--color-border)", boxShadow: "0 2px 8px rgba(11,31,58,0.08)" }
                }
              >
                {state === "done" ? <Check className="w-3.5 h-3.5" /> : s.n}
              </div>
              <div
                className={`text-[0.78rem] font-semibold ${
                  state === "active" ? "text-navy" : state === "done" ? "text-teal" : "text-muted"
                }`}
              >
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="h-0.5 flex-1 mx-3 min-w-[24px]"
                  style={{
                    background: step > s.n ? "var(--color-teal)" : "var(--color-border)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Panels */}
      <div className="mb-7">
        {step === 1 && <Step1Details {...stepProps} />}
        {step === 2 && <Step2Customize {...stepProps} />}
        {step === 3 && <Step3Confirm {...stepProps} error={error} />}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-[10px] text-sm font-semibold bg-white border border-border text-body hover:border-navy hover:shadow-md transition-all"
            >
              ← Back
            </button>
          )}
        </div>
        <div>
          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance}
              className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-px"
              style={{ background: "var(--color-teal)", boxShadow: "0 2px 10px rgba(0,184,169,0.25)" }}
            >
              {step === 1 ? "Next: Customise Invite →" : "Next: Review & Send →"}
            </button>
          )}
          {step === 3 && (
            <button
              onClick={send}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-extrabold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-px"
              style={{ background: "var(--color-teal)", boxShadow: "0 2px 10px rgba(0,184,169,0.25)" }}
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Sending…" : "Send Invite"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── STEP 1 ─────────────────────────────────────────────────────────────
function Step1Details({ draft, setDraft, agencyBrandName, portalUrl, INDUSTRIES }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
      <div>
        <div className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
          <h2 className="font-display text-[1.1rem] font-extrabold text-dark mb-1">
            Who are you inviting?
          </h2>
          <p className="text-[0.82rem] text-muted leading-relaxed mb-5">
            Enter your client&apos;s details. They&apos;ll use the email below
            to set up their portal login.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Business name" required>
              <input
                type="text"
                value={draft.businessName}
                onChange={(e) => setDraft({ ...draft, businessName: e.target.value })}
                placeholder="e.g. Riverview Dental"
                className="input"
              />
            </Field>
            <Field label="Industry">
              <select
                value={draft.industry}
                onChange={(e) => setDraft({ ...draft, industry: e.target.value })}
                className="input"
              >
                {INDUSTRIES.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </Field>
            <Field label="Contact name" required>
              <input
                type="text"
                value={draft.contactName}
                onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
                placeholder="Full name"
                className="input"
              />
            </Field>
            <Field label="Job title">
              <input
                type="text"
                value={draft.jobTitle}
                onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })}
                placeholder="e.g. Practice Manager"
                className="input"
              />
            </Field>
            <Field label="Email address" required>
              <input
                type="email"
                value={draft.contactEmail}
                onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
                placeholder="email@business.com"
                className="input"
              />
            </Field>
            <Field label="Phone (optional)">
              <input
                type="text"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder="04xx xxx xxx"
                className="input"
              />
            </Field>
          </div>

          <div className="mt-3.5">
            <Field label="Internal note (not visible to client)">
              <textarea
                value={draft.internalNote}
                onChange={(e) => setDraft({ ...draft, internalNote: e.target.value })}
                placeholder="e.g. Referred by James Park. Needs website + logo. Budget ~$2,000."
                className="input min-h-[72px] resize-y"
                rows={3}
              />
            </Field>
          </div>
        </div>

        {/* Portal access options */}
        <div className="bg-white border border-border rounded-[16px] p-5 shadow-sm mt-4">
          <h3 className="text-[0.9rem] font-bold text-dark mb-3">
            Portal access options
          </h3>
          <div className="flex flex-col gap-2.5">
            <AccessOption
              selected={draft.accessLevel === "full"}
              onClick={() => setDraft({ ...draft, accessLevel: "full" })}
              title="Full portal access"
              desc="Client can view projects, download files, leave comments, and submit new briefs."
            />
            <AccessOption
              selected={draft.accessLevel === "view"}
              onClick={() => setDraft({ ...draft, accessLevel: "view" })}
              title="View & approve only"
              desc="Client sees status and approves deliverables, but can't submit new briefs."
            />
          </div>
        </div>
      </div>

      {/* Right: what the client gets */}
      <div
        className="rounded-[16px] p-5 text-white"
        style={{
          background: "var(--color-navy)",
          boxShadow: "0 4px 20px rgba(11,31,58,0.15)",
        }}
      >
        <div
          className="text-[0.75rem] font-bold uppercase text-white/45 mb-3.5"
          style={{ letterSpacing: "0.08em" }}
        >
          What your client gets
        </div>
        <div className="flex flex-col gap-2.5">
          <Benefit icon="📧" title="Branded invite email"   desc={`Sent from ${agencyBrandName}, not nexxtt.io`} />
          <Benefit icon="🔐" title="Magic-link login"       desc="One click to set up their account. No password needed initially." />
          <Benefit icon="🌐" title="Their own portal URL"    desc={portalUrl} />
          <Benefit icon="📋" title="Live project dashboard"  desc="Track progress, review drafts, download final files." />
        </div>
        <div
          className="mt-4 rounded-[10px] px-3 py-2.5 text-[0.72rem] text-white/60 leading-relaxed"
          style={{
            background: "rgba(0,184,169,0.1)",
            border: "1px solid rgba(0,184,169,0.2)",
          }}
        >
          ✓ White-label — {agencyBrandName} branding only<br />
          ✓ nexxtt.io is invisible to your client<br />
          ✓ Invite expires in 7 days (re-send anytime)
        </div>
      </div>
    </div>
  );
}

// ── STEP 2 ─────────────────────────────────────────────────────────────
function Step2Customize({ draft, setDraft, agencyBrandName, agencyPortalSlug, derivedSlug, portalUrl }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
        <h2 className="font-display text-[1.1rem] font-extrabold text-dark mb-1">
          Customise the invite email
        </h2>
        <p className="text-[0.82rem] text-muted leading-relaxed mb-5">
          The preview on the right updates as you type.
        </p>

        <Field label="Email subject">
          <input
            type="text"
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Opening message">
          <textarea
            value={draft.message}
            onChange={(e) => setDraft({ ...draft, message: e.target.value })}
            className="input min-h-[120px] resize-y"
            rows={5}
          />
        </Field>
        <Field label="Call-to-action button label">
          <input
            type="text"
            value={draft.cta}
            onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Portal URL slug">
          <div
            className="flex items-center overflow-hidden rounded-[10px]"
            style={{ border: "1.5px solid var(--color-border)" }}
          >
            <span
              className="px-3 py-2.5 text-[0.82rem] text-muted whitespace-nowrap"
              style={{
                background: "var(--color-off)",
                borderRight: "1px solid var(--color-border)",
              }}
            >
              {agencyPortalSlug}.nexxtt.io/portal/
            </span>
            <input
              type="text"
              value={draft.slug || slugify(draft.businessName)}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })}
              className="flex-1 px-3 py-2.5 text-[0.85rem] outline-none"
            />
          </div>
          {!isValidSlug(derivedSlug) && (
            <div className="text-[0.72rem] text-red mt-1">
              Slug must be 2+ chars, lowercase letters / numbers / hyphens only.
            </div>
          )}
        </Field>
        <Field label="Sign-off name">
          <input
            type="text"
            value={draft.signoff}
            onChange={(e) => setDraft({ ...draft, signoff: e.target.value })}
            className="input"
          />
        </Field>
      </div>

      {/* Email preview */}
      <div>
        <div
          className="text-[0.75rem] font-bold uppercase text-muted mb-2.5"
          style={{ letterSpacing: "0.08em" }}
        >
          📧 Live email preview
        </div>
        <EmailPreview draft={draft} agencyBrandName={agencyBrandName} portalUrl={portalUrl} />
      </div>
    </div>
  );
}

// ── STEP 3 ─────────────────────────────────────────────────────────────
function Step3Confirm({ draft, agencyBrandName, portalUrl, error }) {
  const expires = new Date(Date.now() + 7 * 86400000);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="flex flex-col gap-4">
        <div className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
          <h2 className="font-display text-[1.1rem] font-extrabold text-dark mb-4">
            Review before sending
          </h2>
          <Info k="Sending to">
            <strong>{draft.contactName}</strong> · {draft.contactEmail}
          </Info>
          <Info k="Business">
            {draft.businessName} · {draft.industry}
          </Info>
          <Info k="Portal URL" valueClass="text-teal font-semibold">
            {portalUrl}
          </Info>
          <Info k="Access level">
            {draft.accessLevel === "view" ? "View & approve only" : "Full portal access"}
          </Info>
          <Info k="Expires">
            7 days — {expires.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
          </Info>
          {draft.internalNote && (
            <Info k="Internal note" valueClass="text-muted italic">
              {draft.internalNote}
            </Info>
          )}
        </div>

        <div className="rounded-[16px] p-5 text-white" style={{ background: "var(--color-navy)" }}>
          <div
            className="text-[0.75rem] font-bold uppercase text-white/45 mb-3.5"
            style={{ letterSpacing: "0.08em" }}
          >
            What happens after you send
          </div>
          <div className="flex flex-col gap-3">
            <TimelineStep n={1} text={`${draft.contactName || "Your client"} receives the branded email from ${agencyBrandName} immediately.`} />
            <TimelineStep n={2} text="They click the magic link → set a password → see their project dashboard." />
            <TimelineStep n={3} text="Client Manager updates to “Active ✓” once they sign in." />
            <TimelineStep n={4} dim text="If they don't click within 7 days, you can resend anytime." />
          </div>
        </div>

        {error && (
          <div
            className="rounded-[10px] px-3.5 py-2.5 text-[0.82rem]"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "var(--color-red)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Mini email preview */}
      <div>
        <div
          className="text-[0.75rem] font-bold uppercase text-muted mb-2.5"
          style={{ letterSpacing: "0.08em" }}
        >
          📧 Email being sent
        </div>
        <EmailPreview draft={draft} agencyBrandName={agencyBrandName} portalUrl={portalUrl} compact />
      </div>
    </div>
  );
}

// ── Success panel ─────────────────────────────────────────────────────
function InviteSuccess({ result, router, onCopy, copied, portalUrl }) {
  const link = result.actionLink;
  const emailSent = result.emailSent === true;
  return (
    <div className="max-w-[640px] mx-auto">
      <div
        className="rounded-[16px] p-8 text-center shadow-md"
        style={{
          background:
            "linear-gradient(135deg, var(--color-teal-pale), white)",
          border: "1.5px solid var(--color-teal)",
        }}
      >
        <div
          className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
          style={{
            background: "var(--color-teal)",
            color: "white",
            boxShadow: "0 4px 14px rgba(0,184,169,0.35)",
          }}
        >
          <Check className="w-7 h-7" strokeWidth={3} />
        </div>
        <h2 className="font-display text-[1.5rem] font-extrabold text-dark">
          Invite prepared
        </h2>
        <p className="text-sm text-muted mt-1 mb-5 max-w-[440px] mx-auto">
          {emailSent
            ? "Your client has been emailed. You'll see them in the Client Manager as “Pending Invite” until they sign in."
            : "The client row has been created. Email delivery via Resend arrives in a later session — copy the magic link below and send it manually for now."}
        </p>

        {link && (
          <div
            className="rounded-[10px] bg-white px-3.5 py-3 text-left flex items-center gap-2 mb-4"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <code className="flex-1 text-[0.78rem] text-body break-all font-mono">
              {link}
            </code>
            <button
              onClick={onCopy}
              className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[0.75rem] font-semibold text-white"
              style={{ background: "var(--color-teal)" }}
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => router.push("/agency/clients")}
            className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white"
            style={{
              background: "var(--color-teal)",
              boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
            }}
          >
            Back to clients
          </button>
          <Link
            href="/agency/clients/invite"
            className="px-5 py-2.5 rounded-[10px] text-sm font-semibold bg-white border border-border text-body hover:border-navy hover:shadow-md transition-all"
          >
            Invite another
          </Link>
        </div>

        <div className="text-[0.75rem] text-muted mt-6">
          Client portal URL: <span className="text-teal font-semibold">{portalUrl}</span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <label className="block mb-3.5 last:mb-0">
      <span className="block text-[0.75rem] font-bold text-body mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}

function AccessOption({ selected, onClick, title, desc }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-[10px] p-3 flex items-start gap-2.5"
      style={{
        background: selected ? "var(--color-teal-pale)" : "var(--color-off)",
        border: selected
          ? "1.5px solid var(--color-teal)"
          : "1.5px solid var(--color-border)",
      }}
    >
      <div
        className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
        style={{
          background: selected ? "var(--color-teal)" : "transparent",
          border: selected
            ? "2px solid var(--color-teal)"
            : "2px solid var(--color-border)",
          boxShadow: selected ? "inset 0 0 0 2px white" : "none",
        }}
      />
      <div>
        <div className="text-[0.85rem] font-bold text-dark">{title}</div>
        <div className="text-[0.75rem] text-muted mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function Benefit({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[0.85rem] flex-shrink-0"
        style={{
          background: "rgba(0,184,169,0.15)",
          border: "1px solid rgba(0,184,169,0.25)",
        }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[0.82rem] font-semibold text-white">{title}</div>
        <div className="text-[0.72rem] text-white/45 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

function Info({ k, children, valueClass = "" }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <div className="text-[0.78rem] text-muted font-semibold flex-shrink-0">
        {k}
      </div>
      <div className={`text-[0.85rem] text-right ${valueClass}`}>{children}</div>
    </div>
  );
}

function TimelineStep({ n, text, dim }) {
  return (
    <div className="flex gap-3 items-start">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-extrabold flex-shrink-0"
        style={{
          background: dim ? "rgba(255,255,255,0.1)" : "var(--color-teal)",
          color: dim ? "rgba(255,255,255,0.4)" : "var(--color-navy)",
        }}
      >
        {n}
      </div>
      <div
        className={`text-[0.82rem] leading-relaxed ${dim ? "text-white/40" : "text-white/65"}`}
      >
        {text}
      </div>
    </div>
  );
}

function EmailPreview({ draft, agencyBrandName, portalUrl, compact }) {
  return (
    <div
      className="rounded-[16px] p-4 shadow-sm"
      style={{
        background: "#f0f2f5",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="flex items-center gap-1.5 rounded-t-lg px-3.5 py-2"
        style={{ background: "#e5e7ea" }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
        <span
          className="flex-1 text-center text-[0.7rem] text-[#888] bg-white rounded px-2 py-0.5 ml-2 truncate"
        >
          {draft.subject}
        </span>
      </div>
      <div
        className="rounded-b-lg overflow-hidden"
        style={{
          background: "white",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="px-6 py-6"
          style={{ background: "var(--color-navy)" }}
        >
          <div className="font-display text-[1.2rem] font-extrabold text-white tracking-tight">
            {agencyBrandName}
          </div>
          <div
            className="w-8 h-0.5 mt-1.5 rounded"
            style={{ background: "var(--color-teal)" }}
          />
        </div>
        <div className={compact ? "px-5 py-4" : "px-7 py-6"}>
          <div className="text-[0.92rem] font-bold text-navy mb-3">
            {draft.subject}
          </div>
          <div className="text-[0.82rem] text-body leading-[1.75] whitespace-pre-wrap mb-4">
            {draft.message}
          </div>
          <div className="text-center my-5">
            <span
              className="inline-block px-7 py-3 rounded-[10px] font-display font-extrabold text-[0.92rem] text-white"
              style={{
                background: "var(--color-navy)",
                letterSpacing: "-0.01em",
              }}
            >
              {draft.cta}
            </span>
          </div>
          <div className="text-[0.75rem] text-muted text-center mb-1">
            Or copy this link:
          </div>
          <div
            className="text-[0.72rem] text-teal text-center rounded px-2.5 py-1.5 break-all"
            style={{ background: "var(--color-teal-pale)" }}
          >
            {portalUrl}
          </div>
          <div
            className="mt-5 pt-4 text-[0.78rem] text-body leading-[1.7]"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            Warm regards,
            <br />
            <strong>{draft.signoff}</strong>
          </div>
        </div>
        <div
          className="px-5 py-3 text-[0.68rem] text-muted text-center leading-relaxed"
          style={{
            background: "#f7f8fa",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          This invitation was sent by {agencyBrandName}.<br />
          This link expires in 7 days.
        </div>
      </div>
    </div>
  );
}
