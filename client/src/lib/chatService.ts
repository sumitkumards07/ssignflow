import { getApiBaseUrl } from '@/lib/queryClient';
import type { ClashMessage } from '@/lib/types';

/**
 * Fetch initial message history for a chat.
 */
export async function getMessages(chatId: string): Promise<ClashMessage[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
        const response = await fetch(`${getApiBaseUrl()}/api/clash/messages?groupId=${chatId}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error('Failed to fetch messages');
        }
        const data = (await response.json()) as ClashMessage[];
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            console.warn("Chat fetch timed out after 5s");
        } else {
            console.error("Failed to fetch messages:", error);
        }
        return [];
    }
}

/**
 * Send a new message.
 */
export async function sendMessage(chatId: string, content: string): Promise<void> {
    const payload = { content, senderId: 'me', groupId: chatId };
    const userStr = localStorage.getItem("user");
    let token = "";
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            token = user.apiToken || "";
        } catch (e) {
            console.error("Error parsing user from localStorage", e);
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for faster feedback

    try {
        const response = await fetch(`${getApiBaseUrl()}/api/clash/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Message send timed out - check your connection');
        }
        throw error;
    }
}


