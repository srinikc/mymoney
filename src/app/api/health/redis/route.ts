import { NextResponse } from "next/server";
import { getRedisStatus } from "@/lib/redis";

export async function GET() {
  const status = getRedisStatus();
  return NextResponse.json({
    status,
    enabled: process.env.REDIS_ENABLED !== "false",
    url: (process.env.REDIS_URL || "redis://localhost:6379").replace(
      /:([^:@]+)@/,
      ":***@"
    ),
    timestamp: new Date().toISOString(),
  });
}
