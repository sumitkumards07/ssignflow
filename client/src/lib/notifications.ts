import { LocalNotifications } from '@capacitor/local-notifications';

export async function requestNotificationPermissions() {
    try {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
    } catch (error) {
        console.error("Error requesting notification permissions:", error);
        return false;
    }
}

export async function scheduleNotification(
    id: number,
    title: string,
    body: string,
    scheduleTime: Date
) {
    try {
        // Check if time is in the future
        if (scheduleTime.getTime() <= Date.now()) {
            console.warn("Notification time is in the past, skipping.");
            return;
        }

        const sound = localStorage.getItem('alarm_sound') || undefined;
        // Map sound names to resource files if needed, or use directly if they match
        // Android resources should be lowercase and without extension in some contexts, 
        // but Capacitor usually takes the filename. 
        // Let's assume the values 'chime', 'melody', 'alert' match the raw files.
        // If 'default', we pass undefined to use system default.
        const soundPath = sound && sound !== 'default' ? `${sound}.mp3` : undefined;

        await LocalNotifications.schedule({
            notifications: [
                {
                    title,
                    body,
                    id,
                    schedule: { at: scheduleTime },
                    sound: soundPath,
                    attachments: undefined,
                    actionTypeId: "",
                    extra: null,
                    channelId: sound && sound !== 'default' ? sound : undefined // Use channel for custom sounds on Android 8+
                }
            ]
        });

        // Create channel if custom sound (Android 8+)
        if (sound && sound !== 'default') {
            await LocalNotifications.createChannel({
                id: sound,
                name: sound.charAt(0).toUpperCase() + sound.slice(1),
                importance: 5, // High importance
                description: `Channel for ${sound} alarms`,
                sound: `${sound}.mp3`,
                visibility: 1,
                vibration: true,
            });
        }

        console.log(`Notification scheduled for ${scheduleTime.toLocaleString()} with sound: ${soundPath}`);
    } catch (error) {
        console.error("Error scheduling notification:", error);
    }
}
