import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_ENABLED = process.env.REDIS_ENABLED !== "false";

let redis: Redis | null = null;

if (REDIS_ENABLED) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: false,
      lazyConnect: false,
    });
    redis.on("error", (err: Error) => {
      console.warn("[Redis] Connection error:", err.message);
    });
    redis.on("connect", () => {
      console.log("[Redis] Connected to", REDIS_URL.replace(/:[^:@]+@/, ":***@"));
    });
    redis.on("ready", () => {
      console.log("[Redis] Ready");
    });
    redis.on("close", () => {
      console.warn("[Redis] Connection closed");
    });
  } catch (err) {
    console.warn("[Redis] Failed to initialize:", err);
    redis = null;
  }
}

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryEntry>();
const MAX_MEMORY_ENTRIES = 1000;

function isExpired(entry: MemoryEntry): boolean {
  return Date.now() > entry.expiresAt;
}

function evictExpiredMemory(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) memoryCache.delete(key);
  }
}

function memorySet(key: string, value: unknown, ttlSeconds: number): void {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    evictExpiredMemory();
    if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
      const firstKey = memoryCache.keys().next().value;
      if (firstKey !== undefined) memoryCache.delete(firstKey);
    }
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (redis && redis.status === "ready") {
    try {
      const value = await redis.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      console.warn(`[Redis] GET failed for ${key}, using memory fallback`);
    }
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (isExpired(entry)) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  const serialized = JSON.stringify(value);
  if (redis && redis.status === "ready") {
    try {
      await redis.setex(key, ttlSeconds, serialized);
      return;
    } catch (err) {
      console.warn(`[Redis] SET failed for ${key}, using memory fallback`);
    }
  }
  memorySet(key, value, ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  if (redis && redis.status === "ready") {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn(`[Redis] DEL failed for ${key}`);
    }
  }
  memoryCache.delete(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (redis && redis.status === "ready") {
    try {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const keysToDelete: string[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on("data", (keys: string[]) => {
          keysToDelete.push(...keys);
        });
        stream.on("end", () => resolve());
        stream.on("error", (err) => reject(err));
      });
      if (keysToDelete.length > 0) {
        await redis.del(...keysToDelete);
      }
      return;
    } catch (err) {
      console.warn(`[Redis] DEL pattern failed for ${pattern}`);
    }
  }
  const prefix = pattern.replace(/\*/g, "");
  for (const key of memoryCache.keys()) {
    if (key.includes(prefix)) memoryCache.delete(key);
  }
}

export async function cacheFlush(): Promise<void> {
  if (redis && redis.status === "ready") {
    try {
      await redis.flushdb();
    } catch (err) {
      console.warn("[Redis] FLUSH failed");
    }
  }
  memoryCache.clear();
}

export type RedisStatus = "connected" | "disconnected" | "disabled";

export function getRedisStatus(): RedisStatus {
  if (!REDIS_ENABLED) return "disabled";
  if (redis && redis.status === "ready") return "connected";
  return "disconnected";
}

export function isRedisReady(): boolean {
  return redis !== null && redis.status === "ready";
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => {});
    redis = null;
  }
}
