"use client";

import { formatCents } from "@/lib/money";

export function Step4Confirm({ selectedServices, totals, agency, clients, draft, error }) {
  const client = clients.find((c) => c.id === draft.clientId);
  const balance = agency?.balance_cents ?? 0;
  const afterBalance = balance - totals.cost;
  const insufficient = afterBalance < 0;

  return (
    <div>
      <h2 className="font-display text-[1.25rem] font-extrabold text-dark mb-1">
        Confirm and place the order
      </h2>
      <p className="text-sm text-muted mb-6">
        Totals are locked in when you place the order — delivery clock starts
        immediately.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Summary */}
        <section className="bg-white rounded-[16px] border border-border p-5 shadow-sm">
          <h3 className="font-display font-bold text-dark mb-4">Order summary</h3>

          <dl className="flex flex-col gap-3 text-sm">
            <Row k="Client">
              {client ? (
                <span className="font-semibold text-dark">
                  {client.business_name}
                </span>
              ) : (
                <span className="text-muted">—</span>
              )}
            </Row>

            <div className="my-2 h-px bg-border" />

            {selectedServices.map((s) => (
              <Row
                key={s.id}
                k={
                  <span className="flex items-center gap-2">
                    <span className="text-base">{s.icon}</span>
                    <span>
                      {s.name}
                      {s.rush && (
                        <span
                          className="ml-2 inline-flex items-center px-1.5 py-[1px] rounded-full text-[0.62rem] font-bold align-middle"
                          style={{
                            background: "rgba(245,158,11,0.1)",
                            color: "var(--color-amber)",
                            border: "1px solid rgba(245,158,11,0.3)",
                          }}
                        >
                          RUSH
                        </span>
                      )}
                    </span>
                  </span>
                }
              >
                <span className="font-bold text-dark">
                  {formatCents(s.cost_cents)}
                </span>
              </Row>
            ))}

            <div className="my-2 h-px bg-border" />

            <Row k={<span className="text-muted">Retail total</span>}>
              <span className="text-muted">{formatCents(totals.retail)}</span>
            </Row>
            <Row k={<span className="text-muted">Cost total</span>}>
              <span className="font-bold text-dark">{formatCents(totals.cost)}</span>
            </Row>
            <Row k={<span className="text-green font-semibold">Your profit</span>}>
              <span className="font-display font-extrabold text-green">
                {formatCents(totals.profit)}
              </span>
            </Row>
          </dl>

          {error && (
            <div
              className="mt-4 rounded-[10px] px-3.5 py-2.5 text-[0.82rem]"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "var(--color-red)",
              }}
            >
              {error}
            </div>
          )}
        </section>

        {/* Balance card */}
        <aside className="bg-white rounded-[16px] border border-border p-5 shadow-sm">
          <div
            className="text-[0.68rem] font-bold uppercase text-muted mb-1.5"
            style={{ letterSpacing: "0.1em" }}
          >
            PAYMENT · BALANCE
          </div>
          <div className="flex items-baseline gap-2 mb-0.5">
            <div className="font-display text-[1.8rem] font-extrabold text-dark leading-none">
              {formatCents(balance)}
            </div>
            <div className="text-[0.78rem] text-muted">available</div>
          </div>
          <div
            className="text-[0.78rem] mt-4 pt-4 border-t border-border"
            style={{ color: insufficient ? "var(--color-red)" : "var(--color-muted)" }}
          >
            {insufficient ? (
              <>
                Insufficient balance. Top up{" "}
                <strong className="text-red">
                  {formatCents(Math.abs(afterBalance))}
                </strong>{" "}
                before placing this order.
              </>
            ) : (
              <>
                After this order:{" "}
                <strong className="text-dark">
                  {formatCents(afterBalance)}
                </strong>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{k}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
