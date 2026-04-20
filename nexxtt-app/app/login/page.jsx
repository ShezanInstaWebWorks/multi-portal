"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_USERS } from "@/lib/demoUsers";
import { createClient } from "@/lib/supabase/client";
import { NexxttLogo } from "@/components/auth/NexxttLogo";

const ORDER = ["agency", "client", "referral", "direct", "admin"];

const ACCENT_RGBA = {
  teal:  { icon: "rgba(0,184,169,0.15)",  text: "var(--color-teal)",    company: "rgba(0,184,169,0.7)" },
  amber: { icon: "rgba(245,158,11,0.15)", text: "var(--color-amber)",   company: "rgba(245,158,11,0.7)" },
  green: { icon: "rgba(16,185,129,0.15)", text: "var(--color-green)",   company: "rgba(16,185,129,0.7)" },
  adm:   { icon: "rgba(124,58,237,0.18)", text: "#a78bfa",              company: "rgba(167,139,250,0.8)" },
};

function cardAccent(u) {
  if (u.accent.startsWith("#")) {
    return {
      icon: `${u.accent}26`,
      text: u.accent,
      company: `${u.accent}b3`,
    };
  }
  return ACCENT_RGBA[u.accent] ?? ACCENT_RGBA.teal;
}

export default function LoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("agency");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const user = DEMO_USERS[selected];

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: "demo1234",
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    // Proxy reads the Supabase session and role from user_metadata — no cookie
    // to set manually. Refresh to let server components read the new session.
    router.push(user.home);
    router.refresh();
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #0b1f3a 0%, #0f2d50 55%, #0b3040 100%)",
      }}
    >
      {/* Decorative circles */}
      <div
        className="pointer-events-none absolute -top-52 -right-52 w-[600px] h-[600px] rounded-full"
        style={{ background: "rgba(0,184,169,0.05)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full"
        style={{ background: "rgba(0,184,169,0.04)" }}
      />

      {/* Logo */}
      <div className="mb-3 text-center relative">
        <NexxttLogo width={160} />
      </div>

      <div
        className="relative inline-block mb-5 px-3.5 py-1 rounded-full text-[0.72rem] font-bold uppercase"
        style={{
          letterSpacing: "0.16em",
          color: "var(--color-teal)",
          background: "rgba(0,184,169,0.1)",
          border: "1px solid rgba(0,184,169,0.2)",
        }}
      >
        Interactive Demo
      </div>

      <h1 className="font-display text-[1.8rem] font-extrabold text-white text-center mb-2 tracking-tight leading-tight">
        Choose who you are
      </h1>
      <p className="text-center text-[0.88rem] max-w-[380px] leading-relaxed mb-10 text-white/45">
        Five different portals. Pick a user type and sign in to explore.
      </p>

      {/* User type cards */}
      <div className="flex gap-3.5 flex-wrap justify-center w-full max-w-[1180px] mb-8 relative">
        {ORDER.map((key) => {
          const u = DEMO_USERS[key];
          const isSelected = selected === key;
          const a = cardAccent(u);
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`group relative flex-1 min-w-[180px] max-w-[220px] text-left rounded-[16px] px-[18px] py-5 transition-all duration-[250ms] overflow-hidden`}
              style={{
                background: isSelected
                  ? "rgba(0,184,169,0.06)"
                  : "rgba(255,255,255,0.04)",
                border: isSelected
                  ? "1.5px solid var(--color-teal)"
                  : "1.5px solid rgba(255,255,255,0.1)",
                boxShadow: isSelected
                  ? "0 0 0 3px rgba(0,184,169,0.2), 0 16px 36px rgba(0,0,0,0.28)"
                  : "0 4px 16px rgba(0,0,0,0.15)",
                transform: isSelected ? "translateY(-4px) scale(1.02)" : "none",
              }}
            >
              {/* Check mark */}
              {isSelected && (
                <div
                  className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] font-extrabold"
                  style={{ background: "var(--color-teal)", color: "var(--color-navy)" }}
                >
                  ✓
                </div>
              )}
              {/* Super Admin badge for admin card */}
              {u.badge && (
                <div
                  className="absolute top-3.5 left-3.5 text-[0.55rem] font-extrabold uppercase px-[7px] py-0.5 rounded-full"
                  style={{
                    color: "#a78bfa",
                    background: "rgba(124,58,237,0.15)",
                    border: "1px solid rgba(124,58,237,0.3)",
                    letterSpacing: "0.12em",
                  }}
                >
                  {u.badge}
                </div>
              )}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[1.3rem] mb-3.5"
                style={{
                  background: a.icon,
                  marginTop: u.badge ? "18px" : undefined,
                }}
              >
                {u.icon}
              </div>
              <div
                className="text-[0.65rem] font-bold uppercase mb-1"
                style={{ color: a.text, letterSpacing: "0.12em" }}
              >
                {u.type}
              </div>
              <div className="font-display text-[1rem] font-extrabold text-white mb-0.5">
                {u.name}
              </div>
              <div
                className="text-[0.75rem] font-medium mb-2.5"
                style={{ color: a.company }}
              >
                {u.company}
              </div>
              <div className="text-[0.72rem] text-white/35 leading-[1.55]">
                {u.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Login form */}
      <div
        className="w-full max-w-[420px] rounded-[20px] px-8 py-7"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <div className="font-display text-[1rem] font-extrabold text-white mb-1">
          {user.loginTitle}{" "}
          <span
            className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[0.65rem] font-bold ml-2 align-middle"
            style={{
              background: "rgba(0,184,169,0.12)",
              border: "1px solid rgba(0,184,169,0.2)",
              color: "var(--color-teal)",
            }}
          >
            Demo
          </span>
        </div>
        <div className="text-[0.78rem] text-white/40 mb-5">{user.loginSub}</div>

        <LoginField label="Email" value={user.email} type="email" />
        <LoginField label="Password" value="demo1234" type="password" />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3.5 rounded-[10px] font-display font-extrabold text-[1rem] mt-1 transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "var(--color-teal)",
            color: "var(--color-navy)",
            letterSpacing: "-0.01em",
            boxShadow: "0 8px 24px rgba(0,184,169,0.3)",
          }}
        >
          {loading ? "Signing in…" : user.cta}
        </button>

        {error && (
          <div
            className="mt-3 text-[0.78rem] rounded-[8px] px-3 py-2"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <p className="text-center text-[0.7rem] text-white/20 mt-5 max-w-[420px] leading-relaxed">
        This is an interactive prototype for demonstration purposes.
        <br />
        Credentials are pre-filled. No real data is stored or transmitted.
      </p>
    </div>
  );
}

function LoginField({ label, value, type }) {
  return (
    <div className="mb-3.5">
      <label
        className="block text-[0.72rem] font-bold text-white/50 uppercase mb-1.5"
        style={{ letterSpacing: "0.08em" }}
      >
        {label}
      </label>
      <input
        type={type}
        defaultValue={value}
        readOnly
        className="w-full px-3.5 py-2.5 rounded-[10px] text-[0.88rem] font-body text-white outline-none transition-colors"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1.5px solid rgba(255,255,255,0.12)",
        }}
      />
    </div>
  );
}
