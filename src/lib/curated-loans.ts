// ── Curated Loan Products ──────────────────────────────────────────────
// 12-15 popular Indian bank/NBFC loan products with affiliate links.
// Rates are seeded with typical ranges; admin can update via /admin/loans.

import type { AffiliatePlatform } from "@/lib/affiliate-links"

export interface CuratedLoan {
  bankName: string
  productName: string
  loanType: "home" | "car" | "personal" | "education" | "business" | "gold"
  interestRateMin: number
  interestRateMax: number
  maxAmount: number
  tenureMonths: number
  processingFee: string
  features: string[]
  affiliatePlatform: AffiliatePlatform
  affiliateTargetPath: string
  affiliateUtm: string
  isSponsored?: boolean
  displayOrder?: number
}

export const CURATED_LOANS: CuratedLoan[] = [
  // ── Home Loans
  {
    bankName: "SBI",
    productName: "SBI Home Loan",
    loanType: "home",
    interestRateMin: 8.5,
    interestRateMax: 9.65,
    maxAmount: 10_000_000,
    tenureMonths: 360,
    processingFee: "0.35% of loan amount",
    features: ["Lowest rates for women borrowers", "No prepayment penalty for floating rate", "Up to 90% financing"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/sbi-home-loan",
    affiliateUtm: "sbi_homeloan",
    isSponsored: false,
    displayOrder: 1,
  },
  {
    bankName: "HDFC",
    productName: "HDFC Home Loan",
    loanType: "home",
    interestRateMin: 8.7,
    interestRateMax: 9.8,
    maxAmount: 10_000_000,
    tenureMonths: 360,
    processingFee: "0.5% of loan amount",
    features: ["Doorstep service", "Top-up loan available", "Flexible EMI options"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/hdfc-home-loan",
    affiliateUtm: "hdfc_homeloan",
    isSponsored: true,
    displayOrder: 2,
  },
  {
    bankName: "ICICI Bank",
    productName: "ICICI Home Loan",
    loanType: "home",
    interestRateMin: 8.75,
    interestRateMax: 9.85,
    maxAmount: 10_000_000,
    tenureMonths: 360,
    processingFee: "0.5% of loan amount",
    features: ["Quick approval", "Balance transfer facility", "No foreclosure charges"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/icici-home-loan",
    affiliateUtm: "icici_homeloan",
    displayOrder: 3,
  },

  // ── Car Loans
  {
    bankName: "SBI",
    productName: "SBI Car Loan",
    loanType: "car",
    interestRateMin: 8.7,
    interestRateMax: 11.2,
    maxAmount: 2_000_000,
    tenureMonths: 84,
    processingFee: "0.4% of loan amount",
    features: ["Up to 90% on-road financing", "Used car loans available", "Flexible repayment"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/sbi-car-loan",
    affiliateUtm: "sbi_carloan",
    displayOrder: 4,
  },
  {
    bankName: "HDFC",
    productName: "HDFC Car Loan",
    loanType: "car",
    interestRateMin: 8.85,
    interestRateMax: 11.5,
    maxAmount: 2_000_000,
    tenureMonths: 84,
    processingFee: "0.5% of loan amount",
    features: ["New and used car financing", "Pre-approved offers", "Doorstep service"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/hdfc-car-loan",
    affiliateUtm: "hdfc_carloan",
    displayOrder: 5,
  },
  {
    bankName: "Bajaj Finserv",
    productName: "Bajaj Finserv Car Loan",
    loanType: "car",
    interestRateMin: 9.5,
    interestRateMax: 13.0,
    maxAmount: 2_500_000,
    tenureMonths: 96,
    processingFee: "Up to 2% of loan amount",
    features: ["Same-day approval", "No collateral required", "Online application"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/bajaj-finserv-car-loan",
    affiliateUtm: "bajaj_carloan",
    isSponsored: true,
    displayOrder: 6,
  },

  // ── Personal Loans
  {
    bankName: "HDFC",
    productName: "HDFC Personal Loan",
    loanType: "personal",
    interestRateMin: 10.5,
    interestRateMax: 16.5,
    maxAmount: 4_000_000,
    tenureMonths: 60,
    processingFee: "Up to 2.5% of loan amount",
    features: ["Disbursal in 4 seconds (pre-approved)", "No collateral", "Flexible tenure"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/hdfc-personal-loan",
    affiliateUtm: "hdfc_personalloan",
    isSponsored: true,
    displayOrder: 7,
  },
  {
    bankName: "ICICI Bank",
    productName: "ICICI Personal Loan",
    loanType: "personal",
    interestRateMin: 10.8,
    interestRateMax: 16.5,
    maxAmount: 3_000_000,
    tenureMonths: 60,
    processingFee: "Up to 2.5% of loan amount",
    features: ["Instant disbursal", "Minimal documentation", "Top-up loan facility"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/icici-personal-loan",
    affiliateUtm: "icici_personalloan",
    displayOrder: 8,
  },
  {
    bankName: "Bajaj Finserv",
    productName: "Bajaj Finserv Personal Loan",
    loanType: "personal",
    interestRateMin: 11.0,
    interestRateMax: 19.0,
    maxAmount: 4_000_000,
    tenureMonths: 96,
    processingFee: "Up to 3% of loan amount",
    features: ["Flexi loan facility", "Pay interest only on amount used", "Online approval"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/bajaj-finserv-personal-loan",
    affiliateUtm: "bajaj_personalloan",
    displayOrder: 9,
  },

  // ── Education Loans
  {
    bankName: "SBI",
    productName: "SBI Scholar Loan (Education)",
    loanType: "education",
    interestRateMin: 8.15,
    interestRateMax: 10.65,
    maxAmount: 2_000_000,
    tenureMonths: 180,
    processingFee: "Nil",
    features: ["Moratorium during course + 6 months", "Covers tuition + living expenses", "Tax benefit under 80E"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/sbi-education-loan",
    affiliateUtm: "sbi_education",
    displayOrder: 10,
  },
  {
    bankName: "HDFC",
    productName: "HDFC Credila Education Loan",
    loanType: "education",
    interestRateMin: 9.5,
    interestRateMax: 12.0,
    maxAmount: 5_000_000,
    tenureMonths: 180,
    processingFee: "1% of loan amount",
    features: ["Covers overseas education", "Flexible repayment after course", "Tax benefit under 80E"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/hdfc-education-loan",
    affiliateUtm: "hdfc_education",
    displayOrder: 11,
  },

  // ── Gold Loans
  {
    bankName: "Muthoot Finance",
    productName: "Muthoot Gold Loan",
    loanType: "gold",
    interestRateMin: 9.99,
    interestRateMax: 24.0,
    maxAmount: 1_000_000,
    tenureMonths: 12,
    processingFee: "Nil",
    features: ["Disbursal in 5 minutes", "No income proof needed", "Renewal online"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/muthoot-gold-loan",
    affiliateUtm: "muthoot_gold",
    isSponsored: true,
    displayOrder: 12,
  },
  {
    bankName: "Manappuram Finance",
    productName: "Manappuram Gold Loan",
    loanType: "gold",
    interestRateMin: 9.99,
    interestRateMax: 26.0,
    maxAmount: 1_000_000,
    tenureMonths: 12,
    processingFee: "Nil",
    features: ["Online gold loan", "Pay only interest monthly", "Doorstep service"],
    affiliatePlatform: "bankbazaar",
    affiliateTargetPath: "/manappuram-gold-loan",
    affiliateUtm: "manappuram_gold",
    displayOrder: 13,
  },
]

export const LOAN_TYPE_LABEL: Record<CuratedLoan["loanType"], string> = {
  home: "Home Loan",
  car: "Car Loan",
  personal: "Personal Loan",
  education: "Education Loan",
  business: "Business Loan",
  gold: "Gold Loan",
}
