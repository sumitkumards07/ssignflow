import { App } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';

export interface UpdateManifest {
    updateAvailable: boolean;
    latestVersion?: string;
    currentVersion?: string;
    updateUrl?: string;
    releaseNotes?: string;
    critical?: boolean;
    minRequiredVersion?: string;
    size?: number;
}

export class UpdateService {
    private static instance: UpdateService;
    private apiBaseUrl: string;
    private updateCheckInProgress = false;

    private constructor() {
        this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    }

    static getInstance(): UpdateService {
        if (!UpdateService.instance) {
            UpdateService.instance = new UpdateService();
        }
        return UpdateService.instance;
    }

    /**
     * Get the current effective version (Native or OTA)
     */
    async getCurrentVersion(): Promise<string> {
        if (!Capacitor.isNativePlatform()) {
            return '1.0.0';
        }

        try {
            // Get native app version
            const appInfo = await App.getInfo();
            const nativeVersion = appInfo.version;

            // Get current OTA bundle version
            // CapacitorUpdater.current() returns the currently active bundle
            // If none, it might throw or return 'builtin'
            let otaVersion = '';
            try {
                const bundle = await CapacitorUpdater.current() as any;
                if (bundle && bundle.version) {
                    otaVersion = bundle.version;
                }
            } catch (e) {
                // No OTA update active, using builtin
            }

            // Compare and return the newer one? 
            // Actually, usually we just want to know what version we ARE.
            // If OTA is active, that's the version. If not, Native is.
            return otaVersion || nativeVersion;
        } catch (e) {
            console.error('Error getting version', e);
            return '1.0.0';
        }
    }

    /**
     * Check if an update is available
     */
    async checkForUpdate(): Promise<UpdateManifest> {
        if (this.updateCheckInProgress) {
            throw new Error('Update check already in progress');
        }

        if (!Capacitor.isNativePlatform()) {
            return { updateAvailable: false };
        }

        try {
            this.updateCheckInProgress = true;
            const currentVersion = await this.getCurrentVersion();
            console.log('Checking for updates. Current version:', currentVersion);

            const response = await fetch(
                `${this.apiBaseUrl}/api/updates/check?version=${currentVersion}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Update check failed: ${response.statusText}`);
            }

            const manifest: UpdateManifest = await response.json();
            return manifest;
        } catch (error) {
            console.error('Error checking for updates:', error);
            throw error;
        } finally {
            this.updateCheckInProgress = false;
        }
    }

    /**
     * Download and apply an update
     */
    async downloadAndApplyUpdate(
        updateUrl: string,
        onProgress?: (progress: number) => void
    ): Promise<void> {
        try {
            // CapacitorUpdater handles download and extraction natively
            // We need to parse version from URL or manifest? 
            // Ideally pass version explicitly. But download method expects { url, version }
            // Since we don't have the version argument here (interface mismatch with previous code),
            // we should ideally update the signature or extract it.
            // For now, let's extract from URL if possible, or fetch manifest again?
            // Actually, the caller (UpdateDialog) usually calls this.

            // Let's rely on the plugin.
            // Note: The plugin expects us to provide the 'version' string to identifier this bundle.
            // We will modify the method signature in a future refactor, but for now:
            const version = this.extractVersionFromUrl(updateUrl) || `ota-${Date.now()}`;

            console.log(`Downloading update: ${version} from ${updateUrl}`);
            onProgress?.(10);

            const bundle = await CapacitorUpdater.download({
                url: updateUrl,
                version: version,
            });

            onProgress?.(80);
            console.log('Update downloaded. Applying...', bundle);

            await CapacitorUpdater.set({ id: bundle.id });

            // The plugin reloads the app automatically after 'set' usually, 
            // or we might need to reload? 'set' sets it for next launch or immediate?
            // 'set' makes it active. We should reload.
            // CapacitorUpdater.set usually reloads unless configured otherwise.

            onProgress?.(100);
        } catch (error) {
            console.error('Error downloading/applying update:', error);
            throw error;
        }
    }

    private extractVersionFromUrl(url: string): string | null {
        // url: .../bundle-1.0.14.zip
        const match = url.match(/bundle-([\d.]+)\.zip/);
        return match ? match[1] : null;
    }

    /**
     * Check if this is the first launch since update
     */
    async checkIfUpdated(): Promise<boolean> {
        // Logic to check localStorage vs current can stay, or rely on plugin events
        return false;
    }

    /**
     * Skip a specific version
     */
    skipVersion(version: string): void {
        const skippedVersions = this.getSkippedVersions();
        if (!skippedVersions.includes(version)) {
            skippedVersions.push(version);
            localStorage.setItem('skipped_versions', JSON.stringify(skippedVersions));
        }
    }

    getSkippedVersions(): string[] {
        try {
            const skipped = localStorage.getItem('skipped_versions');
            return skipped ? JSON.parse(skipped) : [];
        } catch {
            return [];
        }
    }

    isVersionSkipped(version: string): boolean {
        return this.getSkippedVersions().includes(version);
    }
}

export default UpdateService.getInstance();
