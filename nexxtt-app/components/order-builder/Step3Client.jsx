"use client";

import Link from "next/link";

export function Step3Client({ clients, draft, setDraft }) {
  function pick(clientId) {
    setDraft((d) => ({ ...d, clientId }));
  }

  return (
    <div>
      <h2 className="font-display text-[1.25rem] font-extrabold text-dark mb-1">
        Who is this for?
      </h2>
      <p className="text-sm text-muted mb-6">
        Pick one of your clients — they&apos;ll see the white-label view.
      </p>

      {clients.length === 0 ? (
        <div className="bg-white border border-border rounded-[16px] p-10 text-center shadow-sm">
          <div className="text-4xl mb-3 opacity-30">👥</div>
          <h3 className="font-display font-bold text-dark text-lg mb-1.5">
            No clients yet
          </h3>
          <p className="text-muted text-sm mb-5 max-w-sm mx-auto">
            Add a client first — they&apos;ll be able to see their branded
            portal.
          </p>
          <Link
            href="/agency/clients/invite"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white"
            style={{
              background: "var(--color-teal)",
              boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
            }}
          >
            + Invite client
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {clients.map((c) => {
            const selected = draft.clientId === c.id;
            const initials = c.business_name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join("");
            return (
              <div
                key={c.id}
                onClick={() => pick(c.id)}
                className="cursor-pointer bg-white rounded-[16px] p-5 transition-all hover:-translate-y-0.5"
                style={{
                  border: selected
                    ? "1.5px solid var(--color-teal)"
                    : "1.5px solid var(--color-border)",
                  boxShadow: selected
                    ? "0 4px 20px rgba(0,184,169,0.18)"
                    : "0 1px 4px rgba(11,31,58,0.06)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-[0.85rem] font-extrabold shrink-0"
                    style={{
                      background: "var(--color-teal-pale)",
                      color: "var(--color-teal)",
                    }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-extrabold text-dark truncate">
                      {c.business_name}
                    </div>
                    <div className="text-[0.78rem] text-muted truncate">
                      {c.contact_name}
                    </div>
                    <div className="text-[0.72rem] text-muted truncate">
                      {c.contact_email}
                    </div>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: selected ? "var(--color-teal)" : "transparent",
                      border: selected
                        ? "2px solid var(--color-teal)"
                        : "2px solid var(--color-border)",
                      color: selected ? "white" : "transparent",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                    }}
                  >
                    {selected && "✓"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
