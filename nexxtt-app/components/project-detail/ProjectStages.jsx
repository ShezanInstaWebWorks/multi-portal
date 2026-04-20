// Per-service stage flow. Each stage has an index — the current stage lights
// up teal, earlier ones show a green check, later ones are muted.

const FLOWS = {
  "website-design": [
    { key: "brief_pending",        label: "Brief submitted",   desc: "Your requirements are locked in." },
    { key: "in_progress",           label: "Wireframes",         desc: "Structure + layout being drawn up." },
    { key: "in_progress_design",   label: "Visual design",      desc: "Applying brand + finessing pages." },
    { key: "in_review",              label: "Client review",      desc: "You review the live prototype." },
    { key: "revision_requested",    label: "Revisions",          desc: "Addressing your feedback." },
    { key: "delivered",              label: "Delivered",          desc: "Code + handover package ready." },
  ],
  "logo-design": [
    { key: "brief_pending",         label: "Brief submitted",    desc: "Direction + inspo captured." },
    { key: "in_progress",            label: "3 concepts",          desc: "Designer drafting directions." },
    { key: "in_review",               label: "Choose concept",      desc: "You pick your favourite." },
    { key: "revision_requested",     label: "Refinement",          desc: "Variations + polishing." },
    { key: "delivered",               label: "Delivered",           desc: "All files & usage guide." },
  ],
  "brand-guidelines": [
    { key: "brief_pending",         label: "Brief submitted",    desc: "Brand inputs locked in." },
    { key: "in_progress",            label: "Moodboard",           desc: "Directional mood + references." },
    { key: "in_review",               label: "System review",       desc: "Full system for your sign-off." },
    { key: "revision_requested",     label: "Tweaks",              desc: "Small adjustments." },
    { key: "delivered",               label: "Delivered",           desc: "Full brand bible PDF." },
  ],
  "social-media-pack": [
    { key: "brief_pending",         label: "Brief submitted",    desc: "Voice + platforms captured." },
    { key: "in_progress",            label: "Drafting posts",      desc: "Calendar + creative in production." },
    { key: "in_review",               label: "Your approval",       desc: "Review & approve upcoming posts." },
    { key: "revision_requested",     label: "Revisions",           desc: "Addressing feedback." },
    { key: "delivered",               label: "Published",           desc: "Posts scheduled & live." },
  ],
  "content-writing": [
    { key: "brief_pending",         label: "Brief submitted",    desc: "Topics + voice confirmed." },
    { key: "in_progress",            label: "Drafting",            desc: "Writer working on articles." },
    { key: "in_review",               label: "Your review",         desc: "Review drafts + send feedback." },
    { key: "revision_requested",     label: "Edits",               desc: "Applying your changes." },
    { key: "delivered",               label: "Delivered",           desc: "Final copy + SEO-ready." },
  ],
};

function flowFor(slug) {
  return FLOWS[slug] ?? FLOWS["website-design"];
}

function currentIndex(flow, status) {
  const i = flow.findIndex((s) => s.key === status);
  return i >= 0 ? i : 0;
}

export function ProjectStages({ serviceSlug, status }) {
  const flow = flowFor(serviceSlug);
  const cur = currentIndex(flow, status);

  return (
    <ol className="relative pl-0">
      {flow.map((stage, i) => {
        const state = i < cur ? "done" : i === cur ? "current" : "pending";
        return (
          <li
            key={stage.key + i}
            className="relative pl-10 pb-5 last:pb-0"
            style={{
              borderLeft: i < flow.length - 1 ? "2px solid var(--color-border)" : "2px solid transparent",
              marginLeft: 11,
            }}
          >
            <div
              className="absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-extrabold border-2 border-white"
              style={
                state === "done"
                  ? { background: "var(--color-teal)", color: "white", boxShadow: "0 2px 8px rgba(0,184,169,0.3)" }
                  : state === "current"
                  ? { background: "var(--color-navy)", color: "white", boxShadow: "0 0 0 4px rgba(11,31,58,0.1), 0 2px 8px rgba(11,31,58,0.25)" }
                  : { background: "var(--color-lg)", color: "var(--color-muted)" }
              }
            >
              {state === "done" ? "✓" : i + 1}
            </div>
            <div
              className={`font-semibold text-[0.88rem] ${
                state === "done"    ? "text-teal"  :
                state === "current" ? "text-dark"  :
                                      "text-muted"
              }`}
            >
              {stage.label}
              {state === "current" && (
                <span
                  className="ml-2 inline-flex items-center px-1.5 py-[1px] rounded-full text-[0.58rem] font-extrabold align-middle"
                  style={{
                    background: "rgba(11,31,58,0.08)",
                    color: "var(--color-navy)",
                    letterSpacing: "0.08em",
                  }}
                >
                  NOW
                </span>
              )}
            </div>
            <div className="text-[0.75rem] text-muted mt-0.5">{stage.desc}</div>
          </li>
        );
      })}
    </ol>
  );
}

// Progress 0–100 given a status + service slug.
export function progressPct(serviceSlug, status) {
  if (status === "delivered") return 100;
  const flow = flowFor(serviceSlug);
  const i = currentIndex(flow, status);
  return Math.round((i / (flow.length - 1)) * 100);
}
