import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';

const BACKUP_FILENAME = 'assignflow_backup.json';

export const backupData = async (silent = false) => {
    // Check permissions first
    try {
        const perm = await Filesystem.checkPermissions();
        if (perm.publicStorage !== 'granted') {
            const req = await Filesystem.requestPermissions();
            if (req.publicStorage !== 'granted') {
                throw new Error("Storage permission denied");
            }
        }
    } catch (e) {
        console.warn("Permission check failed:", e);
        // Continue anyway as some devices might not need explicit permission for app-private storage
    }

    const data = {
        user: localStorage.getItem('user'),
        my_tasks: localStorage.getItem('my_tasks'),
        pomodoro_settings: localStorage.getItem('pomodoro_settings'),
        ui_theme: localStorage.getItem('ui-theme'),
        theme_color: localStorage.getItem('theme-color'),
        timestamp: new Date().toISOString(),
    };

    const tryBackup = async (directory: Directory) => {
        await Filesystem.writeFile({
            path: BACKUP_FILENAME,
            data: JSON.stringify(data),
            directory: directory,
            encoding: Encoding.UTF8,
        });
    };

    try {
        // Try Documents first (User visible)
        try {
            await tryBackup(Directory.Documents);
        } catch (e) {
            console.warn('Backup to Documents failed, trying External:', e);
            // Try External (User visible on some Androids)
            try {
                await tryBackup(Directory.External);
            } catch (e2) {
                console.warn('Backup to External failed, trying Data:', e2);
                // Fallback to Data (App specific, but persistent)
                await tryBackup(Directory.Data);
            }
        }

        localStorage.setItem('last_backup_time', data.timestamp);
        if (!silent) {
            await Toast.show({
                text: 'Backup saved successfully',
            });
        }
        return true;
    } catch (error) {
        console.error('Backup failed:', error);
        if (!silent) {
            await Toast.show({
                text: 'Backup failed: ' + (error instanceof Error ? error.message : String(error)),
            });
        }
        return false;
    }
};

export const restoreData = async (silent = false) => {
    // Check permissions first
    try {
        const perm = await Filesystem.checkPermissions();
        if (perm.publicStorage !== 'granted') {
            await Filesystem.requestPermissions();
        }
    } catch (e) {
        console.warn("Permission check failed:", e);
    }

    const tryRestore = async (directory: Directory) => {
        return await Filesystem.readFile({
            path: BACKUP_FILENAME,
            directory: directory,
            encoding: Encoding.UTF8,
        });
    };

    try {
        let result;
        try {
            result = await tryRestore(Directory.Documents);
        } catch (e) {
            try {
                result = await tryRestore(Directory.External);
            } catch (e2) {
                result = await tryRestore(Directory.Data);
            }
        }

        const data = JSON.parse(result.data as string);

        if (data.user) localStorage.setItem('user', data.user);
        if (data.my_tasks) localStorage.setItem('my_tasks', data.my_tasks);
        if (data.pomodoro_settings) localStorage.setItem('pomodoro_settings', data.pomodoro_settings);
        if (data.ui_theme) localStorage.setItem('ui-theme', data.ui_theme);
        if (data.theme_color) localStorage.setItem('theme-color', data.theme_color);

        if (!silent) {
            await Toast.show({
                text: 'Data restored successfully. Restarting...',
            });
        }

        setTimeout(() => {
            window.location.reload();
        }, 1500);

        return true;
    } catch (error) {
        console.error('Restore failed:', error);
        if (!silent) {
            await Toast.show({
                text: 'Restore failed. No backup found?',
            });
        }
        return false;
    }
};
