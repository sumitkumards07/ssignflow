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

        // Use 'selected_alarm' from localStorage, default to 'alarm1' if not set
        // But for actual notification sound on Android, we need a resource file.
        // Since we don't have custom files in res/raw yet, we should use the system default.
        // However, we can create a channel with 'IMPORTANCE_HIGH' to ensure it rings.

        const channelId = 'assignflow_alarm_channel';

        await LocalNotifications.schedule({
            notifications: [
                {
                    title,
                    body,
                    id,
                    schedule: { at: scheduleTime },
                    sound: undefined, // Use system default sound
                    attachments: undefined,
                    actionTypeId: "",
                    extra: null,
                    channelId: channelId
                }
            ]
        });

        // Create channel with high importance
        await LocalNotifications.createChannel({
            id: channelId,
            name: 'Task Alarms',
            importance: 5, // High importance
            description: 'Channel for task alarms',
            sound: undefined, // Use system default
            visibility: 1,
            vibration: true,
        });

        console.log(`Notification scheduled for ${scheduleTime.toLocaleString()}`);
    } catch (error) {
        console.error("Error scheduling notification:", error);
    }
}
