"use client";

import { create } from "zustand";

export const useAgencyStore = create((set) => ({
  // Agency data
  agency: null,
  balance: 0,
  dashboardVariant: "A",

  setAgency: (agency) => set({ agency }),
  setBalance: (balance) => set({ balance }),
  setDashboardVariant: (v) => set({ dashboardVariant: v }),

  // Order builder state
  orderDraft: { services: [], clientId: null, isRush: false, brief: {} },
  setOrderDraft: (patch) =>
    set((state) => ({ orderDraft: { ...state.orderDraft, ...patch } })),
  clearOrderDraft: () =>
    set({ orderDraft: { services: [], clientId: null, isRush: false, brief: {} } }),

  // UI state
  sidebarOpen: false,
  commandSearchOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setCommandSearchOpen: (v) => set({ commandSearchOpen: v }),
}));
