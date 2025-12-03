import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { apiRequest } from './queryClient';

export async function registerPushNotifications() {
    if (!Capacitor.isNativePlatform()) {
        console.log("Push notifications not supported on web");
        return;
    }

    try {
        // Request permission
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive === 'granted') {
            // Register
            await PushNotifications.register();
        } else {
            console.log("Push notification permission denied");
        }
    } catch (error) {
        console.error("Error registering for push notifications:", error);
    }
}

export function addPushListeners() {
    if (!Capacitor.isNativePlatform()) return;

    PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ' + token.value);
        // Send token to server
        try {
            await apiRequest("POST", "/api/notifications/register", { token: token.value });
        } catch (error) {
            console.error("Failed to send push token to server:", error);
        }
    });

    PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
        const data = notification.notification.data;
        if (data && data.type === 'update' && data.apkUrl) {
            const UpdatePlugin = registerPlugin<any>('UpdatePlugin');
            UpdatePlugin.startUpdate({ apkUrl: data.apkUrl });
        }
    });
}
