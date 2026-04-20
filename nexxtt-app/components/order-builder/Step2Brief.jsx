"use client";

export function Step2Brief({ selectedServices, draft, setDraft }) {
  function patch(serviceId, patch) {
    setDraft((d) => ({
      ...d,
      briefs: {
        ...d.briefs,
        [serviceId]: { ...(d.briefs[serviceId] ?? {}), ...patch },
      },
    }));
  }

  return (
    <div>
      <h2 className="font-display text-[1.25rem] font-extrabold text-dark mb-1">
        Tell us about the work
      </h2>
      <p className="text-sm text-muted mb-6">
        One brief per service. Business name + goals are enough to start —
        detailed per-service briefs (moodboards, references, uploads) come next
        sprint.
      </p>

      <div className="flex flex-col gap-4">
        {selectedServices.map((s) => {
          const brief = draft.briefs[s.id] ?? {};
          return (
            <div
              key={s.id}
              className="bg-white rounded-[16px] border border-border p-5 shadow-sm"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[1.05rem]"
                  style={{
                    background: "var(--color-teal-pale)",
                    color: "var(--color-teal)",
                  }}
                >
                  {s.icon}
                </div>
                <h3 className="font-display font-extrabold text-[1rem] text-dark">
                  {s.name}
                </h3>
                {s.rush && (
                  <span
                    className="ml-auto inline-flex items-center px-2 py-[2px] rounded-full text-[0.62rem] font-bold"
                    style={{
                      background: "rgba(245,158,11,0.1)",
                      color: "var(--color-amber)",
                      border: "1px solid rgba(245,158,11,0.3)",
                    }}
                  >
                    RUSH
                  </span>
                )}
              </div>

              <Field label="Business name" required>
                <input
                  type="text"
                  value={brief.businessName ?? ""}
                  onChange={(e) => patch(s.id, { businessName: e.target.value })}
                  placeholder="e.g. Coastal Realty"
                  className="w-full rounded-[10px] border border-border px-3.5 py-2.5 outline-none focus:border-teal transition-colors"
                />
              </Field>

              <Field label="Goals & context">
                <textarea
                  value={brief.goals ?? ""}
                  onChange={(e) => patch(s.id, { goals: e.target.value })}
                  rows={4}
                  placeholder="What does success look like? Any constraints, brand references, audience?"
                  className="w-full rounded-[10px] border border-border px-3.5 py-2.5 outline-none focus:border-teal transition-colors resize-y min-h-[96px]"
                />
              </Field>

              <Field label="Reference URLs (one per line)">
                <textarea
                  value={brief.referenceUrls ?? ""}
                  onChange={(e) => patch(s.id, { referenceUrls: e.target.value })}
                  rows={2}
                  placeholder="https://example.com&#10;https://inspo.site"
                  className="w-full rounded-[10px] border border-border px-3.5 py-2.5 outline-none focus:border-teal transition-colors resize-y min-h-[56px] font-mono text-[0.82rem]"
                />
              </Field>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="mb-3.5 last:mb-0">
      <label className="block text-[0.75rem] font-bold text-body mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
