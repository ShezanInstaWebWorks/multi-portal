"use client";

import { useRouter } from "next/navigation";
import { RequestForm } from "./RequestForm";

// Thin wrapper that routes the direct client to /direct/requests after they
// successfully file a new order, so they can see the request + chat about it.
export function DirectNewOrderForm({ services = [], packages = [] }) {
  const router = useRouter();
  return (
    <RequestForm
      services={services}
      packages={packages}
      showCost={false}
      onCreated={() => router.push("/direct/requests")}
    />
  );
}
