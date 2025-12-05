import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Bell, BellOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";

interface ClashMessage {
    id: string;
    userId: string;
    content: string;
    timestamp: string;
}

interface ClashChatProps {
    currentUser: any;
    onClose: () => void;
}

export function ClashChat({ currentUser, onClose }: ClashChatProps) {
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const [notificationsEnabled, setNotificationsEnabled] = useState(currentUser?.clashChatNotifications ?? true);

    // Poll for messages every 3 seconds
    const { data: messages = [] } = useQuery<ClashMessage[]>({
        queryKey: ["clashMessages"],
        queryFn: async () => {
            const res = await fetch("/api/clash/messages");
            if (!res.ok) throw new Error("Failed to fetch messages");
            return res.json();
        },
        refetchInterval: 3000,
    });

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle notifications
    useEffect(() => {
        const checkPermission = async () => {
            const permission = await LocalNotifications.checkPermissions();
            if (permission.display !== 'granted') {
                await LocalNotifications.requestPermissions();
            }
        };
        checkPermission();

        // Listen for app state changes to handle background notifications if needed
        // For now, we rely on polling and local notifications when app is open or backgrounded (if we had background fetch)
        // Since we don't have background fetch, we can only notify if the app is open but maybe in another tab?
        // Actually, without push notifications, we can't notify when app is killed.
        // But we can notify when app is in background if we have a background task (which we don't).
        // So we'll just show notifications when the chat is NOT open or app is in foreground.
    }, []);

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch("/api/clash/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            if (!res.ok) throw new Error("Failed to send message");
            return res.json();
        },
        onSuccess: () => {
            setInput("");
            queryClient.invalidateQueries({ queryKey: ["clashMessages"] });
        },
    });

    // Toggle notifications mutation
    const toggleNotificationsMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            const res = await fetch("/api/user/settings/clash-notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled }),
            });
            if (!res.ok) throw new Error("Failed to update settings");
            return res.json();
        },
        onSuccess: (_, enabled) => {
            setNotificationsEnabled(enabled);
            // Update local user cache if needed
        },
    });

    const handleSend = () => {
        if (!input.trim()) return;
        sendMessageMutation.mutate(input);
    };

    const handleToggleNotifications = () => {
        toggleNotificationsMutation.mutate(!notificationsEnabled);
    };

    // Notify on new messages if not from current user
    useEffect(() => {
        if (!notificationsEnabled) return;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.userId !== currentUser.id) {
            const msgTime = new Date(lastMessage.timestamp).getTime();
            const now = Date.now();
            // Only notify if message is recent (last 5 seconds) to avoid spam on load
            if (now - msgTime < 5000) {
                LocalNotifications.schedule({
                    notifications: [{
                        title: "Clash Zone",
                        body: lastMessage.content,
                        id: Math.floor(Math.random() * 100000),
                        schedule: { at: new Date(Date.now() + 100) },
                        sound: undefined,
                        attachments: undefined,
                        actionTypeId: "",
                        extra: null
                    }]
                }).catch(console.error);
            }
        }
    }, [messages, notificationsEnabled, currentUser.id]);

    return (
        <div className="flex flex-col h-[500px] bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
                <h3 className="font-bold flex items-center gap-2">
                    <span className="text-xl">💬</span> Clash Chat
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleToggleNotifications}
                        className={`p-2 rounded-full transition-colors ${notificationsEnabled ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}
                    >
                        {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    const isMe = msg.userId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe
                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                    : 'bg-secondary text-foreground rounded-tl-none'
                                }`}>
                                <p>{msg.content}</p>
                                <span className="text-[10px] opacity-70 block text-right mt-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-full disabled:opacity-50 transition-opacity"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
