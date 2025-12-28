import { Worker, Job } from 'bullmq';
import { storage } from './storage';
import { updateLeaderboardScore } from './redis';

// Connection options (re-use from redis.ts or env)
const connection = {
    url: process.env.REDIS_URL || "redis://localhost:6379",
};

// Queue Names
export const QUEUE_NAMES = {
    SESSION_PROCESSING: 'session-processing',
    NOTIFICATIONS: 'notifications',
};

// Job Interfaces
interface SessionJobData {
    userId: string;
    duration: number;
    startedAt: string;
    endedAt: string;
    clientHash?: string;
}

// Worker Implementation
export function startWorker() {
    console.log('[Worker] Starting background worker...');

    const sessionWorker = new Worker(QUEUE_NAMES.SESSION_PROCESSING, async (job: Job<SessionJobData>) => {
        const { userId, duration, startedAt, endedAt, clientHash } = job.data;
        console.log(`[Worker] Processing session for user ${userId}: ${duration}m`);

        try {
            // 1. Anti-Cheat Verification (Strict)
            // Time Check: Declared duration vs Wall clock time
            const claimDuration = new Date(endedAt).getTime() - new Date(startedAt).getTime();
            const declaredDurationMs = duration * 60 * 1000;

            // Allow 2 min buffer (network latency / clock drift)
            const TOLERANCE_MS = 2 * 60 * 1000;
            const discrepancy = Math.abs(claimDuration - declaredDurationMs);

            let isVerified = true;
            let rejectionReason = "";

            if (discrepancy > TOLERANCE_MS) {
                console.warn(`[Worker] Suspicious session detected for user ${userId}. Claimed: ${duration}m, Actual diff: ${claimDuration / 60000}m`);
                isVerified = false;
                rejectionReason = "Timestamp mismatch";
            }

            // Time Travel Check: Future dates
            if (new Date(endedAt).getTime() > Date.now() + TOLERANCE_MS) {
                console.warn(`[Worker] Future session detected for user ${userId}. EndedAt: ${endedAt}`);
                isVerified = false;
                rejectionReason = "Time travel detected";
            }

            // If suspicious, we save it as unverified and DO NOT update leaderboard
            await storage.createPomodoroSession({
                userId,
                duration,
                startedAt,
                endedAt,
                clientHash,
                verified: isVerified
            });

            if (!isVerified) {
                console.warn(`[Worker] Skipped leaderboard update for unverified session: ${rejectionReason}`);
                return { status: 'rejected', reason: rejectionReason };
            }

            // 3. Update Redis Leaderboard
            const allSessions = await storage.getPomodoroSessions(userId);
            const totalMinutes = allSessions.reduce((sum, s) => sum + s.duration, 0);

            await updateLeaderboardScore(userId, totalMinutes);

            // 4. Check for Level Up / Tier Change
            let newTier = "Bronze";
            if (totalMinutes >= 500) newTier = "Silver";
            if (totalMinutes >= 1000) newTier = "Gold";
            if (totalMinutes >= 2500) newTier = "Platinum";
            if (totalMinutes >= 5000) newTier = "Diamond";
            if (totalMinutes >= 10000) newTier = "Ace";
            if (totalMinutes >= 25000) newTier = "Conqueror";

            // Update User in DB
            const user = await storage.getUser(userId);
            if (user && user.rankTier !== newTier) {
                // TODO: Send "Level Up" notification
                console.log(`[Worker] User ${userId} leveled up to ${newTier}!`);
            }

            await storage.updateUserRank(userId, newTier, totalMinutes);
            await storage.updateUserStats(userId, totalMinutes, user?.todayFocusTime || 0, user?.lastFocusDate || new Date().toISOString());

            return { status: 'success', totalMinutes, newTier };

        } catch (error) {
            console.error(`[Worker] Failed session job ${job.id}:`, error);
            throw error;
        }
    }, {
        connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        lockDuration: 30000
    });

    sessionWorker.on('completed', job => {
        console.log(`[Worker] Job ${job.id} completed!`);
    });

    sessionWorker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job?.id} failed with ${err.message}`);
    });
}
