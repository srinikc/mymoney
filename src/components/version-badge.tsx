"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

interface VersionData {
  version: string
  major: number | null
  minor: number | null
  patch: number | null
  prerelease: string | null
  buildNumber: string
  buildSha: string
  buildTime: string
  buildEnv: string
  buildBranch: string
  isVercel: boolean
  buildId: string
  fullVersion: string
  versionTag: string
  display: string
  nodeEnv: string
}

export function VersionBadge() {
  const [data, setData] = useState<VersionData | null>(null)

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
  }, [])

  if (!data) return null

  const isProd = data.buildEnv === "production"
  const isPreview = data.buildEnv === "preview" || (data.isVercel && !isProd)
  const isPrerelease = !!data.prerelease

  // Build a link to the commit on GitHub
  const commitUrl = data.buildSha && data.buildSha !== "dev"
    ? `https://github.com/srinikc/mymoney/commit/${data.buildSha}`
    : null

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground" data-testid="version-badge">
      {/* Version badge: e.g. v1.0.0 (alpha) */}
      <Badge
        variant="outline"
        title={`Version ${data.version} · build ${data.buildNumber} · ${data.buildSha}`}
        className={`text-[10px] h-4 px-1.5 ${
          isPrerelease
            ? "border-amber-300 text-amber-700"
            : isProd
            ? "border-emerald-300 text-emerald-700"
            : isPreview
            ? "border-amber-300 text-amber-700"
            : "border-gray-300"
        }`}
      >
        {data.versionTag}{isPrerelease ? ` (${data.prerelease})` : ""}
      </Badge>

      {/* Build number */}
      <span className="font-mono text-[10px]" title={`Build number = git commit count: ${data.buildNumber}`}>
        build {data.buildNumber}
      </span>

      {/* Short commit SHA, clickable to GitHub */}
      {commitUrl ? (
        <a
          href={commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] hover:text-foreground hover:underline"
          title={`Built on ${data.buildBranch || "unknown"} at ${data.buildTime}`}
        >
          {data.buildSha}
        </a>
      ) : (
        <span className="font-mono text-[10px] opacity-50">{data.buildSha}</span>
      )}

      {/* Env tag (only in non-production) */}
      {!isProd && (
        <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-600">
          {data.buildEnv}
        </span>
      )}
    </div>
  )
}
