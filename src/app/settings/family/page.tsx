"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Save, Loader2, Plus, Trash2, Users, HelpCircle } from "lucide-react"

const RELATIONS = ["self", "spouse", "child", "parent", "sibling", "other"] as const
const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const EDUCATION_LEVELS = ["", "Pre-school", "Class 1-5", "Class 6-10", "Class 11-12", "Engineering", "Medical", "Arts/Commerce", "Masters", "PhD", "Other"]

interface FamilyMember {
  id: number
  relation: string
  name: string
  dateOfBirth: string | null
  birthMonth: number | null
  birthYear: number | null
  annualIncome: number | null
  occupation: string | null
  educationLevel: string | null
  isDependent: boolean
  monthlySupport: number | null
  notes: string | null
}

export default function FamilySettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    relation: "child",
    name: "",
    birthMonth: "",
    birthYear: "",
    annualIncome: "",
    occupation: "",
    educationLevel: "",
    isDependent: false,
    monthlySupport: "",
    notes: "",
  })
  const [showHelp, setShowHelp] = useState(false)

  const sessionProfileId = (session?.user as unknown as { profileId?: number } | undefined)?.profileId

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) { router.push("/login"); return }
    if (!sessionProfileId) return
    void load()
  }, [status, session, sessionProfileId, router])

  async function load() {
    if (!sessionProfileId) return
    setLoading(true)
    try {
      const res = await fetch("/api/retirement/family")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setMembers(data)
    } catch {
      toast.error("Failed to load family members")
    } finally {
      setLoading(false)
    }
  }

  function startAdd() {
    setEditingId(null)
    setForm({ relation: "child", name: "", birthMonth: "", birthYear: "", annualIncome: "", occupation: "", educationLevel: "", isDependent: false, monthlySupport: "", notes: "" })
  }

  function startEdit(m: FamilyMember) {
    setEditingId(m.id)
    setForm({
      relation: m.relation,
      name: m.name,
      birthMonth: m.birthMonth ? String(m.birthMonth) : "",
      birthYear: m.birthYear ? String(m.birthYear) : "",
      annualIncome: m.annualIncome ? String(m.annualIncome) : "",
      occupation: m.occupation || "",
      educationLevel: m.educationLevel || "",
      isDependent: m.isDependent,
      monthlySupport: m.monthlySupport ? String(m.monthlySupport) : "",
      notes: m.notes || "",
    })
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const payload = {
        relation: form.relation,
        name: form.name.trim(),
        birthMonth: form.birthMonth ? Number(form.birthMonth) : null,
        birthYear: form.birthYear ? Number(form.birthYear) : null,
        annualIncome: form.annualIncome ? Number(form.annualIncome) : null,
        occupation: form.occupation || null,
        educationLevel: form.educationLevel || null,
        isDependent: form.isDependent,
        monthlySupport: form.monthlySupport ? Number(form.monthlySupport) : null,
        notes: form.notes || null,
      }

      const url = editingId ? `/api/retirement/family/${editingId}` : "/api/retirement/family"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error("Save failed")
      toast.success(editingId ? "Updated" : "Added")
      setEditingId(null)
      setForm({ relation: "child", name: "", birthMonth: "", birthYear: "", annualIncome: "", occupation: "", educationLevel: "", isDependent: false, monthlySupport: "", notes: "" })
      await load()
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this family member?")) return
    try {
      const res = await fetch(`/api/retirement/family/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Removed")
      await load()
    } catch {
      toast.error("Failed to remove")
    }
  }

  function getRelationLabel(r: string) {
    const labels: Record<string, string> = { self: "Self", spouse: "Spouse", child: "Child", parent: "Parent", sibling: "Sibling", other: "Other" }
    return labels[r] || r
  }

  function getAge(m: FamilyMember): string | null {
    if (m.dateOfBirth) {
      const age = Math.floor((Date.now() - new Date(m.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      return `${age} years`
    }
    if (m.birthYear) {
      const age = new Date().getFullYear() - m.birthYear
      return `~${age} years`
    }
    return null
  }

  const isEditing = editingId !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Family Members</h1>
          <p className="text-muted-foreground">Add family for retirement planning context</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowHelp(!showHelp)}>
          <HelpCircle className="h-4 w-4 mr-1" /> Help
        </Button>
      </div>

      {showHelp && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-2">Why add family members?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Children:</strong> Calculate education and marriage costs during retirement years</li>
              <li><strong>Spouse:</strong> Factor in spouse&apos;s income, lifestyle needs, and survivor planning</li>
              <li><strong>Parents:</strong> Track monthly support obligations that continue into retirement</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2"><strong>Privacy:</strong> We only need birth month/year (not full DOB) for age-based milestones.</p>
          </CardContent>
        </Card>
      )}

      {/* Existing Members */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
      ) : members.length === 0 && !isEditing ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No family members added yet</p>
            <Button onClick={startAdd}><Plus className="h-4 w-4 mr-2" /> Add Family Member</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {members.map((m) => (
              <Card key={m.id} className={editingId === m.id ? "border-primary" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">{m.name}</div>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{getRelationLabel(m.relation)}</span>
                      {getAge(m) && <span className="text-xs text-muted-foreground">{getAge(m)}</span>}
                      {m.isDependent && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Dependent</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(m)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {m.educationLevel && <span>Education: {m.educationLevel}</span>}
                    {m.annualIncome && <span>Income: ₹{(m.annualIncome / 100000).toFixed(1)}L/yr</span>}
                    {m.monthlySupport && <span>Support: ₹{m.monthlySupport.toLocaleString("en-IN")}/mo</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!isEditing && <Button onClick={startAdd}><Plus className="h-4 w-4 mr-2" /> Add Another</Button>}
        </>
      )}

      {/* Add/Edit Form */}
      {isEditing && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Edit" : "Add"} Family Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Relation *</Label>
                <Select value={form.relation} onValueChange={(v) => setForm({ ...form, relation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELATIONS.map((r) => <SelectItem key={r} value={r}>{getRelationLabel(r)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Aarav" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Birth Month</Label>
                <Select value={form.birthMonth} onValueChange={(v) => setForm({ ...form, birthMonth: v })}>
                  <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => i > 0 && <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Birth Year</Label>
                <Input type="number" min="1940" max="2030" value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} placeholder="e.g., 2019" />
              </div>
              <div>
                <Label>Education Level</Label>
                <Select value={form.educationLevel} onValueChange={(v) => setForm({ ...form, educationLevel: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((l) => l && <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Annual Income (₹)</Label>
                <Input type="number" value={form.annualIncome} onChange={(e) => setForm({ ...form, annualIncome: e.target.value })} placeholder="e.g., 800000" />
              </div>
              <div>
                <Label>Monthly Support (₹)</Label>
                <Input type="number" value={form.monthlySupport} onChange={(e) => setForm({ ...form, monthlySupport: e.target.value })} placeholder="e.g., 15000" />
              </div>
              <div>
                <Label>Occupation</Label>
                <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="e.g., Student" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="dependent" checked={form.isDependent} onChange={(e) => setForm({ ...form, isDependent: e.target.checked })} className="rounded" />
              <Label htmlFor="dependent">Is Dependent</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingId ? "Update" : "Add"} Member
              </Button>
              <Button variant="outline" onClick={() => { setEditingId(null); startAdd() }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
