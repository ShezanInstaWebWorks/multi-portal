"use client";

import { briefFor } from "./briefs";

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
        One brief per service. Each form is tailored to the service so the
        design team has what they need to start immediately.
      </p>

      <div className="flex flex-col gap-4">
        {selectedServices.map((s) => {
          const brief = draft.briefs[s.id] ?? {};
          const BriefComponent = briefFor(s.slug);
          return (
            <div
              key={s.id}
              className="bg-white rounded-[16px] border border-border p-5 shadow-sm"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[1.1rem]"
                  style={{
                    background: "var(--color-teal-pale)",
                    color: "var(--color-teal)",
                  }}
                >
                  {s.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-extrabold text-[1rem] text-dark">
                    {s.name} brief
                  </h3>
                  <div className="text-[0.72rem] text-muted">
                    Tailored questions for this service
                  </div>
                </div>
                {s.rush && (
                  <span
                    className="inline-flex items-center px-2 py-[2px] rounded-full text-[0.62rem] font-bold"
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

              <BriefComponent
                brief={brief}
                set={(p) => patch(s.id, p)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
