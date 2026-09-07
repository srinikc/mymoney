import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 32

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32, { N: 2 ** 14, r: 8, p: 1 })
}

export function encryptContent(content: string, password: string): {
  encrypted: Buffer
  iv: Buffer
  salt: Buffer
  tag: Buffer
} {
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(password, salt)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(content, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return { encrypted, iv, salt, tag }
}

export function decryptContent(encrypted: Buffer, password: string, iv: Buffer, salt: Buffer, tag: Buffer): string {
  const key = deriveKey(password, salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

export function encryptEnvFile(envContent: string, password: string): Buffer {
  const { encrypted, iv, salt, tag } = encryptContent(envContent, password)
  return Buffer.concat([salt, iv, tag, encrypted])
}

export function decryptEnvFile(data: Buffer, password: string): string {
  const salt = data.subarray(0, SALT_LENGTH)
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16)
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + 16)
  return decryptContent(encrypted, password, iv, salt, tag)
}
