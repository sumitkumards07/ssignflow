import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ChatHeader from '@/components/ChatHeader';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { getMessages, sendMessage } from '@/lib/chatService';
import type { Message, ClashMessage } from '@/lib/types';

export default function Chat() {
    const [, setLocation] = useLocation();
    const [chatId, setChatId] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Extract chatId from URL (e.g., /chat/123)
    useEffect(() => {
        const path = window.location.pathname;
        const parts = path.split('/');
        const id = parts[2] || '';
        setChatId(id);
    }, []);

    // Load messages and poll for updates
    const { data: latestClashMessages } = useQuery({
        queryKey: ['messages', chatId],
        queryFn: () => getMessages(chatId),
        enabled: !!chatId,
        refetchInterval: 3000,
    });

    useEffect(() => {
        if (Array.isArray(latestClashMessages)) {
            const mapped: Message[] = latestClashMessages.map((cm: ClashMessage) => ({
                id: cm.id,
                chatId: cm.groupId || '',
                senderId: cm.userId,
                content: cm.content,
                createdAt: cm.timestamp
            }));
            setMessages(mapped);
        } else if (latestClashMessages) {
            console.warn("Received invalid message data:", latestClashMessages);
            setMessages([]);
        }
    }, [latestClashMessages]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const queryClient = useQueryClient();

    const handleSend = async (content: string) => {
        if (!content.trim()) return;

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: Message = {
            id: tempId,
            chatId: chatId,
            senderId: 'me',
            content: content,
            createdAt: new Date().toISOString()
        };

        // Optimistically update UI
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            await sendMessage(chatId, content);
            // Force immediate refresh from server
            await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        } catch (e) {
            console.error("Send failed", e);
            // Rollback on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Failed to send message");
        }
    };

    const handleBack = () => {
        setLocation('/'); // go back to home or previous page
    };

    return (
        <div className="chat-page flex flex-col h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
            <ChatHeader chatId={chatId} onBack={handleBack} />
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <ChatInput onSend={handleSend} />
        </div>
    );
}
