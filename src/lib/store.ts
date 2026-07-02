import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  sidebarOpen: boolean
  expensesExpanded: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleExpensesExpanded: () => void
  // ── Profile state ──────────────────────────────────────────────
  activeProfileId: number | null
  activeProfileName: string | null
  setActiveProfile: (id: number, name: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      expensesExpanded: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleExpensesExpanded: () => set((s) => ({ expensesExpanded: !s.expensesExpanded })),
      // ── Profile state ──────────────────────────────────────────
      activeProfileId: null,
      activeProfileName: null,
      setActiveProfile: (id, name) => set({ activeProfileId: id, activeProfileName: name }),
    }),
    {
      name: "mymoney-ui-store",
      partialize: (state) => ({
        activeProfileId: state.activeProfileId,
        activeProfileName: state.activeProfileName,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
