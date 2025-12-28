

interface ChatHeaderProps {
    chatId: string;
    onBack: () => void;
}

export default function ChatHeader({ chatId, onBack }: ChatHeaderProps) {
    const partnerName = `Chat ${chatId}`;
    return (
        <div className="flex items-center p-4 border-b border-gray-700 bg-gray-900 text-white">
            <button onClick={onBack} className="mr-2 text-xl">←</button>
            <div className="flex-1 text-center font-semibold">{partnerName}</div>
        </div>
    );
}
