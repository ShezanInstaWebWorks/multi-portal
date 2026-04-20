import { Suspense } from "react";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { DashboardA } from "@/components/dashboard/DashboardA";
import { DashboardB } from "@/components/dashboard/DashboardB";
import { DashboardC } from "@/components/dashboard/DashboardC";
import { DashboardD } from "@/components/dashboard/DashboardD";

export const metadata = {
  title: "Dashboard · nexxtt.io",
  robots: "noindex, nofollow",
};

const VARIANTS = { A: DashboardA, B: DashboardB, C: DashboardC, D: DashboardD };

export default async function DashboardPage({ searchParams }) {
  const resolved = (await searchParams) ?? {};
  const v = typeof resolved.v === "string" ? resolved.v : "A";
  const Component = VARIANTS[v] ?? DashboardA;

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title="Dashboard" showSwitcher />
      </Suspense>
      <main id="main-content" className="flex-1">
        <Component />
      </main>
    </>
  );
}
