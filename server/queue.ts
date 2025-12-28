import { Queue } from 'bullmq';

const connection = {
    url: process.env.REDIS_URL || "redis://localhost:6379",
};

export const sessionQueue = new Queue('session-processing', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    }
});
