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
  insightsByType: (profileId: number, type: string) =>
    `intel:${profileId}:${type}`,
  educationTip: (ageGroup: string, category: string) =>
    `edu:tip:${ageGroup}:${category}`,
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
