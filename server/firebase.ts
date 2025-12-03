import admin from "firebase-admin";

// Initialize Firebase Admin
// In a real scenario, you would use a service account key file or environment variables
// For this demo/implementation without keys, we'll wrap it in a try-catch or check for env vars

let firebaseApp: admin.app.App | null = null;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin initialized successfully");
    } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT not found. Push notifications will be mocked.");
    }
} catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
}

export async function sendPushNotification(token: string, title: string, body: string) {
    if (!firebaseApp) {
        console.log(`[MOCK] Sending push to ${token}: ${title} - ${body}`);
        return true;
    }

    try {
        await firebaseApp.messaging().send({
            token,
            notification: {
                title,
                body,
            },
        });
        return true;
    } catch (error) {
        console.error("Error sending push notification:", error);
        return false;
    }
}

export async function sendMulticastNotification(tokens: string[], title: string, body: string) {
    if (!firebaseApp) {
        console.log(`[MOCK] Sending multicast push to ${tokens.length} tokens: ${title} - ${body}`);
        return { successCount: tokens.length, failureCount: 0 };
    }

    try {
        const response = await firebaseApp.messaging().sendEachForMulticast({
            tokens,
            notification: {
                title,
                body,
            },
        });
        return response;
    } catch (error) {
        console.error("Error sending multicast notification:", error);
        return { successCount: 0, failureCount: tokens.length };
    }
}
