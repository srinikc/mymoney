// ── Affiliate Link Configuration ────────────────────────────────────────
// Add your affiliate IDs here. URLs are wrapped with UTM tracking so we
// can attribute revenue per platform. Update IDs as you sign up for programs.

export type AffiliatePlatform = "kuvera" | "groww" | "zerodha" | "paytm" | "bankbazaar" | "policybazaar" | "creditmantri" | "direct"

export interface AffiliateConfig {
  platform: AffiliatePlatform
  referralParam: string
  baseUrl: string
  // Default IDs — replace with yours after signup
  ids: Record<string, string>
}

const MY_UTM = "mymoney"

function utm(url: string, source: string, medium = "affiliate"): string {
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}utm_source=${MY_UTM}&utm_medium=${medium}&utm_campaign=${source}`
}

export const AFFILIATE: Record<AffiliatePlatform, AffiliateConfig> = {
  kuvera: {
    platform: "kuvera",
    referralParam: "ref",
    baseUrl: "https://kuvera.in",
    ids: {
      default: "REPLACE_WITH_KUVERA_REF_ID",
    },
  },
  groww: {
    platform: "groww",
    referralParam: "refId",
    baseUrl: "https://groww.in",
    ids: {
      default: "REPLACE_WITH_GROWW_REF_ID",
    },
  },
  zerodha: {
    platform: "zerodha",
    referralParam: "c",
    baseUrl: "https://zerodha.com",
    ids: {
      default: "ZERODHA",
    },
  },
  paytm: {
    platform: "paytm",
    referralParam: "ref",
    baseUrl: "https://paytm.com",
    ids: {
      default: "REPLACE_WITH_PAYTM_REF_ID",
    },
  },
  bankbazaar: {
    platform: "bankbazaar",
    referralParam: "ref",
    baseUrl: "https://www.bankbazaar.com",
    ids: {
      default: "REPLACE_WITH_BANKBAZAAR_REF_ID",
    },
  },
  policybazaar: {
    platform: "policybazaar",
    referralParam: "ref",
    baseUrl: "https://www.policybazaar.com",
    ids: {
      default: "REPLACE_WITH_POLICYBAZAAR_REF_ID",
    },
  },
  creditmantri: {
    platform: "creditmantri",
    referralParam: "ref",
    baseUrl: "https://www.creditmantri.com",
    ids: {
      default: "REPLACE_WITH_CREDITMANTRI_REF_ID",
    },
  },
  direct: {
    platform: "direct",
    referralParam: "",
    baseUrl: "",
    ids: {
      default: "",
    },
  },
}

export function buildAffiliateUrl(
  platform: AffiliatePlatform,
  targetPath: string,
  options?: { idKey?: string; utmSource?: string },
): string {
  const cfg = AFFILIATE[platform]
  const idKey = options?.idKey ?? "default"
  const id = cfg.ids[idKey] ?? cfg.ids.default ?? ""

  let url = `${cfg.baseUrl}${targetPath}`
  if (id && cfg.referralParam) {
    const sep = url.includes("?") ? "&" : "?"
    url += `${sep}${cfg.referralParam}=${encodeURIComponent(id)}`
  }
  if (options?.utmSource) {
    url = utm(url, options.utmSource)
  } else if (platform !== "direct") {
    url = utm(url, platform)
  }
  return url
}

// Common pre-built affiliate links for our curated products
export const AFFILIATE_LINKS = {
  kuveraHome: () => buildAffiliateUrl("kuvera", "/", { utmSource: "kuvera_home" }),
  kuveraMutualFunds: () => buildAffiliateUrl("kuvera", "/explore", { utmSource: "kuvera_mf" }),
  kuveraSIP: () => buildAffiliateUrl("kuvera", "/sip", { utmSource: "kuvera_sip" }),
  growwHome: () => buildAffiliateUrl("groww", "/", { utmSource: "groww_home" }),
  growwMutualFunds: () => buildAffiliateUrl("groww", "/mutual-funds", { utmSource: "groww_mf" }),
  growwStocks: () => buildAffiliateUrl("groww", "/stocks", { utmSource: "groww_stocks" }),
  zerodhaAccount: () => buildAffiliateUrl("zerodha", "/open-account", { utmSource: "zerodha_acct" }),
  zerodhaCoin: () => buildAffiliateUrl("zerodha", "/coin", { utmSource: "zerodha_coin" }),
  paytmMoney: () => buildAffiliateUrl("paytm", "/money", { utmSource: "paytm_money" }),
  bankbazaarHomeLoan: () => buildAffiliateUrl("bankbazaar", "/home-loan", { utmSource: "bb_homeloan" }),
  bankbazaarCarLoan: () => buildAffiliateUrl("bankbazaar", "/car-loan", { utmSource: "bb_carloan" }),
  bankbazaarPersonalLoan: () => buildAffiliateUrl("bankbazaar", "/personal-loan", { utmSource: "bb_personalloan" }),
  bankbazaarCreditCard: () => buildAffiliateUrl("bankbazaar", "/credit-card", { utmSource: "bb_creditcard" }),
  policybazaarTermInsurance: () => buildAffiliateUrl("policybazaar", "/term-insurance", { utmSource: "pb_term" }),
  policybazaarHealthInsurance: () => buildAffiliateUrl("policybazaar", "/health-insurance", { utmSource: "pb_health" }),
  creditmantriFreeScore: () => buildAffiliateUrl("creditmantri", "/free-credit-score", { utmSource: "cm_score" }),
}

export type AffiliateLinkKey = keyof typeof AFFILIATE_LINKS
