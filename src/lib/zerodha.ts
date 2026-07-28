import crypto from "node:crypto"

export interface Holding {
  tradingsymbol: string
  exchange: string
  isin: string
  quantity: number
  averagePrice: number
  lastPrice: number
  pnl: number
  dayChange: number
  dayChangePercentage: number
}

export interface Position {
  tradingsymbol: string
  exchange: string
  quantity: number
  buyQuantity: number
  sellQuantity: number
  buyPrice: number
  sellPrice: number
  buyAmount: number
  sellAmount: number
  pnl: number
  m2m: number
  dayBuyPrice: number
  daySellPrice: number
  dayBuyAmount: number
  daySellAmount: number
}

export interface ZerodhaProfile {
  user_id: string
  user_name: string
  email: string
  broker: string
  products: string[]
  order_types: string[]
  exchanges: string[]
}

const KITE_BASE = "https://api.kite.trade"
const KITE_LOGIN = "https://kite.zerodha.com/connect/login"

export class ZerodhaClient {
  private apiKey: string
  private accessToken: string
  private baseUrl: string = KITE_BASE

  constructor(apiKey: string, accessToken: string) {
    this.apiKey = apiKey
    this.accessToken = accessToken
  }

  private get headers(): Record<string, string> {
    return {
      "X-Kite-Version": "3",
      Authorization: `token ${this.apiKey}:${this.accessToken}`,
    }
  }

  static getLoginUrl(apiKey: string, redirectUri: string): string {
    return `${KITE_LOGIN}?v=3&api_key=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}`
  }

  /**
   * Exchange request_token for access_token.
   */
  static async generateSession(apiKey: string, requestToken: string, secret: string): Promise<{
    accessToken: string
    userId: string
    profile: ZerodhaProfile
  }> {
    const response = await fetch(`${KITE_BASE}/session/token`, {
      method: "POST",
      headers: {
        "X-Kite-Version": "3",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: requestToken,
        checksum: this.generateChecksum(apiKey, requestToken, secret),
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Zerodha session error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return {
      accessToken: data.data.access_token,
      userId: data.data.user_id,
      profile: data.data,
    }
  }

  private static generateChecksum(apiKey: string, requestToken: string, secret: string): string {
    // SHA-256 HMAC of api_key + request_token using secret as key
    const hmac = crypto.createHmac("sha256", secret)
    hmac.update(`${apiKey}${requestToken}`)
    return hmac.digest("hex")
  }

  /**
   * Get user profile.
   */
  async getProfile(): Promise<ZerodhaProfile> {
    const response = await fetch(`${this.baseUrl}/user/profile`, {
      headers: this.headers,
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Zerodha profile error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Fetch holdings from Zerodha.
   */
  async getHoldings(): Promise<Holding[]> {
    const response = await fetch(`${this.baseUrl}/portfolio/holdings`, {
      headers: this.headers,
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Zerodha holdings error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return data.data || []
  }

  /**
   * Fetch positions from Zerodha.
   */
  async getPositions(): Promise<Position[]> {
    const response = await fetch(`${this.baseUrl}/portfolio/positions`, {
      headers: this.headers,
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Zerodha positions error (${response.status}): ${err}`)
    }

    const data = await response.json()
    // Position response has day and net positions
    return data.data?.net || []
  }

  /**
   * Get margin data.
   */
  async getMargins(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/user/margins`, {
      headers: this.headers,
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Zerodha margins error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Get order history.
   */
  async getOrders(): Promise<Record<string, unknown>[]> {
    const response = await fetch(`${this.baseUrl}/orders`, {
      headers: this.headers,
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Zerodha orders error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return data.data || []
  }

  /**
   * Get trade history.
   */
  async getTrades(): Promise<Record<string, unknown>[]> {
    const response = await fetch(`${this.baseUrl}/trades`, {
      headers: this.headers,
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Zerodha trades error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return data.data || []
  }
}
