"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Check, ChevronsUpDown, Plus, Settings, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/lib/store"

interface Profile {
  id: number
  name: string
  isDefault: boolean
  createdAt: string
}

export function ProfileSwitcher() {
  const { data: session } = useSession()
  const { activeProfileId, activeProfileName, setActiveProfile, sidebarOpen } = useUIStore()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentProfileId = activeProfileId ?? (session?.user as { profileId?: number } | undefined)?.profileId ?? null
  const currentProfileName = activeProfileName ?? (session?.user as { profileName?: string } | undefined)?.profileName ?? null

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/profiles")
      if (!res.ok) throw new Error("Failed to fetch profiles")
      const data: Profile[] = await res.json()
      setProfiles(data)
      if (!activeProfileId && data.length > 0) {
        const defaultProfile = data.find((p) => p.isDefault) || data[0]
        setActiveProfile(defaultProfile.id, defaultProfile.name)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [activeProfileId, setActiveProfile])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  useEffect(() => {
    if (showCreate && inputRef.current) inputRef.current.focus()
  }, [showCreate])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
        setShowCreate(false)
        setNewName("")
        setErrorMessage(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSwitch = (profile: Profile) => {
    setActiveProfile(profile.id, profile.name)
    setOpen(false)
  }

  const handleCreate = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    setCreating(true)
    setErrorMessage(null)
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create profile")
      }
      const profile: Profile = await res.json()
      setProfiles((prev) => [...prev, profile])
      setActiveProfile(profile.id, profile.name)
      setShowCreate(false)
      setNewName("")
    } catch (error_) {
      setErrorMessage(error_ instanceof Error ? error_.message : "Failed to create profile")
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleCreate() }
    if (e.key === "Escape") { setShowCreate(false); setNewName(""); setErrorMessage(null) }
  }

  if (!sidebarOpen) {
    return (
      <div className="border-b border-white/10 px-2 py-3">
        <button
          onClick={() => setOpen(!open)}
          className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          title={currentProfileName || "Switch Profile"}
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className="border-b border-white/10 px-3 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/10"
        disabled={loading}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/20 text-xs font-semibold text-primary-foreground">
          {currentProfileName ? currentProfileName.charAt(0).toUpperCase() : "?"}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start text-left">
          <span className="truncate text-sm font-medium text-white">
            {loading ? "Loading..." : currentProfileName || "No Profile"}
          </span>
          <span className="truncate text-xs text-white/40">Profile</span>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/40" />
      </button>

      {open && (
        <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-sidebar p-1 shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
            </div>
          ) : (profiles.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-white/40">No profiles yet</p>
          ) : (
            profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleSwitch(profile)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  profile.id === currentProfileId
                    ? "bg-primary/20 text-primary-foreground"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-medium",
                    profile.id === currentProfileId
                      ? "bg-primary/30 text-primary-foreground"
                      : "bg-white/10 text-white/60"
                  )}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-left">{profile.name}</span>
                {profile.isDefault && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">Default</span>
                )}
                {profile.id === currentProfileId && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary-foreground" />
                )}
              </button>
            ))
          ))}
          <div className="my-1 border-t border-white/10" />

          {showCreate ? (
            <div className="space-y-2 px-1 py-1">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Profile name..."
                className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none"
                maxLength={100}
              />
              {errorMessage && <p className="px-1 text-xs text-red-400">{errorMessage}</p>}
              <div className="flex gap-1">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="flex-1 rounded-md bg-primary/30 px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : "Create"}
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewName(""); setErrorMessage(null) }}
                  className="rounded-md px-2 py-1 text-xs text-white/40 transition-colors hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Plus className="h-4 w-4" />
              <span>New Profile</span>
            </button>
          )}

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Settings className="h-4 w-4" />
            <span>Manage Profiles</span>
          </Link>
        </div>
      )}
    </div>
  )
}
