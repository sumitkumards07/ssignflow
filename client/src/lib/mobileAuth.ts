import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

export class MobileAuth {
    /**
     * Initiate Google OAuth flow in mobile app
     */
    static async loginWithGoogle(baseUrl: string) {
        try {
            // Open OAuth in in-app browser
            const authUrl = `${baseUrl}/api/auth/google?platform=mobile`;

            await Browser.open({
                url: authUrl,
                presentationStyle: 'popover',
            });

            // Listen for deep link callback
            return new Promise((resolve, reject) => {
                const listener = App.addListener('appUrlOpen', async (data: { url: string }) => {
                    // Check if this is our OAuth callback
                    if (data.url.startsWith('assignflow://auth/callback')) {
                        // Close the browser
                        await Browser.close();

                        // Parse the callback URL
                        const url = new URL(data.url);
                        const success = url.searchParams.get('success');
                        const userId = url.searchParams.get('userId');

                        if (success === 'true' && userId) {
                            resolve({ userId });
                        } else {
                            reject(new Error('OAuth failed'));
                        }

                        // Remove listener
                        listener.remove();
                    }
                });

                // Timeout after 5 minutes
                setTimeout(() => {
                    listener.remove();
                    reject(new Error('OAuth timeout'));
                }, 5 * 60 * 1000);
            });
        } catch (error) {
            console.error('Mobile OAuth error:', error);
            throw error;
        }
    }

    /**
     * Check if currently authenticated
     */
    static async checkAuth(baseUrl: string): Promise<any | null> {
        try {
            const response = await fetch(`${baseUrl}/api/auth/me`, {
                credentials: 'include',
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Auth check error:', error);
            return null;
        }
    }

    /**
     * Logout
     */
    static async logout(baseUrl: string) {
        try {
            await fetch(`${baseUrl}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}
