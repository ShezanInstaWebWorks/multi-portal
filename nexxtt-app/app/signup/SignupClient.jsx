"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NexxttLogo } from "@/components/auth/NexxttLogo";

export function SignupClient({ initialTab = "agency" }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-5 py-8"
      style={{ background: "linear-gradient(160deg, #0b1f3a 0%, #0f2d50 55%, #0b3040 100%)" }}
    >
      <div className="mb-3 text-center">
        <NexxttLogo width={140} />
      </div>
      <h1 className="font-display text-[1.6rem] font-extrabold text-white text-center mb-1 tracking-tight">
        Create your account
      </h1>
      <p className="text-center text-[0.85rem] text-white/45 mb-6">
        Pick the right account type below.
      </p>

      <div className="flex gap-1 p-1 mb-5 rounded-[12px]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <TabButton active={tab === "agency"} onClick={() => setTab("agency")} icon={<Building2 className="w-3.5 h-3.5" />}>
          Agency partner
        </TabButton>
        <TabButton active={tab === "direct"} onClick={() => setTab("direct")} icon={<User className="w-3.5 h-3.5" />}>
          Direct client
        </TabButton>
      </div>

      <div
        className="w-full max-w-[460px] rounded-[20px] px-7 py-7"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
        }}
      >
        {tab === "agency" ? <AgencyForm /> : <DirectForm />}
      </div>

      <p className="text-center text-[0.78rem] text-white/40 mt-5">
        Already have an account?{" "}
        <Link href="/login" className="text-teal font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-[0.82rem] font-semibold transition-all"
      style={
        active
          ? { background: "var(--color-teal)", color: "var(--color-navy)" }
          : { color: "rgba(255,255,255,0.55)" }
      }
    >
      {icon}
      {children}
    </button>
  );
}

function AgencyForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    agencyName: "", firstName: "", lastName: "", email: "", password: "",
    contactPhone: "", website: "",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const busy = submitting || isPending;

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/signup/agency", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Signup failed");
      setSubmitting(false);
      return;
    }
    // Sign the user in so the proxy lets them past /signup/agency/pending,
    // then redirect to the awaiting-approval page.
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setSubmitting(false);
    if (authError) {
      setError("Account created but sign-in failed: " + authError.message);
      return;
    }
    startTransition(() => router.push("/signup/agency/pending"));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <Field label="Agency name *" value={form.agencyName} onChange={set("agencyName")} placeholder="Bright Agency Co." required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name *" value={form.firstName} onChange={set("firstName")} required />
        <Field label="Last name"     value={form.lastName}  onChange={set("lastName")} />
      </div>
      <Field label="Work email *" type="email" value={form.email} onChange={set("email")} required />
      <Field label="Password *"   type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"   value={form.contactPhone} onChange={set("contactPhone")} />
        <Field label="Website" value={form.website}      onChange={set("website")} placeholder="brightagency.com.au" />
      </div>
      <SubmitButton busy={busy}>Create agency account</SubmitButton>
      {error && <ErrorBox>{error}</ErrorBox>}
      <p className="text-[0.7rem] text-white/30 text-center mt-1">
        Your account will need admin approval before you can log into the agency portal.
      </p>
    </form>
  );
}

function DirectForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", businessName: "",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const busy = submitting || isPending;

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/signup/direct", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Signup failed");
      setSubmitting(false);
      return;
    }
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setSubmitting(false);
    if (authError) {
      setError("Account created but sign-in failed: " + authError.message);
      return;
    }
    startTransition(() => router.push("/direct/dashboard"));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name *" value={form.firstName} onChange={set("firstName")} required />
        <Field label="Last name"     value={form.lastName}  onChange={set("lastName")} />
      </div>
      <Field label="Business name" value={form.businessName} onChange={set("businessName")} placeholder="(optional)" />
      <Field label="Email *"    type="email"    value={form.email}    onChange={set("email")} required />
      <Field label="Password *" type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" required />
      <SubmitButton busy={busy}>Create account & start ordering</SubmitButton>
      {error && <ErrorBox>{error}</ErrorBox>}
      <p className="text-[0.7rem] text-white/30 text-center mt-1">
        You can place your first order immediately after sign-up.
      </p>
    </form>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-[0.7rem] font-bold text-white/55 uppercase mb-1.5" style={{ letterSpacing: "0.08em" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3.5 py-2.5 rounded-[10px] text-[0.88rem] text-white outline-none transition-colors"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1.5px solid rgba(255,255,255,0.12)",
        }}
      />
    </div>
  );
}

function SubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full py-3 rounded-[10px] font-display font-extrabold text-[0.95rem] mt-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: "var(--color-teal)",
        color: "var(--color-navy)",
        boxShadow: "0 8px 24px rgba(0,184,169,0.3)",
      }}
    >
      {busy ? "Creating account…" : children}
    </button>
  );
}

function ErrorBox({ children }) {
  return (
    <div
      className="text-[0.78rem] rounded-[8px] px-3 py-2 mt-1"
      style={{
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.3)",
        color: "#fca5a5",
      }}
    >
      {children}
    </div>
  );
}
