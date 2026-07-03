"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  TrendingUp,
  ClipboardList,
  FileText,
  ChevronLeft,
  ChevronDown,
  BarChart3,
  Bell,
  Store,
  Upload,
  Flag,
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
} from "lucide-react"
import { useUIStore } from "@/lib/store"
import { ProfileSwitcher } from "./profile-switcher"
  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/budgets", label: "Budgets", icon: Wallet },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/investments", label: "Investments", icon: TrendingUp },
    { href: "/plans", label: "Plans", icon: ClipboardList },
    { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
    { href: "/insights", label: "Insights", icon: BarChart3 },
    { href: "/health", label: "Health", icon: Heart },
    { href: "/reminders", label: "Reminders", icon: Bell },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/deals", label: "Deals", icon: Gift },
    { href: "/assets", label: "Assets", icon: Building2 },
    { href: "/net-worth", label: "Net Worth", icon: WalletCards },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  const adminItems = [
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/profiles", label: "Profiles", icon: UserCircle },
    { href: "/admin/features", label: "Feature Flags", icon: ToggleLeft },
    { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  ]

const expenseSubItems = [
  { href: "/expenses", label: "All Expenses", icon: Receipt },
  { href: "/expenses/import", label: "Bulk Import", icon: Upload },
  { href: "/expenses/merchants", label: "Merchants", icon: Store },
  { href: "/expenses/review-duplicates", label: "Review", icon: Flag },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, expensesExpanded, toggleSidebar, toggleExpensesExpanded } = useUIStore()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const isInExpenses = pathname.startsWith("/expenses")

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
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
          onClick={toggleSidebar}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white",
            !sidebarOpen && "mx-auto"
          )}
        >
          <ChevronLeft className={cn("h-5 w-5 transition-transform", !sidebarOpen && "rotate-180")} />
        </button>
      </div>

      {/* Profile Switcher */}


      <ProfileSwitcher />



      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* Dashboard always on top */}
        <Link
          href="/"
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

        {/* Expenses group */}
        <div>
          <button
            onClick={toggleExpensesExpanded}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isInExpenses
                ? "bg-primary/20 text-primary-foreground"
                : "text-white/60 hover:bg-white/10 hover:text-white",
              !sidebarOpen && "justify-center px-2"
            )}
            title={sidebarOpen ? undefined : "Expenses"}
          >
            <Receipt className="h-5 w-5 shrink-0" />
            {sidebarOpen && (
              <>
                <span className="flex-1 text-left">Expenses</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", !expensesExpanded && "-rotate-90")} />
              </>
            )}
          </button>
          {sidebarOpen && expensesExpanded && (
            <div className="ml-2 mt-1 space-y-1 border-l border-white/10 pl-2">
              {expenseSubItems.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/20 text-primary-foreground"
                        : "text-white/50 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Other nav items */}
        {navItems.filter((i) => i.href !== "/").map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
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

        {/* Admin Section */}
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
      </nav>

      <div className={cn("border-t border-white/10 p-4 text-xs text-white/40", !sidebarOpen && "p-2 text-center")}>
        {sidebarOpen ? "MyMoney v1.0" : "v1"}
      </div>
    </aside>
  )
}


