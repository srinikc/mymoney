import crypto from "node:crypto"

export interface SharekhanHolding {
  symbol: string
  isin: string
  exchange: string
  quantity: number
  averagePrice: number
  lastPrice: number
  marketValue: number
  profitLoss: number
  profitLossPercent: number
}

export interface SharekhanPosition {
  symbol: string
  exchange: string
  quantity: number
  buyQuantity: number
  sellQuantity: number
  buyPrice: number
  sellPrice: number
  buyAmount: number
  sellAmount: number
  profitLoss: number
}

export interface SharekhanProfile {
  userId: string
  userName: string
  email: string
  mobile: string
  broker: string
  exchanges: string[]
}

const SHAREKHAN_BASE = "https://api.sharekhan.com"
const SHAREKHAN_LOGIN = "https://api.sharekhan.com/auth/login"

export class SharekhanClient {
  private apiKey: string
  private accessToken: string
  private baseUrl: string = SHAREKHAN_BASE

  constructor(apiKey: string, accessToken: string) {
    this.apiKey = apiKey
    this.accessToken = accessToken
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      Authorization: `Bearer ${this.accessToken}`,
    }
  }

  static getLoginUrl(apiKey: string, redirectUri: string): string {
    return `${SHAREKHAN_LOGIN}?api_key=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`
  }

  static async generateSession(apiKey: string, code: string, secret: string): Promise<{
    accessToken: string
    userId: string
    profile: SharekhanProfile
  }> {
    const checksum = crypto.createHmac("sha256", secret).update(`${apiKey}${code}`).digest("hex")

    const response = await fetch(`${SHAREKHAN_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, code, checksum }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Sharekhan session error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      userId: data.user_id,
      profile: data,
    }
  }

  async getProfile(): Promise<SharekhanProfile> {
    const response = await fetch(`${this.baseUrl}/user/profile`, { headers: this.headers })
    if (!response.ok) throw new Error(`Sharekhan profile error (${response.status})`)
    return response.json()
  }

  async getHoldings(): Promise<SharekhanHolding[]> {
    const response = await fetch(`${this.baseUrl}/portfolio/holdings`, { headers: this.headers })
    if (!response.ok) throw new Error(`Sharekhan holdings error (${response.status})`)
    const data = await response.json()
    return data.data || data.holdings || []
  }

  async getPositions(): Promise<SharekhanPosition[]> {
    const response = await fetch(`${this.baseUrl}/portfolio/positions`, { headers: this.headers })
    if (!response.ok) throw new Error(`Sharekhan positions error (${response.status})`)
    const data = await response.json()
    return data.data?.net || data.positions || []
  }
}
