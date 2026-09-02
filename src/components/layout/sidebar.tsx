"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import type { AuthUser } from "@/lib/roles"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  TrendingUp,
  FileText,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Bell,
  Store,
  Upload,
  Gift,
  WalletCards,
  Building2,
  Settings,
  Heart,
  CreditCard,
  Shield,
  Users,
  UserCircle,
  ToggleLeft,
  ScrollText,
  BookOpen,
  Archive,
  IndianRupee,
  Landmark,
  ShieldCheck,
  Percent,
  Plus,
  HelpCircle,
  Link2,
  Mail,
  Server,
  Brain,
} from "lucide-react"
import { useUIStore } from "@/lib/store"
import { ProfileSwitcher } from "./profile-switcher"

const planningItems = [
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
]

const assetsItems = [
  { href: "/assets", label: "Assets", icon: Building2 },
  { href: "/bank-accounts", label: "Bank Accounts", icon: Landmark },
  { href: "/net-worth", label: "Net Worth", icon: WalletCards },
  { href: "/loans", label: "Loans", icon: Landmark },
]

const protectionItems = [
  { href: "/insurance", label: "Insurance", icon: ShieldCheck },
]

const analysisItems = [
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/health", label: "Health", icon: Heart },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/tax", label: "Tax", icon: Percent },
]

const otherItems = [
  { href: "/deals", label: "Deals", icon: Gift },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/family", label: "Family Sharing", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/what-if", label: "What-If", icon: Plus },
  { href: "/guide", label: "Help & Guide", icon: HelpCircle },
]

const adminItems = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/profiles", label: "Profiles", icon: UserCircle },
  { href: "/admin/features", label: "Feature Flags", icon: ToggleLeft },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/admin/ads", label: "Ad Revenue", icon: BarChart3 },
  { href: "/admin/loans", label: "Loan Products", icon: Landmark },
  { href: "/admin/funds", label: "AI Fund Scoring", icon: Brain },
  { href: "/settings/environment", label: "Environment", icon: Server },
  { href: "/setup-guide", label: "Setup Guide", icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const {
    sidebarOpen,
    toggleSidebar,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    incomeExpanded,
    toggleIncomeExpanded,
    planningExpanded,
    togglePlanningExpanded,
    assetsExpanded,
    toggleAssetsExpanded,
    protectionExpanded,
    toggleProtectionExpanded,
    analysisExpanded,
    toggleAnalysisExpanded,
    setIncomeExpanded,
    setPlanningExpanded,
    setAssetsExpanded,
    setProtectionExpanded,
    setAnalysisExpanded,
  } = useUIStore()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const isInExpenses = pathname.startsWith("/expenses") || pathname === "/auto-link" || pathname === "/gmail-import"
  const isInIncome = pathname.startsWith("/income")
  const isInPlanning = (paths: { href: string }[]) => paths.some((p) => pathname.startsWith(p.href))
  const isInAssets = (paths: { href: string }[]) => paths.some((p) => pathname.startsWith(p.href))
  const isInProtection = (paths: { href: string }[]) => paths.some((p) => pathname.startsWith(p.href))
  const isInAnalysis = (paths: { href: string }[]) => paths.some((p) => pathname.startsWith(p.href))

  function CollapsibleGroup({
    icon: Icon,
    label,
    expanded,
    onToggle,
    isActiveGroup,
    items,
  }: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    expanded: boolean
    onToggle: () => void
    isActiveGroup: boolean
    items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]
  }) {
    return (
      <div>
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActiveGroup
              ? "bg-primary/20 text-primary-foreground"
              : "text-white/60 hover:bg-white/10 hover:text-white",
            !sidebarOpen && "justify-center px-2"
          )}
          title={sidebarOpen ? undefined : label}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {sidebarOpen && (
            <>
              <span className="flex-1 text-left">{label}</span>
              {expanded ? (
                <ChevronDown className="h-4 w-4 transition-transform" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform" />
              )}
            </>
          )}
        </button>
        {sidebarOpen && expanded && (
          <div className="ml-2 mt-1 space-y-1 border-l border-white/10 pl-2">
            {items.map((item) => {
              const ItemIcon = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/20 text-primary-foreground"
                      : "text-white/50 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <ItemIcon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname, setMobileSidebarOpen])

  // Auto-expand the section containing the current page
  useEffect(() => {
    if (isInIncome || isInExpenses) setIncomeExpanded(true)
    if (isInPlanning(planningItems)) setPlanningExpanded(true)
    if (isInAssets(assetsItems)) setAssetsExpanded(true)
    if (isInProtection(protectionItems)) setProtectionExpanded(true)
    if (isInAnalysis(analysisItems)) setAnalysisExpanded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16",
          "max-lg:fixed max-lg:left-0 max-lg:top-0 max-lg:h-screen max-lg:transition-transform max-lg:duration-300",
          mobileSidebarOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-white/10 px-4", sidebarOpen ? "justify-between" : "justify-center")}>
          {sidebarOpen && (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                M
              </div>
              <span className="text-lg font-bold">MyMoney</span>
            </Link>
          )}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileSidebarOpen(false)
              } else {
                toggleSidebar()
              }
            }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white",
              !sidebarOpen && "mx-auto"
            )}
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform", !sidebarOpen && "rotate-180")} />
          </button>
        </div>

      <ProfileSwitcher />

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* Dashboard always on top */}
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/"
              ? "bg-primary/20 text-primary-foreground"
              : "text-white/60 hover:bg-white/10 hover:text-white",
            !sidebarOpen && "justify-center px-2"
          )}
          title={sidebarOpen ? undefined : "Dashboard"}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          {sidebarOpen && <span>Dashboard</span>}
        </Link>

        {/* Income / Expenses group */}
        <CollapsibleGroup
          icon={IndianRupee}
          label="Income / Expenses"
          expanded={incomeExpanded}
          onToggle={toggleIncomeExpanded}
          isActiveGroup={isInIncome || isInExpenses}
          items={[
            { href: "/income", label: "Income", icon: IndianRupee },
            { href: "/expenses", label: "All Expenses", icon: Receipt },
            { href: "/expenses/import", label: "Bulk Import", icon: Upload },
            { href: "/expenses/vendors", label: "Vendors", icon: Store },
            { href: "/expenses/archive", label: "Archive", icon: Archive },
            { href: "/auto-link", label: "Auto-Link", icon: Link2 },
            { href: "/gmail-import", label: "Gmail Import", icon: Mail },
          ]}
        />

        {/* Planning & Tracking group */}
        <CollapsibleGroup
          icon={Target}
          label="Planning & Tracking"
          expanded={planningExpanded}
          onToggle={togglePlanningExpanded}
          isActiveGroup={isInPlanning(planningItems)}
          items={planningItems}
        />

        {/* Assets & Liabilities group */}
        <CollapsibleGroup
          icon={Building2}
          label="Assets & Liabilities"
          expanded={assetsExpanded}
          onToggle={toggleAssetsExpanded}
          isActiveGroup={isInAssets(assetsItems)}
          items={assetsItems}
        />

        {/* Protection & Insurance group */}
        <CollapsibleGroup
          icon={Shield}
          label="Protection & Insurance"
          expanded={protectionExpanded}
          onToggle={toggleProtectionExpanded}
          isActiveGroup={isInProtection(protectionItems)}
          items={protectionItems}
        />

        {/* Analysis group */}
        <CollapsibleGroup
          icon={BarChart3}
          label="Analysis"
          expanded={analysisExpanded}
          onToggle={toggleAnalysisExpanded}
          isActiveGroup={isInAnalysis(analysisItems)}
          items={analysisItems}
        />

        {/* Other items */}
        {otherItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/20 text-primary-foreground"
                  : "text-white/60 hover:bg-white/10 hover:text-white",
                !sidebarOpen && "justify-center px-2"
              )}
              title={sidebarOpen ? undefined : item.label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          )
        })}

        {/* Admin Section — only visible to admin users */}
        {(session?.user as AuthUser)?.role === "admin" && (
          <>
          {sidebarOpen && (
            <div className="pt-4">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <Shield className="h-4 w-4 text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">
                  Admin
                </span>
              </div>
            </div>
          )}
          {adminItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-white/60 hover:bg-white/10 hover:text-white",
                !sidebarOpen && "justify-center px-2"
              )}
              title={sidebarOpen ? undefined : item.label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          )
        })}
          </>
        )}
      </nav>

      <div className={cn("border-t border-white/10 p-4 text-xs text-white/40", !sidebarOpen && "p-2 text-center lg:block")}>
        {sidebarOpen ? "MyMoney v1.0" : "v1"}
      </div>
    </aside>
    </>
  )
}
