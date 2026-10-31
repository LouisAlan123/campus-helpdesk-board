import { createClient, type RedisClientType } from "redis";

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: RedisClientType | undefined;
}

const COMMAND_TIMEOUT_MS = 750;

const client: RedisClientType =
  global._redisClient ??
  createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: COMMAND_TIMEOUT_MS,
      // Give up after a few quick attempts instead of retrying forever,
      // so a dead Redis never leaves the app hanging.
      reconnectStrategy: (retries) => (retries > 3 ? false : retries * 100),
    },
    // Fail commands immediately instead of queueing them while disconnected.
    disableOfflineQueue: true,
  });

client.on("error", (err) => {
  console.error("Redis client error:", err.message);
});

if (process.env.NODE_ENV !== "production") {
  global._redisClient = client;
}

let connecting: Promise<RedisClientType> | null = null;

async function ensureConnected(): Promise<RedisClientType> {
  if (client.isOpen) return client;
  if (!connecting) {
    connecting = client.connect().then(
      () => client,
      (err) => {
        connecting = null;
        throw err;
      }
    );
  }
  return connecting;
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Redis command timed out")),
      COMMAND_TIMEOUT_MS
    );
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Runs a Redis operation with a connect + command timeout. Returns null
 * (instead of throwing) whenever Redis is unreachable or too slow, so
 * callers can fall back to PostgreSQL rather than crash.
 */
export async function withRedis<T>(
  fn: (c: RedisClientType) => Promise<T>
): Promise<T | null> {
  try {
    const c = await withTimeout(ensureConnected());
    return await withTimeout(fn(c));
  } catch (err) {
    console.error("Redis unavailable, falling back to PostgreSQL:", err);
    return null;
  }
}
