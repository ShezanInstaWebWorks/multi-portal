"use client";

import { useState } from "react";
import { RequestForm } from "./RequestForm";

// Lets super admin initiate a project request on behalf of a direct client.
// Picks the target direct client first, then opens the shared RequestForm with
// `defaultDirectClientUserId` set — the API already accepts admin-initiated
// direct requests via that param.
export function AdminNewDirectRequestPanel({ directClients = [], services = [], packages = [] }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  if (directClients.length === 0) {
    return null; // nothing to invite-to; hide the panel entirely
  }

  return (
    <section
      className="bg-white border border-border rounded-[12px] p-4 sm:p-5 shadow-sm"
      style={{ borderLeft: "4px solid var(--color-adm, #7c3aed)" }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-display font-extrabold text-dark text-[0.95rem]">
            🛡 Initiate a request for a direct client
          </div>
          <p className="text-[0.78rem] text-muted mt-0.5">
            File a new project request on behalf of a direct client. They'll see it in their
            inbox and can accept or counter.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[0.82rem] font-semibold text-white"
            style={{ background: "var(--color-adm, #7c3aed)" }}
          >
            + New request
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[0.72rem] font-bold uppercase text-muted" style={{ letterSpacing: "0.08em" }}>
              Direct client
            </span>
            <select
              className="input"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— Pick a direct client —</option>
              {directClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {selectedId ? (
            <RequestForm
              services={services}
              packages={packages}
              showCost
              defaultDirectClientUserId={selectedId}
              compact
              onCreated={() => {
                setOpen(false);
                setSelectedId("");
              }}
            />
          ) : (
            <p className="text-[0.78rem] text-muted">
              Pick a direct client above to open the request form.
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={() => { setOpen(false); setSelectedId(""); }}
              className="text-[0.78rem] text-muted hover:text-dark underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
