const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"

export interface GmailMessagePart {
  mimeType: string
  body?: { data?: string; attachmentId?: string }
  parts?: GmailMessagePart[]
  filename?: string
}

export interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  internalDate: string
  payload: GmailMessagePart & {
    headers: { name: string; value: string }[]
  }
}

export interface ParsedEmail {
  from: string
  to: string
  subject: string
  date: Date
  bodyText: string
  bodyHtml: string
  attachments: { filename: string; mimeType: string; data: string }[]
}

export async function getAccessToken(userId: number): Promise<string> {
  const { prisma } = await import("@/lib/prisma")
  const accounts = await prisma.account.findMany({
    where: { userId, provider: "google" },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true },
  })
  // Prefer an account that can be refreshed (has a refresh token), then any
  // account with a still-valid access token.
  const account =
    accounts.find((a) => a.refresh_token && a.access_token) ||
    accounts.find((a) => a.access_token) ||
    accounts[0]
  if (!account?.access_token) throw new Error("No Google token found")

  if (account.expires_at && account.expires_at * 1000 < Date.now() && account.refresh_token) {
    const { refreshAccessToken } = await import("./oauth")
    const refreshed = await refreshAccessToken(account.refresh_token)
    await prisma.account.update({
      where: { id: account.id },
      data: { access_token: refreshed.access_token, expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in },
    })
    return refreshed.access_token
  }

  return account.access_token
}

export async function listMessages(
  accessToken: string,
  query: string,
  maxResults = 20
): Promise<GmailMessage[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) })
  const res = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Gmail list failed: ${await res.text()}`)
  const data = await res.json()
  return data.messages || []
}

export async function listAllMessages(
  accessToken: string,
  query: string,
  maxResults = 100
): Promise<GmailMessage[]> {
  const messages: GmailMessage[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({ q: query, maxResults: String(Math.min(maxResults, 500)) })
    if (pageToken) params.set("pageToken", pageToken)
    const res = await fetch(`${GMAIL_API}/messages?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Gmail list failed: ${await res.text()}`)
    const data = await res.json()
    messages.push(...(data.messages || []))
    pageToken = data.nextPageToken
    if (messages.length >= maxResults) break
  } while (pageToken)
  return messages
}

export async function getMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
  const res = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Gmail get failed: ${await res.text()}`)
  return res.json()
}

export function parseMessage(msg: GmailMessage): ParsedEmail {
  const headers: Record<string, string> = {}
  for (const h of msg.payload.headers) {
    headers[h.name.toLowerCase()] = h.value
  }

  let bodyText = ""
  let bodyHtml = ""
  const attachments: ParsedEmail["attachments"] = []

  function extractParts(parts: GmailMessagePart[]) {
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        bodyText = Buffer.from(part.body.data, "base64").toString("utf-8")
      } else if (part.mimeType === "text/html" && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, "base64").toString("utf-8")
      } else if (part.mimeType.startsWith("multipart/") && part.parts) {
        extractParts(part.parts)
      } else if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          data: part.body.attachmentId,
        })
      }
    }
  }

  if (msg.payload.parts) {
    extractParts(msg.payload.parts)
  } else if (msg.payload.body?.data) {
    bodyText = Buffer.from(msg.payload.body.data, "base64").toString("utf-8")
  }

  return {
    from: headers["from"] || "",
    to: headers["to"] || "",
    subject: headers["subject"] || "",
    date: new Date(Number.parseInt(msg.internalDate)),
    bodyText,
    bodyHtml,
    attachments,
  }
}

export const GMAIL_QUERIES = {
  bankStatement: "from:(alert@bank) OR from:(noreply@bank) (transaction OR debited OR credited OR spent) after:2024-01-01",
  upiPayment: "from:(pay@pay) OR from:(noreply@pay) (UPI OR payment OR paid) after:2024-01-01",
  creditCard: "(credit card OR statement) (due OR payment OR bill) after:2024-01-01",
  mutualFund: "from:(noreply@cams) OR from:(noreply@kfintech) OR from:(mfcentral) (mutual fund OR folio OR NAV) after:2024-01-01",
  insurance: "(insurance OR premium OR policy) (receipt OR payment OR renewal) after:2024-01-01",
  subscription: "(subscription OR renewal OR billed) (netflix OR spotify OR amazon OR apple OR google) after:2024-01-01",
  salary: "from:(payroll OR hr OR salary) (salary OR payslip OR payroll) after:2024-01-01",
  tax: "(form 16 OR ITR OR income tax OR tax return OR AIS OR 26AS) after:2024-01-01",
  investment: "from:(zerodha OR groww OR angel OR upstox) (trade OR buy OR sell OR investment) after:2024-01-01",
}
