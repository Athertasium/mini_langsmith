import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: Redis | undefined;
}

export function getRedis(): Redis {
  if (!global._redisClient) {
    global._redisClient = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }
  return global._redisClient;
}

export interface DlqEntry {
  payload: Record<string, unknown>;
  error: string | null;
  failed_at: string;
}
