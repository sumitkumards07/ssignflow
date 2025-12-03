import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';

const BACKUP_FILENAME = 'assignflow_backup.json';

export const backupData = async (silent = false) => {
    try {
        const data = {
            user: localStorage.getItem('user'),
            my_tasks: localStorage.getItem('my_tasks'),
            pomodoro_settings: localStorage.getItem('pomodoro_settings'),
            ui_theme: localStorage.getItem('ui-theme'),
            theme_color: localStorage.getItem('theme-color'),
            timestamp: new Date().toISOString(),
        };

        await Filesystem.writeFile({
            path: BACKUP_FILENAME,
            data: JSON.stringify(data),
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });

        localStorage.setItem('last_backup_time', data.timestamp);
        if (!silent) {
            await Toast.show({
                text: 'Backup saved to Documents folder',
            });
        }
        return true;
    } catch (error) {
        console.error('Backup failed:', error);
        if (!silent) {
            await Toast.show({
                text: 'Backup failed: ' + (error as any).message,
            });
        }
        return false;
    }
};

export const restoreData = async (silent = false) => {
    try {
        const result = await Filesystem.readFile({
            path: BACKUP_FILENAME,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });

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
