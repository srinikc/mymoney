"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ArrowLeft, Save, Mic, Info } from "lucide-react"
import Link from "next/link"

const DEFAULT_PHRASE = "Hey MyMoney"

export default function WakeWordSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [phrase, setPhrase] = useState(DEFAULT_PHRASE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isAdmin = (session?.user as Record<string, unknown> | undefined)?.role === "admin"

  useEffect(() => {
    if (status === "loading") return
    if (status !== "authenticated" || !isAdmin) {
      router.replace("/settings")
      return
    }
    fetch("/api/admin/wake-word")
      .then((r) => r.json())
      .then((data) => {
        if (data.phrase) setPhrase(data.phrase)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status, isAdmin, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/wake-word", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to update wake word")
        return
      }
      toast.success("Wake word updated! All users will use this phrase on their next page load.")
    } catch {
      toast.error("Failed to update wake word")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Mic className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Wake Word</h1>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure the wake word phrase that activates voice listening. This applies to ALL users globally.
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Wake Word Phrase</CardTitle>
          <CardDescription>
            The phrase users say to activate the assistant. Default: &quot;{DEFAULT_PHRASE}&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={DEFAULT_PHRASE}
              className="max-w-md"
            />
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p>Supported characters: letters (a-z, A-Z), numbers (0-9), and spaces.</p>
              <p className="mt-1">The speech model must recognize all words in the phrase. Keep it short (2-3 words) for best accuracy.</p>
              <p className="mt-1">Examples: &quot;Hey MyMoney&quot;, &quot;Hello Finance&quot;, &quot;OK Assistant&quot;</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. The wake word runs entirely in the browser using Sherpa-ONNX WASM (no audio leaves the device).</p>
          <p>2. When a user says the phrase, the assistant panel opens automatically.</p>
          <p>3. Users can also toggle wake word on/off via the mic button above the assistant FAB.</p>
          <p>4. Changing the phrase here updates it for ALL users on their next page load.</p>
        </CardContent>
      </Card>
    </div>
  )
}
