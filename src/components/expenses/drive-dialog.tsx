"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Loader2, Upload } from "lucide-react"

interface DriveFile {
  id: string; name: string; size?: string; createdTime?: string
}

interface PreviewData {
  total: number; willImport: number; willSkip: number
  blankVendor: number; totalVendors: number
  sample: { date: string; amount: number; vendor: string }[]
}

interface DriveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: DriveFile[]
  onPreview: (fileId: string, fileName: string) => Promise<PreviewData | null>
  onImport: (fileId: string) => void
  importing: boolean
}

export function DriveDialog({ open, onOpenChange, files, onPreview, onImport, importing }: DriveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Google Takeout Files</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No Takeout files found.</p>
              <p className="text-xs mt-2">Go to takeout.google.com &rarr; select &ldquo;Google Pay&rdquo; &rarr; export to Drive</p>
            </div>
          ) : files.map((file) => (
            <FileCard key={file.id} file={file} onPreview={onPreview} onImport={onImport} importing={importing} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FileCard({ file, onPreview, onImport, importing }: {
  file: DriveFile
  onPreview: (fileId: string, fileName: string) => Promise<PreviewData | null>
  onImport: (fileId: string) => void
  importing: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)

  const handleClick = async () => {
    if (preview) return
    setLoading(true)
    const data = await onPreview(file.id, file.name)
    if (data) setPreview(data)
    setLoading(false)
  }

  if (preview) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3">
          <p className="text-sm font-medium mb-2">{file.name}</p>
          <div className="grid gap-2 md:grid-cols-2 mb-3">
            <div className="rounded border bg-background p-2">
              <p className="text-[10px] text-muted-foreground">Total Records</p>
              <p className="text-sm font-semibold">{preview.total.toLocaleString()}</p>
            </div>
            <div className="rounded border bg-background p-2">
              <p className="text-[10px] text-muted-foreground">Will Import</p>
              <p className="text-sm font-semibold text-emerald-600">{preview.willImport.toLocaleString()}</p>
            </div>
            <div className="rounded border bg-background p-2">
              <p className="text-[10px] text-muted-foreground">Duplicates (skip)</p>
              <p className="text-sm font-semibold text-amber-600">{preview.willSkip.toLocaleString()}</p>
            </div>
            <div className="rounded border bg-background p-2">
              <p className="text-[10px] text-muted-foreground">Blank Vendors</p>
              <p className="text-sm font-semibold">{preview.blankVendor}</p>
            </div>
          </div>
          {preview.sample.length > 0 && (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-1">Date</th>
                    <th className="px-2 py-1">Vendor</th>
                    <th className="px-2 py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-1 whitespace-nowrap">{row.date}</td>
                      <td className="px-2 py-1 max-w-[100px] truncate">{row.vendor || <span className="text-muted-foreground italic">blank</span>}</td>
                      <td className="px-2 py-1 text-right">₹{row.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onImport(file.id)} disabled={importing}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import {preview.total.toLocaleString()} Records
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPreview(null)} disabled={importing}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`cursor-pointer hover:bg-muted/50 transition-colors ${loading ? "opacity-50 pointer-events-none" : ""}`} onClick={handleClick}>
      <CardContent className="flex items-center justify-between py-2 text-sm">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <span className="font-medium">{file.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span className="mr-2">{file.createdTime ? new Date(file.createdTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "?"}</span>{file.size && <span className="text-muted-foreground">{(Number.parseInt(file.size) / 1024 / 1024).toFixed(1)} MB</span>}</>}
          {!loading && <Button size="sm" variant="secondary">Preview</Button>}
        </div>
      </CardContent>
    </Card>
  )
}
