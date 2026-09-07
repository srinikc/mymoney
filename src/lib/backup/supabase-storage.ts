import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error("Supabase credentials not configured")
  return createClient(url, key)
}

export async function uploadToSupabaseStorage(key: string, body: Buffer, contentType = "application/gzip"): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.storage
    .from("backups")
    .upload(key, body, { contentType, upsert: true })
  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`)
}

export async function downloadFromSupabaseStorage(key: string): Promise<Buffer> {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage.from("backups").download(key)
  if (error) throw new Error(`Supabase Storage download failed: ${error.message}`)
  return Buffer.from(await data.arrayBuffer())
}

export async function getSupabaseStorageUsage(): Promise<{ usedBytes: number; objectCount: number }> {
  const supabase = getSupabase()
  const { data: files, error } = await supabase.storage.from("backups").list("")
  if (error) return { usedBytes: 0, objectCount: 0 }
  let totalBytes = 0
  for (const f of files || []) {
    totalBytes += f.metadata?.size || 0
  }
  return { usedBytes: totalBytes, objectCount: files?.length || 0 }
}

export function isSupabaseStorageConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
}

export async function ensureSupabaseStorageBucket(): Promise<void> {
  const supabase = getSupabase()
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some((b: { name: string }) => b.name === "backups")
  if (!exists) {
    await supabase.storage.createBucket("backups", { public: false })
  }
}
