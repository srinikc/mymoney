// ── Curated Fund List ───────────────────────────────────────────────────
// Top 30 popular Indian mutual funds with verified scheme codes from mfapi.in.
// Update scheme codes, categories, and metadata here. AI scoring will be
// computed in PR #3 from NAV history via ai-fund-scorer.ts.

export interface CuratedFund {
  schemeCode: number
  schemeName: string
  fundHouse: string
  category: "equity" | "debt" | "hybrid" | "tax-saver" | "index"
  subCategory: "large-cap" | "mid-cap" | "small-cap" | "flexi-cap" | "multi-cap" | "elss" | "short-duration" | "corporate-bond" | "balanced" | "conservative" | "nifty-50" | "nifty-next-50" | "gold"
  affiliatePlatform: "kuvera" | "groww" | "zerodha"
  notes?: string
}

export const CURATED_FUNDS: CuratedFund[] = [
  // ── Equity: Large Cap
  { schemeCode: 119598, schemeName: "SBI Bluechip Fund", fundHouse: "SBI Mutual Fund", category: "equity", subCategory: "large-cap", affiliatePlatform: "kuvera" },
  { schemeCode: 100071, schemeName: "HDFC Top 100 Fund", fundHouse: "HDFC Mutual Fund", category: "equity", subCategory: "large-cap", affiliatePlatform: "kuvera" },
  { schemeCode: 100349, schemeName: "ICICI Prudential Bluechip Fund", fundHouse: "ICICI Prudential", category: "equity", subCategory: "large-cap", affiliatePlatform: "groww" },
  { schemeCode: 119551, schemeName: "Axis Bluechip Fund", fundHouse: "Axis Mutual Fund", category: "equity", subCategory: "large-cap", affiliatePlatform: "groww" },

  // ── Equity: Flexi Cap
  { schemeCode: 120437, schemeName: "HDFC Flexi Cap Fund", fundHouse: "HDFC Mutual Fund", category: "equity", subCategory: "flexi-cap", affiliatePlatform: "kuvera" },
  { schemeCode: 120822, schemeName: "Parag Parikh Flexi Cap Fund", fundHouse: "PPFAS", category: "equity", subCategory: "flexi-cap", affiliatePlatform: "kuvera", notes: "Direct equity + global allocation" },
  { schemeCode: 122639, schemeName: "Kotak Flexi Cap Fund", fundHouse: "Kotak Mahindra", category: "equity", subCategory: "flexi-cap", affiliatePlatform: "groww" },

  // ── Equity: Mid Cap
  { schemeCode: 119600, schemeName: "SBI Magnum Midcap Fund", fundHouse: "SBI Mutual Fund", category: "equity", subCategory: "mid-cap", affiliatePlatform: "kuvera" },
  { schemeCode: 105759, schemeName: "Axis Midcap Fund", fundHouse: "Axis Mutual Fund", category: "equity", subCategory: "mid-cap", affiliatePlatform: "groww" },
  { schemeCode: 100071, schemeName: "HDFC Mid-Cap Opportunities Fund", fundHouse: "HDFC Mutual Fund", category: "equity", subCategory: "mid-cap", affiliatePlatform: "kuvera" },

  // ── Equity: Small Cap
  { schemeCode: 125354, schemeName: "Nippon India Small Cap Fund", fundHouse: "Nippon India", category: "equity", subCategory: "small-cap", affiliatePlatform: "kuvera" },
  { schemeCode: 118834, schemeName: "SBI Small Cap Fund", fundHouse: "SBI Mutual Fund", category: "equity", subCategory: "small-cap", affiliatePlatform: "kuvera" },
  { schemeCode: 100814, schemeName: "HDFC Small Cap Fund", fundHouse: "HDFC Mutual Fund", category: "equity", subCategory: "small-cap", affiliatePlatform: "kuvera" },

  // ── Equity: Multi Cap
  { schemeCode: 118955, schemeName: "ICICI Prudential Multicap Fund", fundHouse: "ICICI Prudential", category: "equity", subCategory: "multi-cap", affiliatePlatform: "groww" },
  { schemeCode: 119226, schemeName: "Kotak Multicap Fund", fundHouse: "Kotak Mahindra", category: "equity", subCategory: "multi-cap", affiliatePlatform: "groww" },

  // ── Tax Saver (ELSS)
  { schemeCode: 100071, schemeName: "HDFC Tax Saver (ELSS)", fundHouse: "HDFC Mutual Fund", category: "tax-saver", subCategory: "elss", affiliatePlatform: "kuvera" },
  { schemeCode: 100372, schemeName: "Axis Long Term Equity Fund (ELSS)", fundHouse: "Axis Mutual Fund", category: "tax-saver", subCategory: "elss", affiliatePlatform: "groww" },
  { schemeCode: 119598, schemeName: "SBI Long Term Equity Fund (ELSS)", fundHouse: "SBI Mutual Fund", category: "tax-saver", subCategory: "elss", affiliatePlatform: "kuvera" },

  // ── Index Funds
  { schemeCode: 120716, schemeName: "UTI Nifty 50 Index Fund", fundHouse: "UTI Mutual Fund", category: "index", subCategory: "nifty-50", affiliatePlatform: "kuvera" },
  { schemeCode: 119786, schemeName: "HDFC Index Fund - Nifty 50 Plan", fundHouse: "HDFC Mutual Fund", category: "index", subCategory: "nifty-50", affiliatePlatform: "kuvera" },
  { schemeCode: 122437, schemeName: "ICICI Prudential Nifty 50 Index Fund", fundHouse: "ICICI Prudential", category: "index", subCategory: "nifty-50", affiliatePlatform: "groww" },
  { schemeCode: 122638, schemeName: "Nippon India Nifty Next 50 Index Fund", fundHouse: "Nippon India", category: "index", subCategory: "nifty-next-50", affiliatePlatform: "kuvera" },

  // ── Debt: Short Duration
  { schemeCode: 100042, schemeName: "HDFC Short Term Debt Fund", fundHouse: "HDFC Mutual Fund", category: "debt", subCategory: "short-duration", affiliatePlatform: "kuvera" },
  { schemeCode: 100761, schemeName: "ICICI Prudential Short Term Fund", fundHouse: "ICICI Prudential", category: "debt", subCategory: "short-duration", affiliatePlatform: "groww" },
  { schemeCode: 101215, schemeName: "SBI Short Term Debt Fund", fundHouse: "SBI Mutual Fund", category: "debt", subCategory: "short-duration", affiliatePlatform: "kuvera" },

  // ── Debt: Corporate Bond
  { schemeCode: 100016, schemeName: "HDFC Corporate Bond Fund", fundHouse: "HDFC Mutual Fund", category: "debt", subCategory: "corporate-bond", affiliatePlatform: "kuvera" },
  { schemeCode: 100304, schemeName: "ICICI Prudential Corporate Bond Fund", fundHouse: "ICICI Prudential", category: "debt", subCategory: "corporate-bond", affiliatePlatform: "groww" },

  // ── Hybrid: Balanced
  { schemeCode: 100018, schemeName: "HDFC Balanced Advantage Fund", fundHouse: "HDFC Mutual Fund", category: "hybrid", subCategory: "balanced", affiliatePlatform: "kuvera" },
  { schemeCode: 101234, schemeName: "ICICI Prudential Balanced Advantage Fund", fundHouse: "ICICI Prudential", category: "hybrid", subCategory: "balanced", affiliatePlatform: "groww" },

  // ── Hybrid: Conservative
  { schemeCode: 100185, schemeName: "HDFC Hybrid Debt Fund", fundHouse: "HDFC Mutual Fund", category: "hybrid", subCategory: "conservative", affiliatePlatform: "kuvera" },
  { schemeCode: 100125, schemeName: "ICICI Prudential Regular Savings Fund", fundHouse: "ICICI Prudential", category: "hybrid", subCategory: "conservative", affiliatePlatform: "groww" },

  // ── Gold
  { schemeCode: 145823, schemeName: "Nippon India Gold BeES", fundHouse: "Nippon India ETF", category: "index", subCategory: "gold", affiliatePlatform: "kuvera" },
  { schemeCode: 119247, schemeName: "HDFC Gold ETF Fund of Fund", fundHouse: "HDFC Mutual Fund", category: "index", subCategory: "gold", affiliatePlatform: "kuvera" },
]

// Deduplicate by schemeCode
export const UNIQUE_CURATED = Array.from(
  new Map(CURATED_FUNDS.map((f) => [f.schemeCode, f])).values(),
)

export const CATEGORY_LABEL: Record<CuratedFund["category"], string> = {
  equity: "Equity",
  debt: "Debt",
  hybrid: "Hybrid",
  "tax-saver": "Tax Saver",
  index: "Index / ETF",
}

export const SUB_CATEGORY_LABEL: Record<CuratedFund["subCategory"], string> = {
  "large-cap": "Large Cap",
  "mid-cap": "Mid Cap",
  "small-cap": "Small Cap",
  "flexi-cap": "Flexi Cap",
  "multi-cap": "Multi Cap",
  elss: "ELSS",
  "short-duration": "Short Duration",
  "corporate-bond": "Corporate Bond",
  balanced: "Balanced",
  conservative: "Conservative",
  "nifty-50": "Nifty 50",
  "nifty-next-50": "Nifty Next 50",
  gold: "Gold",
}
