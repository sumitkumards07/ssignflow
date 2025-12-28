// UpdateService.ts - OTA Update Service
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { getApiBaseUrl } from './queryClient';

interface UpdateInfo {
    updateAvailable: boolean;
    latestVersion: string;
    currentVersion: string;
    updateUrl?: string;
    releaseNotes?: string;
}

class UpdateService {
    private apiBaseUrl: string;

    constructor() {
        this.apiBaseUrl = getApiBaseUrl();
    }

    async checkForUpdate(): Promise<UpdateInfo> {
        try {
            const currentVersion = await this.getCurrentVersion();
            const response = await fetch(`${this.apiBaseUrl}/api/updates/check?version=${currentVersion}`);

            if (!response.ok) {
                throw new Error('Failed to check for updates');
            }

            return await response.json();
        } catch (error) {
            console.error('Update check failed:', error);
            return {
                updateAvailable: false,
                latestVersion: '',
                currentVersion: '',
            };
        }
    }

    async getCurrentVersion(): Promise<string> {
        try {
            const bundle = await CapacitorUpdater.current() as any;
            if (bundle && bundle.version) {
                return bundle.version;
            }
        } catch (e) {
            // Fallback to package version
        }
        return '1.0.23'; // Fallback version
    }

    async downloadAndApplyUpdate(updateUrl: string, version: string): Promise<boolean> {
        try {
            const bundle = await CapacitorUpdater.download({
                url: updateUrl,
                version: version,
            });

            await CapacitorUpdater.set({ id: bundle.id });
            return true;
        } catch (error) {
            console.error('Update download failed:', error);
            return false;
        }
    }
}

export default new UpdateService();
