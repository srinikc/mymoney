import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

let r2Client: S3Client | null = null

function getR2Client(): S3Client {
  if (r2Client) return r2Client
  r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  })
  return r2Client
}

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  const client = getR2Client()
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET || "mymoney-backups",
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const client = getR2Client()
  const response = await client.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET || "mymoney-backups",
    Key: key,
  }))
  const stream = response.Body
  if (!stream) throw new Error("No body in R2 response")
  const chunks: Buffer[] = []
  const reader = stream.transformToWebStream().getReader()
  let done = false
  while (!done) {
    const result = await reader.read()
    done = result.done
    if (result.value) chunks.push(Buffer.from(result.value))
  }
  return Buffer.concat(chunks)
}

export async function getR2PresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET || "mymoney-backups",
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn })
}

export async function getR2StorageUsage(): Promise<{ usedBytes: number; objectCount: number }> {
  const client = getR2Client()
  const bucket = process.env.R2_BUCKET || "mymoney-backups"
  let totalBytes = 0
  let count = 0
  let continuationToken: string | undefined

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }))
    for (const obj of response.Contents || []) {
      totalBytes += obj.Size || 0
      count++
    }
    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return { usedBytes: totalBytes, objectCount: count }
}

export function isR2Configured(): boolean {
  return !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
}
