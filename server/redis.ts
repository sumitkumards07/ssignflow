import Redis from "ioredis";

// Use environment variable or default to localhost
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient: Redis | undefined;

try {
    console.log(`[Redis] Initializing client...`);
    redisClient = new Redis(redisUrl, {
        lazyConnect: true, // Don't connect immediately
        retryStrategy: (times) => {
            if (times > 3) {
                console.warn("[Redis] Connection retries exhausted. Disabling Redis.");
                return null;
            }
            return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 1
    });

    redisClient.on('error', (err) => {
        // Suppress unhandled error if Redis is not running
        if ((err as any).code === 'ECONNREFUSED') {
            // Only log once or handle quietly
        } else {
            console.warn('[Redis] Error:', err.message);
        }
    });

    // Attempt connection
    redisClient.connect().catch(() => {
        console.warn("[Redis] Failed to connect on startup (Lazy mode). Will use DB fallback.");
    });

} catch (e) {
    console.warn('[Redis] Initialization exception:', e);
}

export const redis = redisClient;

// Helper to update leaderboard
export async function updateLeaderboardScore(userId: string, score: number) {
    if (!redis || redis.status !== 'ready') return;
    try {
        await redis.zadd('leaderboard', score, userId);
    } catch (e) {
        // Silent fail - data is in DB anyway
    }
}

// Helper to get leaderboard
export async function getRedisLeaderboard(limit = 50): Promise<{ userId: string, score: number }[] | null> {
    if (!redis || redis.status !== 'ready') return null;
    try {
        // ZREVRANGE leaderboard 0 limit WITHSCORES
        const result = await redis.zrevrange('leaderboard', 0, limit - 1, 'WITHSCORES');
        // result is [userId, score, userId, score]
        const leaderboard: { userId: string, score: number }[] = [];
        for (let i = 0; i < result.length; i += 2) {
            leaderboard.push({ userId: result[i], score: parseInt(result[i + 1], 10) });
        }
        return leaderboard;
    } catch (e) {
        console.error('[Redis] Fetch failed:', e);
        return null;
    }
}
