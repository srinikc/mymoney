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

interface LLMModelOption { value: string; label: string }
interface LLMProviderOption {
  value: string
  label: string
  apiKeyField: string
  baseUrl: string
  defaultModel: string
  models: LLMModelOption[]
  description: string
}

const KEY_FIELDS: KeyField[] = [
  { key: "LLM_PROVIDER", label: "LLM Provider", type: "select", description: "Choose the AI provider. Base URL and model suggestions auto-fill for each." },
  { key: "LLM_MODEL", label: "LLM Model", type: "text", description: "Pick from the list or type any model ID." },
  { key: "OPENAI_API_KEY", label: "OpenAI-compatible API Key", type: "password", description: "Used for OpenAI, Groq, Cerebras, OpenRouter, DeepSeek, Mistral, Gemini, Together, DeepInfra, xAI" },
  { key: "ANTHROPIC_API_KEY", label: "Anthropic API Key", type: "password", description: "Required if using Claude as LLM provider" },
  { key: "OPENCODE_API_KEY", label: "OpenCode Zen API Key", type: "password", description: "Required for the OpenCode Zen gateway. Get one at opencode.ai/auth" },
  { key: "LLM_BASE_URL", label: "LLM Base URL", type: "text", description: "Auto-filled when you pick a provider. Leave empty for OpenAI.com or Claude native." },
  { key: "LOCAL_LLM_ENDPOINT", label: "Local LLM Endpoint", type: "text", description: "e.g. http://localhost:11434/v1 (Ollama) or http://localhost:1234/v1 (LM Studio)" },
  { key: "AUTH_RESEND_KEY", label: "Resend API Key", type: "password", description: "For sending welcome emails and magic links via resend.com" },
]

export default function ApiKeysSettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [providers, setProviders] = useState<LLMProviderOption[]>([])

  useEffect(() => {
    fetch("/api/settings/api-keys")
      .then((r) => {
        if (r.status === 401 || r.status === 404) {
          window.location.href = `/login?callbackUrl=/settings/api-keys`
          throw new Error("unauthorized")
        }
        return r.json()
      })
      .then((data) => {
        setKeys(data.keys || {})
        setProviders(data.catalog?.providers || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const setKey = (key: string, value: string) => setKeys((prev) => ({ ...prev, [key]: value }))

  const handleProviderChange = (value: string) => {
    const prov = providers.find((p) => p.value === value)
    const next: Record<string, string> = { ...keys, LLM_PROVIDER: value }
    if (prov) {
      next.LLM_MODEL = prov.defaultModel
      // Always set base URL (even empty) so switching providers clears
      // any stale URL from the previous provider.
      next.LLM_BASE_URL = prov.baseUrl
    }
    setKeys(next)
  }

  const currentProvider = providers.find((p) => p.value === (keys.LLM_PROVIDER || "openai"))
  const modelOptions = currentProvider?.models || []
  const isCustomModel = !!keys.LLM_MODEL && !modelOptions.some((m) => m.value === keys.LLM_MODEL)

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
                <div className="space-y-2">
                  <Select value={keys[field.key] || "openai"} onValueChange={handleProviderChange}>
                    <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentProvider && (
                    <p className="text-xs text-muted-foreground">{currentProvider.description}</p>
                  )}
                </div>
              ) : field.key === "LLM_MODEL" ? (
                <div className="space-y-2">
                  {isCustomModel ? (
                    <div className="relative">
                      <Input
                        value={keys[field.key] || ""}
                        onChange={(e) => setKey(field.key, e.target.value)}
                        placeholder="Type a custom model ID"
                        className="pr-24"
                      />
                      <button
                        type="button"
                        onClick={() => setKey(field.key, modelOptions[0]?.value || "")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground underline"
                      >
                        Back to list
                      </button>
                    </div>
                  ) : (
                    <Select value={keys[field.key] || ""} onValueChange={(v) => setKey(field.key, v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select a model" /></SelectTrigger>
                      <SelectContent className="max-h-80">
                        {modelOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {modelOptions.length} models available for this provider. {isCustomModel ? "Custom model selected." : "Pick one or clear to keep default."}
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type={field.type === "password" && !visible[field.key] ? "password" : "text"}
                    value={keys[field.key] || ""}
                    onChange={(e) => setKey(field.key, e.target.value)}
                    placeholder="Not configured"
                    className="pr-10"
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      onClick={() => setVisible((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {visible[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
