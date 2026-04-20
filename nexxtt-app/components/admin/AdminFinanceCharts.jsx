"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { formatCents } from "@/lib/money";

export function AdminFinanceCharts({ monthly }) {
  return (
    <section className="bg-white rounded-[16px] border border-border shadow-sm p-5">
      <h2 className="font-display text-[1rem] font-extrabold text-dark mb-1">
        Last 6 months
      </h2>
      <p className="text-[0.78rem] text-muted mb-4">
        GMV vs platform cost base
      </p>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly} barGap={4} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-muted)", fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
            />
            <YAxis
              tickFormatter={(v) => `$${Math.round(v / 100)}`}
              tick={{ fontSize: 10, fill: "var(--color-muted)" }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              formatter={(v) => formatCents(v)}
              contentStyle={{
                background: "white",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                boxShadow: "var(--shadow-md)",
                fontSize: "0.82rem",
              }}
              labelStyle={{ color: "var(--color-dark)", fontWeight: 700 }}
            />
            <Legend
              wrapperStyle={{ fontSize: "0.72rem", color: "var(--color-muted)" }}
              iconType="square"
              iconSize={10}
            />
            <Bar dataKey="gmv"  name="GMV"           fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cost" name="Platform cost" fill="#C4CAD6"            radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
