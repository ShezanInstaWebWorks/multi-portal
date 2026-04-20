"use client";

import { create } from "zustand";

export const useAdminStore = create((set) => ({
  impersonating: null,
  setImpersonating: (v) => set({ impersonating: v }),
  clearImpersonation: () => set({ impersonating: null }),
}));
