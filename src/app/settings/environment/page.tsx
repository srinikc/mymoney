"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ArrowLeft, Save, Server, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

interface EnvVar {
  value?: string
  envValue?: string
}

interface EnvDefinition {
  key: string
  label: string
  sensitive: boolean
  editable: boolean
  description: string
}

export default function EnvironmentSettingsPage() {
  const [vars, setVars] = useState<Record<string, EnvVar>>({})
  const [definitions, setDefinitions] = useState<EnvDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/settings/environment")
      .then((r) => r.json())
      .then((data) => {
        setVars(data.vars || {})
        setDefinitions(data.definitions || [])
        const ov: Record<string, string> = {}
        for (const d of data.definitions || []) {
          if (d.editable) ov[d.key] = data.vars[d.key]?.value || ""
        }
        setOverrides(ov)
      })
      .catch(() => setDefinitions([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/environment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vars: overrides }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("Environment overrides saved!")
    } catch {
      toast.error("Failed to save environment overrides")
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
          <Server className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Environment</h1>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Overrides"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        View and override environment configuration. Boot-critical values can only be set via <code className="bg-muted px-1 rounded">.env</code> file. Non-sensitive values can be overridden here.
      </p>

      <div className="grid gap-4">
        {definitions.map((def) => {
          const info = vars[def.key] || {}
          const isOverridden = overrides[def.key] !== undefined && overrides[def.key] !== info.envValue
          return (
            <Card key={def.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-mono">{def.label}</CardTitle>
                    <CardDescription>{def.description}</CardDescription>
                  </div>
                  <Badge variant={def.editable ? "secondary" : "outline"} className="text-xs">
                    {def.editable ? "Overridable" : "Boot only"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {def.editable ? (
                  <div className="relative">
                    <Input
                      type={def.sensitive && !visible[def.key] ? "password" : "text"}
                      value={overrides[def.key] || ""}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, [def.key]: e.target.value }))}
                      placeholder={`From .env: ${def.sensitive ? "********" : info.envValue || "not set"}`}
                      className="pr-10"
                    />
                    {def.sensitive && (
                      <button type="button" onClick={() => setVisible((prev) => ({ ...prev, [def.key]: !prev[def.key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {visible[def.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <code className="bg-muted px-2 py-0.5 rounded text-xs">
                      {def.sensitive ? "********" : info.value || "not set"}
                    </code>
                    {isOverridden && <Badge variant="secondary" className="text-[10px]">DB override active</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
