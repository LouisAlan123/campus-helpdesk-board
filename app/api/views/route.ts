import { NextResponse } from "next/server";
import { withRedis } from "@/lib/redis";

const VIEWS_KEY = "help:views";

export async function POST() {
  const views = await withRedis((redis) => redis.incr(VIEWS_KEY));

  if (views === null) {
    return NextResponse.json({ views: null, error: "Redis unavailable" });
  }

  return NextResponse.json({ views });
}

export async function GET() {
  let redisReachable = true;
  const current = await withRedis(async (redis) => {
    return redis.get(VIEWS_KEY);
  });
  if (current === null) {
    // Ambiguous: either the key doesn't exist yet, or Redis is down.
    // Probe with PING to tell the two cases apart.
    redisReachable = (await withRedis((redis) => redis.ping())) !== null;
  }

  if (!redisReachable) {
    return NextResponse.json({ views: null, error: "Redis unavailable" });
  }

  return NextResponse.json({ views: current ? Number(current) : 0 });
}
