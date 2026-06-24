import { create } from "zustand"

interface UIState {
  sidebarOpen: boolean
  expensesExpanded: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleExpensesExpanded: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  expensesExpanded: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleExpensesExpanded: () => set((s) => ({ expensesExpanded: !s.expensesExpanded })),
}))
