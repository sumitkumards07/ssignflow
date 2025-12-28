import { getTodosFromStorage } from "@/lib/utils";

interface QueuedRequest {
    id: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    priority: 'high' | 'low';
    timestamp: number;
    retries: number;
}

export class SyncManager {
    private static instance: SyncManager;
    private queue: QueuedRequest[] = [];
    private isSyncing = false;
    private flushInterval: NodeJS.Timeout | null = null;
    private readonly FLUSH_DELAY = 10000; // 10 seconds
    private readonly MAX_RETRIES = 3;
    private readonly STORAGE_KEY = 'offline_sync_queue';

    private constructor() {
        this.loadQueue();
        this.startAutoFlush();
        window.addEventListener('online', this.handleOnline);
    }

    public static getInstance(): SyncManager {
        if (!SyncManager.instance) {
            SyncManager.instance = new SyncManager();
        }
        return SyncManager.instance;
    }

    private loadQueue() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.queue = JSON.parse(saved);
                console.log(`[SyncManager] Loaded ${this.queue.length} pending requests.`);
            }
        } catch (e) {
            console.error('[SyncManager] Failed to load offline queue:', e);
        }
    }

    private saveQueue() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
        } catch (e) {
            console.error('[SyncManager] Failed to save offline queue:', e);
        }
    }

    private startAutoFlush() {
        if (this.flushInterval) clearInterval(this.flushInterval);
        this.flushInterval = setInterval(() => {
            if (navigator.onLine && this.queue.length > 0) {
                this.flush();
            }
        }, this.FLUSH_DELAY);
    }

    private handleOnline = () => {
        console.log('[SyncManager] Connection restored. Flushing queue...');
        this.flush();
    };

    /**
     * Enqueue a request.
     * High priority requests trigger an immediate flush attempt.
     */
    public request(url: string, options: { method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', body?: any, priority?: 'high' | 'low' }) {
        const req: QueuedRequest = {
            id: crypto.randomUUID(),
            url,
            method: options.method,
            body: options.body,
            priority: options.priority || 'low',
            timestamp: Date.now(),
            retries: 0
        };

        // Deduplication for GET requests
        if (req.method === 'GET') {
            const existing = this.queue.find(r => r.url === req.url && r.method === 'GET');
            if (existing) {
                console.log(`[SyncManager] Deduplicated GET request for ${req.url}`);
                return; // Already queued
            }
        }

        this.queue.push(req);
        this.saveQueue();

        if (req.priority === 'high' && navigator.onLine) {
            // Debounce slightly to allow rapid high-priority actions to bundle
            setTimeout(() => this.flush(), 500);
        }
    }

    private async flush() {
        if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) return;

        this.isSyncing = true;

        // Process a batch (e.g., top 10)
        const batch = this.queue.sort((a, b) => {
            // High priority first, then older first
            if (a.priority === b.priority) return a.timestamp - b.timestamp;
            return a.priority === 'high' ? -1 : 1;
        }).slice(0, 10);

        console.log(`[SyncManager] Flushing ${batch.length} requests...`);

        // We'll process them one by one or use a composite endpoint if the server supported it.
        // For now, we'll iterate. Parallelizing can be risky for order-dependent ops, 
        // but for XP updates we usually want speed. Let's do parallel with a limit (Promise.all).

        const remaining: QueuedRequest[] = [...this.queue];
        const successfulIds: string[] = [];

        await Promise.allSettled(batch.map(async (req) => {
            try {
                const res = await fetch(req.url, {
                    method: req.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(req.body)
                });

                if (res.ok) {
                    successfulIds.push(req.id);
                } else {
                    // 4xx errors usually mean bad logic, not connection, so we might drop them or handle differently.
                    // 5xx we retry.
                    if (res.status >= 500 || res.status === 429) {
                        throw new Error(`Server error ${res.status}`);
                    } else {
                        console.warn(`[SyncManager] Request ${req.id} failed permanently: ${res.status}`);
                        successfulIds.push(req.id); // Mark as handled to remove from queue
                    }
                }
            } catch (err) {
                console.error(`[SyncManager] Request ${req.id} failed network:`, err);
                req.retries++;
                // If max retries, currently we keep it? Or drop? 
                // Let's keep it but backoff logic is handled by just not picking it up immediately ideally, but our sort order picks it up.
                // Simple version: keep it in queue.
            }
        }));

        this.queue = this.queue.filter(r => !successfulIds.includes(r.id));
        this.saveQueue();
        this.isSyncing = false;

        // If items remain, try again soon-ish if we just had partial success? 
        // The interval handles steady state.
    }

    // Helper to get pending count
    public getPendingCount() {
        return this.queue.length;
    }
}

export const syncManager = SyncManager.getInstance();
