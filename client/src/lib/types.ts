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

