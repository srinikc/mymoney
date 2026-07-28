"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowLeft, Save, Eye, EyeOff, Key } from "lucide-react"
import Link from "next/link"

interface KeyField {
  key: string
  label: string
  type: "password" | "text" | "select"
  options?: { value: string; label: string }[]
  description: string
}

const KEY_FIELDS: KeyField[] = [
  { key: "LLM_PROVIDER", label: "LLM Provider", type: "select", description: "Choose AI provider for the financial advisor chatbot", options: [{ value: "openai", label: "OpenAI" }, { value: "claude", label: "Anthropic Claude" }] },
  { key: "OPENAI_API_KEY", label: "OpenAI API Key", type: "password", description: "Required if using OpenAI as LLM provider" },
  { key: "ANTHROPIC_API_KEY", label: "Anthropic API Key", type: "password", description: "Required if using Claude as LLM provider" },
  { key: "LLM_MODEL", label: "LLM Model", type: "text", description: "e.g. gpt-4o-mini (OpenAI) or claude-3-haiku-20240307 (Claude)" },
  { key: "AUTH_RESEND_KEY", label: "Resend API Key", type: "password", description: "For sending welcome emails and magic links" },
  { key: "ZERODHA_API_KEY", label: "Zerodha API Key", type: "password", description: "For Zerodha Kite API integration" },
  { key: "ZERODHA_API_SECRET", label: "Zerodha API Secret", type: "password", description: "Zerodha Kite API secret" },
  { key: "SHAREKHAN_API_KEY", label: "Sharekhan API Key", type: "password", description: "For Sharekhan API integration" },
  { key: "SHAREKHAN_API_SECRET", label: "Sharekhan API Secret", type: "password", description: "Sharekhan API secret" },
]

export default function ApiKeysSettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/settings/api-keys")
      .then((r) => r.json())
      .then((data) => setKeys(data.keys || {}))
      .catch(() => setKeys({}))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("API keys saved successfully!")
    } catch {
      toast.error("Failed to save API keys")
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
          <Key className="h-6 w-6" />
          <h1 className="text-2xl font-bold">API Keys</h1>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save All"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure API keys for external services. Keys are stored encrypted in the database.
      </p>

      <div className="grid gap-4">
        {KEY_FIELDS.map((field) => (
          <Card key={field.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{field.label}</CardTitle>
              <CardDescription>{field.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {field.type === "select" ? (
                <Select value={keys[field.key] || "openai"} onValueChange={(v) => setKeys((prev) => ({ ...prev, [field.key]: v }))}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {field.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="relative">
                  <Input
                    type={visible[field.key] ? "text" : "password"}
                    value={keys[field.key] || ""}
                    onChange={(e) => setKeys((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder="Not configured"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {visible[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
