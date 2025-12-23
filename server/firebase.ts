// import admin from "firebase-admin"; // Removed to avoid hard dependency

let firebaseApp: any = null;

// Initialize Firebase Admin dynamically
(async () => {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            // Dynamic import to allow running without firebase-admin installed (for size limits)
            const adminModule = await import("firebase-admin");
            const admin = adminModule.default || adminModule;

            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin initialized successfully");
        } else {
            console.warn("FIREBASE_SERVICE_ACCOUNT not found. Push notifications will be mocked.");
        }
    } catch (error) {
        console.warn("Firebase Admin failed to initialize (Module maybe missing):", error);
    }
})();


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
