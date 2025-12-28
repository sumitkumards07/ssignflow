import type { Message } from '@/lib/types';

export default function ChatMessage({ message }: { message: Message }) {
    const isSent = message.senderId === 'me'; // placeholder logic
    return (
        <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-2`}>
            <div
                className={`max-w-xs px-4 py-2 rounded-lg text-sm ${isSent ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}
            >
                {message.content}
            </div>
        </div>
    );
}
