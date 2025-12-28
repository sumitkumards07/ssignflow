export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    content: string;
    createdAt: string; // ISO string
}

export interface ClashMessage {
    id: string;
    userId: string;
    groupId: string | null;
    content: string;
    timestamp: string;
    user?: {
        username: string;
        displayName: string | null;
        id?: string;
    };
}

// Existing Todo interface retained
export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
    time?: string;
    hasAlarm?: boolean;
    category?: 'morning' | 'work' | 'night' | 'general';
    date?: string; // ISO date string YYYY-MM-DD
}
