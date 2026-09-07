import { google } from "googleapis"

function getAuth() {
  const refreshToken = process.env.GOOGLE_BACKUP_REFRESH_TOKEN
  const clientId = process.env.GOOGLE_BACKUP_CLIENT_ID || process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_BACKUP_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Google Drive backup credentials not configured. Set GOOGLE_BACKUP_REFRESH_TOKEN, GOOGLE_BACKUP_CLIENT_ID, GOOGLE_BACKUP_CLIENT_SECRET")
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret)
  oauth2.setCredentials({ refresh_token: refreshToken })
  return oauth2
}

export async function uploadToGoogleDrive(key: string, body: Buffer, contentType: string): Promise<{ fileId: string; webViewLink: string }> {
  const auth = getAuth()
  const drive = google.drive({ version: "v3", auth })

  const folderId = process.env.GOOGLE_BACKUP_FOLDER_ID
  const filename = key.split("/").pop() || key

  const fileMetadata: { name: string; parents?: string[] } = { name: filename }
  if (folderId) fileMetadata.parents = [folderId]

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media: { mimeType: contentType, body: Buffer.from(body) },
    fields: "id,webViewLink",
  })

  if (!res.data.id) throw new Error("Google Drive upload failed: no file ID returned")
  return { fileId: res.data.id, webViewLink: res.data.webViewLink || "" }
}

export async function downloadFromGoogleDrive(fileId: string): Promise<Buffer> {
  const auth = getAuth()
  const drive = google.drive({ version: "v3", auth })

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  )
  return Buffer.from(res.data as ArrayBuffer)
}

export async function getGoogleDriveUsage(): Promise<{ usedBytes: number; objectCount: number }> {
  if (!isGoogleDriveConfigured()) return { usedBytes: 0, objectCount: 0 }
  const auth = getAuth()
  const drive = google.drive({ version: "v3", auth })
  const folderId = process.env.GOOGLE_BACKUP_FOLDER_ID
  const query = folderId ? `'${folderId}' in parents and trashed = false` : "trashed = false"

  let totalBytes = 0
  let count = 0
  let pageToken: string | undefined

  do {
    const res = await drive.files.list({
      q: query,
      fields: "files(id,name,size),nextPageToken",
      pageSize: 1000,
      pageToken,
    })
    for (const f of res.data.files || []) {
      totalBytes += parseInt(f.size || "0", 10)
      count++
    }
    pageToken = res.data.nextPageToken || undefined
  } while (pageToken)

  return { usedBytes: totalBytes, objectCount: count }
}

export function isGoogleDriveConfigured(): boolean {
  return !!(
    (process.env.GOOGLE_BACKUP_REFRESH_TOKEN || process.env.GOOGLE_BACKUP_CLIENT_ID) &&
    (process.env.GOOGLE_BACKUP_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET)
  )
}
