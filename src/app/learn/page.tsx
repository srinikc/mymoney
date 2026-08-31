"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  BookOpen,
  Clock,
  Search,
  ArrowRight,
  Sparkles,
  X,
  Lightbulb,
  Target,
  Wallet,
  TrendingUp,
  PiggyBank,
  FileText,
  Shield,
  CreditCard,
  Umbrella,
  Home,
  LifeBuoy,
  Users,
  Brain,
  ChevronLeft,
  CheckCircle2,
  GraduationCap,
  PiggyBank as Gold,
  BarChart3,
} from "lucide-react"
import {
  AGE_BUCKET_LABEL,
  CATEGORY_LABEL,
  CATEGORY_ICON,
  type LearnTip,
  type TipCategory,
} from "@/shared/learn/tips"
import Link from "next/link"

const ICON_MAP: Record<string, any> = {
  wallet: Wallet,
  "trending-up": TrendingUp,
  "piggy-bank": PiggyBank,
  "file-text": FileText,
  shield: Shield,
  "credit-card": CreditCard,
  umbrella: Umbrella,
  home: Home,
  "life-buoy": LifeBuoy,
  users: Users,
  brain: Brain,
}

const ICON: Record<TipCategory, any> = {
  budgeting: Wallet,
  investing: TrendingUp,
  savings: PiggyBank,
  tax: FileText,
  insurance: Shield,
  debt: CreditCard,
  retirement: Umbrella,
  home: Home,
  emergency: LifeBuoy,
  family: Users,
  mindset: Brain,
}

interface TipsResponse {
  age: number | null
  ageBucket: string | null
  hasDob: boolean
  hasIncome: boolean
  totalAvailable: number
  tips: LearnTip[]
}

export default function LearnHubPage() {
  const [data, setData] = useState<TipsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [activeTip, setActiveTip] = useState<LearnTip | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/learn/tips")
      if (!res.ok) throw new Error("Failed to load tips")
      const json: TipsResponse = await res.json()
      setData(json)
    } catch (e) {
      toast.error("Failed to load learn content")
    } finally {
      setLoading(false)
    }
  }

  const filteredTips = useMemo(() => {
    if (!data) return []
    return data.tips.filter((t) => {
      if (category !== "all" && t.category !== category) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          t.title.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [data, search, category])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (!data) return counts
    for (const t of data.tips) {
      counts[t.category] = (counts[t.category] ?? 0) + 1
    }
    return counts
  }, [data])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Learn</h1>
            <p className="text-sm text-muted-foreground">
              {data.ageBucket
                ? `Personalized for ${AGE_BUCKET_LABEL[data.ageBucket as keyof typeof AGE_BUCKET_LABEL]}`
                : "Money tips tailored to your age and stage"}
            </p>
          </div>
        </div>
        {!data.hasDob && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="py-3 flex items-center gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm">Set your date of birth for age-specific tips.</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/settings/profile">Set DOB</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tips..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories ({data.tips.length})</SelectItem>
            {Object.keys(CATEGORY_LABEL).map((c) => {
              const count = categoryCounts[c] ?? 0
              if (count === 0) return null
              return (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c as TipCategory]} ({count})
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Personalised vs All */}
      <Tabs defaultValue="personalized" className="w-full">
        <TabsList>
          <TabsTrigger value="personalized">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            For you ({data.tips.length})
          </TabsTrigger>
          <TabsTrigger value="explore">
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            Explore all
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Target className="h-3.5 w-3.5 mr-1" />
            Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personalized" className="space-y-3 mt-4">
          {filteredTips.length === 0 ? (
            <EmptyState search={search} category={category} onReset={() => { setSearch(""); setCategory("all") }} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTips.map((tip) => (
                <TipCard key={tip.id} tip={tip} onOpen={() => setActiveTip(tip)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="explore" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ToolCard href="/learn/mutual-funds" icon={TrendingUp} title="Mutual Funds" desc="Browse top 50 Indian MFs, plan SIP, lumpsum, goal-based" />
            <ToolCard href="/learn/commodities" icon={BarChart3} title="Commodities & ETFs" desc="Live gold, silver, and ETF prices with value calculator" />
            <ToolCard href="/learn/etf" icon={BarChart3} title="ETFs" desc="Track Nifty 50, Gold Bees, thematic ETFs" />
            <ToolCard href="/learn/gold" icon={Gold} title="Gold & Silver" desc="Live prices, sovereign bond, digital gold" />
            <ToolCard href="/learn/nps" icon={Umbrella} title="NPS" desc="PFRDA funds, retirement corpus" />
            <ToolCard href="/learn/retirement" icon={Target} title="Retirement" desc="4% rule, corpus calculator, glide path" />
            <ToolCard href="/learn/books" icon={BookOpen} title="Books" desc="Top 10 Indian finance books" />
            <ToolCard href="/learn/books" icon={BookOpen} title="Books" desc="Top 10 Indian finance books" />
            <ToolCard href="/emergency-fund" icon={LifeBuoy} title="Emergency Fund" desc="3-6 month runway planner" />
            <ToolCard href="/learn/tax" icon={FileText} title="Tax" desc="80C, 80D, HRA, NPS deductions" />
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calculators & planners</CardTitle>
              <CardDescription>Built-in tools to plan your money decisions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ToolRow href="/budgets" label="Budget Allocation Wizard" desc="50/30/20 split, age-adaptive, one-click apply" icon={Wallet} />
              <ToolRow href="/emergency-fund" label="Emergency Fund Planner" desc="How much you need, where to keep it" icon={LifeBuoy} />
              <ToolRow href="/learn/mutual-funds" label="SIP Calculator" desc="Project corpus for any monthly amount and tenure" icon={TrendingUp} />
              <ToolRow href="/learn/retirement" label="Retirement Calculator" desc="4% rule, inflation-adjusted corpus need" icon={Target} />
              <ToolRow href="/goals" label="Goal Tracker" desc="Track every financial goal, link to investments" icon={Target} />
              <ToolRow href="/loans" label="Loan Manager" desc="EMI schedule, prepayment impact, goal-linked" icon={CreditCard} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail modal */}
      {activeTip && <TipDetail tip={activeTip} onClose={() => setActiveTip(null)} />}
    </div>
  )
}

function TipCard({ tip, onOpen }: { tip: LearnTip; onOpen: () => void }) {
  const Icon = ICON[tip.category]
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onOpen}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABEL[tip.category]}</Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{tip.readMinutes} min
            </span>
          </div>
        </div>
        <CardTitle className="text-base mt-2">{tip.title}</CardTitle>
        <CardDescription className="text-xs">{tip.summary}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-1 text-xs text-primary font-medium">
          Read <ArrowRight className="h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  )
}

function TipDetail({ tip, onClose }: { tip: LearnTip; onClose: () => void }) {
  const Icon = ICON[tip.category]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-auto animate-in fade-in zoom-in-95 duration-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Badge variant="secondary" className="text-[10px] mb-1">{CATEGORY_LABEL[tip.category]}</Badge>
                <CardTitle className="text-lg">{tip.title}</CardTitle>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">{tip.summary}</p>
          <p className="text-sm leading-relaxed whitespace-pre-line">{tip.body}</p>

          {tip.workflow && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Workflow: {tip.workflow.title}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {tip.workflow.steps.length} steps · ~{tip.workflow.estimatedTime}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {tip.workflow.steps.map((s, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.detail}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground/30 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {tip.ctaHref && tip.ctaLabel && (
            <Button asChild className="w-full">
              <Link href={tip.ctaHref}>
                {tip.ctaLabel} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{tip.readMinutes} min read</span>
            <span className="mx-1">·</span>
            <GraduationCap className="h-3 w-3" />
            <span>For {tip.ageBuckets.map((b) => AGE_BUCKET_LABEL[b]).join(", ")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ToolCard({ href, icon: Icon, title, desc }: { href: string; icon: any; title: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 transition-colors h-full cursor-pointer">
        <CardContent className="p-4 space-y-1">
          <Icon className="h-5 w-5 text-primary" />
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function ToolRow({ href, label, desc, icon: Icon }: { href: string; label: string; desc: string; icon: any }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  )
}

function EmptyState({ search, category, onReset }: { search: string; category: string; onReset: () => void }) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-muted-foreground text-sm">No tips match your filter.</p>
        {(search || category !== "all") && (
          <Button variant="link" onClick={onReset}>Reset filters</Button>
        )}
      </CardContent>
    </Card>
  )
}
