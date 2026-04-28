"use client";

import { create } from "zustand";

export const useClientPortalStore = create((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}));
