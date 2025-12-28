import { useState } from 'react';

interface ChatInputProps {
    onSend: (content: string) => void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSend(text.trim());
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex p-4 border-t border-gray-700 bg-gray-900">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none"
            />
            <button
                type="submit"
                className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
            >
                Send
            </button>
        </form>
    );
}
