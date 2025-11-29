import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

export class MobileAuth {
    /**
     * Initiate Google OAuth flow in mobile app
     */
    static async loginWithGoogle(baseUrl: string) {
        try {
            // Open OAuth in external browser (better for deep links)
            const authUrl = `${baseUrl}/api/auth/google?platform=mobile`;

            console.log('Opening OAuth URL:', authUrl);

            await Browser.open({
                url: authUrl,
                windowName: '_system', // Use external browser
            });

            // Listen for deep link callback
            return new Promise((resolve, reject) => {
                const listener = App.addListener('appUrlOpen', async (data: { url: string }) => {
                    console.log('Deep link received:', data.url);

                    // Check if this is our OAuth callback
                    if (data.url.startsWith('assignflow://auth/callback')) {
                        console.log('OAuth callback detected, closing browser');

                        // Close the browser (might not work with external browser)
                        try {
                            await Browser.close();
                        } catch (e) {
                            console.log('Could not close browser:', e);
                        }

                        // Parse the callback URL
                        const url = new URL(data.url);
                        const success = url.searchParams.get('success');
                        const userDataEncoded = url.searchParams.get('user');

                        console.log('OAuth result:', { success, userDataEncoded: userDataEncoded?.substring(0, 50) });

                        if (success === 'true' && userDataEncoded) {
                            try {
                                const userData = JSON.parse(decodeURIComponent(userDataEncoded));
                                console.log('Parsed user data:', userData);
                                resolve({ user: userData });
                            } catch (parseError) {
                                console.error('Error parsing user data:', parseError);
                                reject(new Error('Invalid user data'));
                            }
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
