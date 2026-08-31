"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Save, Loader2, User, Globe, Calendar, IndianRupee, Briefcase } from "lucide-react"
import {
  SUPPORTED_LANGUAGES,
  OCCUPATIONS,
  monthYearFromDate,
} from "@/shared/profile-validation"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface ProfileData {
  id: number
  name: string
  isDefault: boolean
  dateOfBirth: string | null
  annualIncome: number | null
  occupation: string | null
  language: string
  age: number | null
}

export default function ProfileSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<ProfileData | null>(null)
  const [incomeMode, setIncomeMode] = useState<"yearly" | "monthly">("yearly")
  const [incomeDisplay, setIncomeDisplay] = useState<string>("")
  const [dobMonth, setDobMonth] = useState<string>("")
  const [dobYear, setDobYear] = useState<string>("")

  const sessionProfileId = (session?.user as unknown as { profileId?: number } | undefined)?.profileId

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      router.push("/login")
      return
    }
    if (!sessionProfileId) return
    void load()
  }, [status, session, sessionProfileId, router])

  async function load() {
    if (!sessionProfileId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/profiles/${sessionProfileId}`)
      if (!res.ok) throw new Error("Failed to load profile")
      const profile: ProfileData = await res.json()
      setData(profile)
      setIncomeDisplay(
        profile.annualIncome != null
          ? String(profile.annualIncome)
          : "",
      )
      const my = monthYearFromDate(profile.dateOfBirth ? new Date(profile.dateOfBirth) : null)
      setDobMonth(my ? String(my.month) : "")
      setDobYear(my ? String(my.year) : "")
    } catch (e) {
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!data || !sessionProfileId) return
    setSaving(true)
    try {
      const incomeValue = incomeDisplay ? Number(incomeDisplay) : null
      if (incomeValue != null && (Number.isNaN(incomeValue) || incomeValue < 0)) {
        toast.error("Income must be a positive number")
        setSaving(false)
        return
      }
      const annualIncome = incomeMode === "monthly" && incomeValue != null
        ? Math.round(incomeValue * 12 * 100) / 100
        : incomeValue
      const dobPayload =
        dobMonth && dobYear
          ? { month: Number(dobMonth), year: Number(dobYear) }
          : null
      const res = await fetch(`/api/profiles/${sessionProfileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          isDefault: data.isDefault,
          annualIncome,
          occupation: data.occupation,
          language: data.language,
          dateOfBirth: dobPayload,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Save failed")
      }
      const updated: ProfileData = await res.json()
      setData(updated)
      setIncomeDisplay(updated.annualIncome != null ? String(updated.annualIncome) : "")
      toast.success("Profile saved")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 100 }, (_, i) => currentYear - i)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-7 w-7" /> Profile Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Your personal info drives age-based tips, budget recommendations, and language preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" /> Basic Info
          </CardTitle>
          <CardDescription>Profile name and default status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Profile Name</Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              placeholder="e.g. Personal, Family, Business"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" /> Date of Birth
          </CardTitle>
          <CardDescription>Used to deliver age-appropriate money tips</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dob-month">Month</Label>
              <Select value={dobMonth} onValueChange={setDobMonth}>
                <SelectTrigger id="dob-month">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob-year">Year</Label>
              <Select value={dobYear} onValueChange={setDobYear}>
                <SelectTrigger id="dob-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {data.age != null && (
            <p className="text-sm text-muted-foreground">
              Current age: <span className="font-medium text-foreground">{data.age}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IndianRupee className="h-5 w-5" /> Annual Income
          </CardTitle>
          <CardDescription>
            Used for budget allocation (50/30/20 etc) and income-based tips. Auto-syncs from your{" "}
            <a href="/income" className="text-primary underline">Income Sources</a> page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={incomeMode === "yearly" ? "font-medium" : "text-muted-foreground"}>Yearly</span>
            <button
              type="button"
              role="switch"
              aria-checked={incomeMode === "monthly"}
              onClick={() => {
                if (!incomeDisplay) {
                  setIncomeMode(incomeMode === "yearly" ? "monthly" : "yearly")
                  return
                }
                const v = Number(incomeDisplay)
                if (Number.isNaN(v)) {
                  setIncomeMode(incomeMode === "yearly" ? "monthly" : "yearly")
                  return
                }
                if (incomeMode === "yearly") {
                  setIncomeDisplay(String(Math.round((v / 12) * 100) / 100))
                  setIncomeMode("monthly")
                } else {
                  setIncomeDisplay(String(Math.round(v * 12 * 100) / 100))
                  setIncomeMode("yearly")
                }
              }}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-muted-foreground/30"
              style={{
                backgroundColor: incomeMode === "monthly" ? "rgb(99 102 241)" : undefined,
              }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                style={{
                  transform: incomeMode === "monthly" ? "translateX(18px)" : "translateX(2px)",
                }}
              />
            </button>
            <span className={incomeMode === "monthly" ? "font-medium" : "text-muted-foreground"}>Monthly</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="income">
              {incomeMode === "yearly" ? "Annual Income" : "Monthly Income"} (₹)
            </Label>
            <Input
              id="income"
              type="number"
              min={0}
              step={incomeMode === "monthly" ? "100" : "1000"}
              value={incomeDisplay}
              onChange={(e) => setIncomeDisplay(e.target.value)}
              placeholder={incomeMode === "yearly" ? "e.g. 1200000" : "e.g. 100000"}
            />
            {incomeDisplay && (
              <p className="text-xs text-muted-foreground">
                ≈ ₹
                {incomeMode === "yearly"
                  ? `${Math.round((Number(incomeDisplay) / 12) * 100) / 100}/month`
                  : `${Math.round(Number(incomeDisplay) * 12 * 100) / 100}/year`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5" /> Occupation
          </CardTitle>
          <CardDescription>Tailors tips to your work style</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={data.occupation ?? ""}
            onValueChange={(v) => setData({ ...data, occupation: v || null })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select occupation" />
            </SelectTrigger>
            <SelectContent>
              {OCCUPATIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" /> Language
          </CardTitle>
          <CardDescription>Interface language (English content shown for all in v1)</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={data.language}
            onValueChange={(v) => setData({ ...data, language: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={() => void load()} disabled={saving}>
          Reset
        </Button>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
