"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Users, UserPlus, UserMinus, Mail, CheckCircle2, Loader2 } from "lucide-react"

interface ProfileOption {
  id: number
  name: string
}

interface SharedMember {
  id: number
  profileId: number
  profile: { name: string }
  invitedEmail: string
  invitedUser?: { name: string; email: string }
  inviter: { name: string; email: string }
  role: string
  status: string
  createdAt: string
}

export default function FamilyPage() {
  const [sent, setSent] = useState<SharedMember[]>([])
  const [received, setReceived] = useState<SharedMember[]>([])
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("viewer")
  const [profileId, setProfileId] = useState("")
  const [inviting, setInviting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [membersRes, profilesRes] = await Promise.all([
        fetch("/api/family/members"),
        fetch("/api/profiles"),
      ])
      const members = await membersRes.json()
      const pData = await profilesRes.json()
      setSent(members.sent || [])
      setReceived(members.received || [])
      setProfiles(Array.isArray(pData) ? pData : pData.profiles || [])
      if (!profileId && pData.length > 0) setProfileId(String(pData[0].id))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleInvite = async () => {
    if (!email || !profileId) { toast.error("Email and profile required"); return }
    setInviting(true)
    try {
      const res = await fetch("/api/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: Number(profileId), email, role }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to invite")
      toast.success("Invitation sent!")
      setEmail("")
      fetchData()
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setInviting(false) }
  }

  const handleAccept = async (inviteId: number) => {
    const res = await fetch("/api/family/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    })
    if (res.ok) { toast.success("Invitation accepted!"); fetchData() }
    else { toast.error("Failed to accept") }
  }

  const handleRevoke = async (inviteId: number) => {
    const res = await fetch(`/api/family/revoke`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    })
    if (res.ok) { toast.success("Access revoked"); fetchData() }
    else { toast.error("Failed to revoke") }
  }

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Family Sharing</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Invite a Family Member</CardTitle><CardDescription>Share access to a profile with someone else</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Profile</label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger><SelectValue placeholder="Select profile" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p: ProfileOption) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="family@example.com" type="email" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer (read-only)</SelectItem>
                  <SelectItem value="editor">Editor (can add/edit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleInvite} disabled={inviting} className="w-full md:w-auto">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Send Invitation
          </Button>
        </CardContent>
      </Card>

      {received.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Invitations Received</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {received.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{inv.profile.name}</p>
                  <p className="text-sm text-muted-foreground">From: {inv.inviter.name} ({inv.inviter.email})</p>
                  <Badge variant={inv.status === "pending" ? "outline" : "secondary"}>{inv.status}</Badge>
                </div>
                {inv.status === "pending" && (
                  <Button onClick={() => handleAccept(inv.id)} size="sm">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Accept
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Shared by You</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No profiles shared yet</p>
          ) : (
            sent.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{inv.invitedEmail}</p>
                    <p className="text-sm text-muted-foreground">{inv.profile.name} — {inv.role}</p>
                    <Badge variant={inv.status === "accepted" ? "success" : inv.status === "pending" ? "outline" : "destructive"}>{inv.status}</Badge>
                  </div>
                </div>
                {inv.status !== "revoked" && (
                  <Button variant="destructive" size="sm" onClick={() => handleRevoke(inv.id)}>
                    <UserMinus className="h-4 w-4 mr-1" /> Revoke
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
