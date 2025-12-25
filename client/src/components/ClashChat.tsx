import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Send, X, Bell, BellOff, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProUpgradeModal } from "./ProUpgradeModal";

interface ClashMessage {
    id: string;
    userId: string;
    content: string;
    timestamp: string;
    user?: {
        username: string;
        displayName: string | null;
    };
}

interface ClashChatProps {
    currentUser: any;
    onClose: () => void;
    hasGroups: boolean;
    messages: ClashMessage[];
    isLoading: boolean;
    onMessageSent: () => void;
    groupId?: string;
}

export function ClashChat({ currentUser, onClose, hasGroups, messages, isLoading, onMessageSent, groupId }: ClashChatProps) {
    if (!currentUser) return null;
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const [notificationsEnabled, setNotificationsEnabled] = useState(currentUser?.clashChatNotifications ?? true);
    const [showProModal, setShowProModal] = useState(false);
    const isPro = currentUser?.isPro;

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Format timestamp helper
    const formatTimestamp = (timestamp: string) => {
        if (!timestamp) return '...';
        return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!groupId) throw new Error("No group selected");
            const res = await apiRequest("POST", "/api/clash/messages", { content, groupId });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to send message");
            }
            return res.json();
        },
        onSuccess: () => {
            setInput(""); // Clear input on success
            onMessageSent(); // Trigger refetch in parent
        },
        onError: (error: Error) => {
            // Show error message to user
            alert(error.message);
        },
    });

    // Toggle notifications mutation
    const toggleNotificationsMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            const res = await apiRequest("POST", "/api/user/settings/clash-notifications", { enabled });
            return res.json();
        },
        onSuccess: (_, enabled) => {
            setNotificationsEnabled(enabled);
        },
    });

    const handleSend = () => {
        if (!input.trim() || sendMessageMutation.isPending || !hasGroups || !groupId) return;
        sendMessageMutation.mutate(input);
    };

    const handleToggleNotifications = () => {
        toggleNotificationsMutation.mutate(!notificationsEnabled);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="flex flex-col h-[60vh] md:h-[500px] w-full bg-background/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/5 relative"
        >
            {/* Access Control Overlay */}
            {!hasGroups && (
                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Join a Group</h3>
                    <p className="text-muted-foreground mb-6 max-w-xs">
                        You need to be a member of a group to participate in the Clash Chat.
                    </p>
                    <button onClick={onClose} className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors">
                        Close Chat
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 via-background to-pink-500/10">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="font-bold text-lg leading-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Clash Chat</h3>
                        <p className="text-xs text-muted-foreground font-medium">
                            Logged in as: <span className="text-foreground">{currentUser?.displayName || currentUser?.username || 'Guest'}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleToggleNotifications}
                        className={`p-2.5 rounded-full transition-all duration-300 ${notificationsEnabled
                            ? 'bg-primary/20 text-primary hover:bg-primary/30 ring-1 ring-primary/20'
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary ring-1 ring-white/5'
                            }`}
                        title={notificationsEnabled ? "Mute Notifications" : "Enable Notifications"}
                    >
                        {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors ring-1 ring-transparent hover:ring-destructive/20"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-background/50 scroll-smooth">
                {isLoading && messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="text-sm font-medium text-muted-foreground animate-pulse">Loading Chat...</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <p className="text-muted-foreground italic">Start the conversation!</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg: any) => {
                            const isMe = msg.userId === currentUser.id;
                            const username = msg.user?.username || "Unknown";
                            const displayName = msg.user?.displayName || username;

                            // Highlight mentions
                            const renderContent = (content: string) => {
                                const parts = content.split(/(@\w+)/g);
                                return parts.map((part, i) => {
                                    if (part.startsWith('@')) {
                                        return <span key={i} className="text-primary font-bold bg-primary/10 px-1 rounded">{part}</span>;
                                    }
                                    return part;
                                });
                            };

                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                >
                                    <span
                                        onClick={() => setInput(prev => `${prev}@${username} `)}
                                        className={`text-[10px] mb-1 px-1 cursor-pointer hover:underline ${isMe ? 'text-white/50' : 'text-muted-foreground'}`}
                                    >
                                        {displayName}
                                    </span>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-md backdrop-blur-sm ${isMe
                                        ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-none shadow-purple-500/20'
                                        : 'bg-secondary/80 text-foreground border border-white/5 rounded-tl-none shadow-black/5'
                                        }`}>
                                        <p className="leading-relaxed whitespace-pre-wrap break-words">{renderContent(msg.content)}</p>
                                        <span className={`text-[10px] block text-right mt-1.5 font-medium ${isMe ? 'text-white/70' : 'text-muted-foreground'}`}>
                                            {formatTimestamp(msg.timestamp)}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-background/80 backdrop-blur-md">
                <div className="flex gap-2 items-center bg-secondary/50 rounded-full p-1.5 border border-white/10 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
                        disabled={sendMessageMutation.isPending || !hasGroups}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sendMessageMutation.isPending || !hasGroups}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${!input.trim() || sendMessageMutation.isPending || !hasGroups
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-purple-500/25 hover:scale-105 active:scale-95'
                            }`}
                    >
                        {sendMessageMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 ml-0.5" />
                        )}
                    </button>
                </div>
            </div>
            <ProUpgradeModal open={showProModal} onOpenChange={setShowProModal} />
        </motion.div>
    );
}
