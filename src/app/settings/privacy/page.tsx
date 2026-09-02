"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Save, Loader2, Sparkles, TrendingUp, Eye, Target } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface ConsentValue {
  showPersonalizedRecs: boolean
  showDisplayAds: boolean
  personalizedTargeting: boolean
  frequencyCap: number
  consentAcceptedAt: string | null
  welcomeDismissed: boolean
}

const DEFAULTS: ConsentValue = {
  showPersonalizedRecs: true,
  showDisplayAds: true,
  personalizedTargeting: false,
  frequencyCap: 2,
  consentAcceptedAt: null,
  welcomeDismissed: false,
}

export default function AdPreferencesPage() {
  const [prefs, setPrefs] = useState<ConsentValue>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/user/ad-preferences")
        if (res.ok) {
          const data = (await res.json()) as ConsentValue
          setPrefs(data)
        }
      } catch {
        // use defaults
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/user/ad-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      })
      if (res.ok) {
        toast.success("Preferences saved")
        const data = (await res.json()) as ConsentValue
        setPrefs(data)
      } else {
        toast.error("Failed to save preferences")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Privacy & Ad Preferences</h1>
        <p className="text-muted-foreground mt-1">Control how ads and personalized recommendations work for you.</p>
      </div>

      <Card data-testid="ad-prefs-section">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Personalized Recommendations
          </CardTitle>
          <CardDescription>
            Curated mutual funds, today&apos;s best loan rates, and deals from brands you use. These are carefully selected to help you make better money decisions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              checked={prefs.showPersonalizedRecs}
              onChange={(e) => setPrefs({ ...prefs, showPersonalizedRecs: e.target.checked })}
              className="mt-0.5"
              data-testid="toggle-personalized-recs"
            />
            <div>
              <p className="font-medium text-sm">Show personalized recommendations</p>
              <p className="text-xs text-muted-foreground">
                Top mutual funds, loan offers, and deals curated for your profile (age, income, goals). Free users get this by default.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      <Card data-testid="ad-prefs-section">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" /> Display Advertisements
          </CardTitle>
          <CardDescription>
            Banners and cards from Google AdSense, InMobi, and Adgebra. Some placements are affiliate partnerships.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              checked={prefs.showDisplayAds}
              onChange={(e) => setPrefs({ ...prefs, showDisplayAds: e.target.checked })}
              className="mt-0.5"
              data-testid="toggle-display-ads"
            />
            <div>
              <p className="font-medium text-sm">Show display ads</p>
              <p className="text-xs text-muted-foreground">
                Contextual ads on dashboard, investments, loans, assets, subscriptions, and learn pages.
                Pro/Enterprise users get this disabled by default.
              </p>
            </div>
          </label>

          <div className="pl-3 border-l-2 space-y-2">
            <label className="flex items-start gap-3 p-2 cursor-pointer hover:bg-muted/20 rounded">
              <input
                type="checkbox"
                checked={prefs.personalizedTargeting}
                onChange={(e) => setPrefs({ ...prefs, personalizedTargeting: e.target.checked })}
                className="mt-0.5"
                data-testid="toggle-personalized-targeting"
              />
              <div>
                <p className="text-sm flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Allow personalized ad targeting
                  <Badge variant="outline" className="text-[10px] h-4">Optional</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Ad networks use your browsing history to show more relevant ads. Disabling means ads are contextual only.
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 p-4 border rounded-md bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-emerald-600" />
          <span>
            Your preferences are stored in your account. Changes apply immediately.
          </span>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="save-prefs">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save preferences
        </Button>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          We never sell your personal financial data. Ad partners only see anonymized usage signals.
        </p>
        <p>
          <Link href="/privacy" className="underline hover:text-foreground">
            Read our full privacy policy →
          </Link>
        </p>
      </div>
    </div>
  )
}
