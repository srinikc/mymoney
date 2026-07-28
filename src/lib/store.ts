import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  sidebarOpen: boolean
  mobileSidebarOpen: boolean
  expensesExpanded: boolean
  incomeExpanded: boolean
  planningExpanded: boolean
  assetsExpanded: boolean
  protectionExpanded: boolean
  analysisExpanded: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void
  toggleExpensesExpanded: () => void
  toggleIncomeExpanded: () => void
  togglePlanningExpanded: () => void
  toggleAssetsExpanded: () => void
  toggleProtectionExpanded: () => void
  toggleAnalysisExpanded: () => void
  setIncomeExpanded: (v: boolean) => void
  setPlanningExpanded: (v: boolean) => void
  setAssetsExpanded: (v: boolean) => void
  setProtectionExpanded: (v: boolean) => void
  setAnalysisExpanded: (v: boolean) => void
  // ── Profile state ──────────────────────────────────────────────
  activeProfileId: number | null
  activeProfileName: string | null
  setActiveProfile: (id: number, name: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      mobileSidebarOpen: false,
      expensesExpanded: false,
      incomeExpanded: false,
      planningExpanded: false,
      assetsExpanded: false,
      protectionExpanded: false,
      analysisExpanded: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      toggleExpensesExpanded: () => set((s) => ({ expensesExpanded: !s.expensesExpanded })),
      toggleIncomeExpanded: () => set((s) => ({ incomeExpanded: !s.incomeExpanded })),
      togglePlanningExpanded: () => set((s) => ({ planningExpanded: !s.planningExpanded })),
      toggleAssetsExpanded: () => set((s) => ({ assetsExpanded: !s.assetsExpanded })),
      toggleProtectionExpanded: () => set((s) => ({ protectionExpanded: !s.protectionExpanded })),
      toggleAnalysisExpanded: () => set((s) => ({ analysisExpanded: !s.analysisExpanded })),
      setIncomeExpanded: (v) => set({ incomeExpanded: v }),
      setPlanningExpanded: (v) => set({ planningExpanded: v }),
      setAssetsExpanded: (v) => set({ assetsExpanded: v }),
      setProtectionExpanded: (v) => set({ protectionExpanded: v }),
      setAnalysisExpanded: (v) => set({ analysisExpanded: v }),
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
