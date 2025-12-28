import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App } from '@capacitor/app';
import { getApiBaseUrl } from '@/lib/queryClient';


export interface UpdateInfo {
    updateAvailable: boolean;
    version: string;
    url: string;
    releaseNotes?: string;
    critical?: boolean;
    minRequiredVersion?: string;
    size?: number;
}

export class UpdateService {
    private static instance: UpdateService;
    private currentVersion: string = "1.0.0";
    private baseUrl: string;

    private constructor() {
        // Use the shared configuration for API base URL
        this.baseUrl = getApiBaseUrl();
        console.log(`[UpdateService] Initialized with baseUrl: ${this.baseUrl}`);
    }

    public static getInstance(): UpdateService {
        if (!UpdateService.instance) {
            UpdateService.instance = new UpdateService();
        }
        return UpdateService.instance;
    }

    /**
     * Initialize the service and get current app version
     */
    public async init(): Promise<void> {
        try {
            const info = await App.getInfo();
            this.currentVersion = info.version;
            console.log(`[UpdateService] Current App Version: ${this.currentVersion}`);
        } catch (e) {
            console.warn("[UpdateService] Failed to get app info, defaulting to 1.0.0", e);
        }
    }

    /**
     * Check for updates against the server
     */
    public async checkForUpdate(): Promise<UpdateInfo | null> {
        try {
            console.log(`[UpdateService] Checking for updates at ${this.baseUrl}/api/updates/check?version=${this.currentVersion}`);
            const response = await fetch(`${this.baseUrl}/api/updates/check?version=${this.currentVersion}`);
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            const data = await response.json();
            console.log("[UpdateService] Update check result:", data);

            if (!data.updateAvailable) {
                return null;
            }

            return {
                updateAvailable: true,
                version: data.latestVersion,
                url: data.updateUrl,
                releaseNotes: data.releaseNotes,
                critical: data.critical,
                minRequiredVersion: data.minRequiredVersion,
                size: data.size
            };
        } catch (error) {
            console.error("[UpdateService] Failed to check for updates:", error);
            return null;
        }
    }

    /**
     * Download and install the update
     * @param update The update info returned from check
     * @param onProgress Optional callback for download progress (not fully supported by plugin publicly, but useful placeholder)
     */
    public async performUpdate(update: UpdateInfo): Promise<void> {
        console.log(`[UpdateService] Starting update to v${update.version}...`);

        try {
            // Skip real download for placeholder URL (debug mode)
            if (update.url && update.url.includes('example.com')) {
                console.log('[UpdateService] Skipping real download for debug URL');
                // Simulate a short delay to mimic download
                await new Promise(res => setTimeout(res, 500));
                console.log('[UpdateService] Simulated update applied');
                // Trigger reload (optional)
                setTimeout(async () => {
                    await CapacitorUpdater.reload();
                }, 1000);
                return;
            }
            // 1. Download
            // Note: CapacitorUpdater.download handles verification internally if configured
            // We pass version to ensure tracking
            console.log(`[UpdateService] Downloading from ${update.url}`);
            let bundle;
            try {
                bundle = await CapacitorUpdater.download({
                    url: update.url,
                    version: update.version,
                });
            } catch (err: any) {
                // Handle "already exists" robustly
                if (err?.message?.includes('already exists') || err?.message?.includes('Asset already')) {
                    console.log("[UpdateService] Bundle already exists on device. Proceeding to set.");
                    bundle = { id: update.version, version: update.version };
                } else {
                    throw err;
                }
            }

            if (!bundle) {
                throw new Error("Download failed (bundle is null)");
            }

            // 2. Set (Install)
            console.log(`[UpdateService] Setting active bundle to ${bundle.id || update.version}`);
            await CapacitorUpdater.set({ id: bundle.id || update.version });

            // 3. Reload (Apply)
            console.log("[UpdateService] Reloading app...");
            // Add a small delay for UI to show "Restarting..."
            setTimeout(async () => {
                await CapacitorUpdater.reload();
            }, 1000);

        } catch (error: any) {
            console.error("[UpdateService] Update failed:", error);
            // Propagate original error message to UI
            throw error;
        }
    }

    /**
     * Wrapper used by UI components to download and apply update.
     * @param url The update URL.
     * @param onProgress Optional progress callback.
     */
    public async downloadAndApplyUpdate(url: string, onProgress?: (progress: number) => void): Promise<void> {
        // Construct a temporary UpdateInfo object using the provided URL.
        const tempUpdate: UpdateInfo = {
            updateAvailable: true,
            version: this.currentVersion,
            url,
            releaseNotes: undefined,
            critical: false,
            minRequiredVersion: undefined,
            size: undefined,
        };
        // If a progress callback is supplied, we could integrate it with the plugin (not implemented).
        // Directly call performUpdate which handles download, set, and reload.
        await this.performUpdate(tempUpdate);
    }

    /**
     * Clear any pending updates (reset state)
     */
    public async reset(): Promise<void> {
        try {
            await CapacitorUpdater.reset();
            console.log("[UpdateService] Updater reset.");
        } catch (e) {
            console.warn("[UpdateService] Reset failed:", e);
        }
    }
}

export const updateService = UpdateService.getInstance();
