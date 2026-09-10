import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheFlush,
  getRedisStatus,
  isRedisReady,
  disconnectRedis,
} from "./redis";

export const CACHE_TTL = {
  LIVE: 60,
  SHORT: 300,
  MEDIUM: 900,
  MARKET: 900,
  MF_NAV: 3600,
  LONG: 86400,
  MF_SEARCH: 86400,
  NPS: 86400,
  DAILY: 21600,
  INTELLIGENCE: 21600,
} as const;

export const CacheKeys = {
  mfSearch: (q: string) => `mf:search:${q.toLowerCase()}`,
  mfDetail: (code: string) => `mf:detail:${code}`,
  mfScreen: (category: string, sort: string) => `mf:screen:${category}:${sort}`,
  mfProjection: (code: string, sip: number, years: number) =>
    `mf:proj:${code}:${sip}:${years}`,
  npsFunds: (age: number, risk: string) => `nps:${age}:${risk}`,
  goldPrice: (period: string) => `commodity:gold:${period}`,
  silverPrice: (period: string) => `commodity:silver:${period}`,
  etfPrice: (symbol: string, period: string) =>
    `commodity:etf:${symbol}:${period}`,
  marketStatus: () => `commodity:market:${new Date().toDateString()}`,
  intelligence: (profileId: number) =>
    `intel:${profileId}:${new Date().toDateString()}`,
  healthScore: (profileId: number) =>
    `health:${profileId}:${new Date().getFullYear()}:${new Date().getMonth() + 1}`,
  netWorth: (profileId: number) => `networth:${profileId}`,
  bankAccounts: (profileId: number) => `bankacct:${profileId}`,
  cashBalance: (profileId: number) => `cashbal:${profileId}`,
  expenseYears: (profileId: number) => `expyears:${profileId}`,
  insightsByType: (profileId: number, type: string) =>
    `intel:${profileId}:${type}`,
  educationTip: (ageGroup: string, category: string) =>
    `edu:tip:${ageGroup}:${category}`,
  investments: (profileId: number) => `invest:${profileId}`,
  goals: (profileId: number) => `goals:${profileId}`,
  categories: () => `categories:all`,
  budgets: (profileId: number, month: number, year: number) =>
    `budgets:${profileId}:${month}:${year}`,
  budgetsOverview: (profileId: number, month: number, year: number) =>
    `budgets:overview:${profileId}:${month}:${year}`,
  loans: (profileId: number) => `loans:${profileId}`,
  subscriptions: (profileId: number) => `subs:${profileId}`,
  insurance: (profileId: number) => `insurance:${profileId}`,
  reminders: (profileId: number, type: string) =>
    `reminders:${profileId}:${type}`,
  incomeSources: (profileId: number) => `income:src:${profileId}`,
  incomeSummary: (profileId: number, month: number, year: number) =>
    `income:sum:${profileId}:${month}:${year}`,
  emergencyFund: (profileId: number) => `emfund:${profileId}`,
  expenses: (profileId: number, queryHash: string) =>
    `exp:${profileId}:${queryHash}`,
  autoCatResults: (userId: number) => `autocat:${userId}`,
  autoCatCategories: () => `autocat:cats`,
  adminUsers: () => `admin:users`,
  adminFeatures: () => `admin:features`,
  adminProfiles: () => `admin:profiles`,
  adminLoans: () => `admin:loans`,
  adminFunds: () => `admin:funds`,
  adminAuditLog: (queryHash: string) => `admin:audit:${queryHash}`,
} as const;

export async function cached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cachedValue = await cacheGet<T>(key);
  if (cachedValue !== null) return cachedValue;
  const fresh = await fetcher();
  await cacheSet(key, fresh, ttl);
  return fresh;
}

export async function invalidateProfile(profileId: number): Promise<void> {
  await cacheDelPattern(`intel:${profileId}:*`);
}

export async function invalidateMfProjections(): Promise<void> {
  await cacheDelPattern(`mf:proj:*`);
}

export {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheFlush,
  getRedisStatus,
  isRedisReady,
  disconnectRedis,
};
