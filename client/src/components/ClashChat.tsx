import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Send, X, Bell, BellOff, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMessages, sendMessage as sendChatMessage } from "@/lib/chatService";
import type { ClashMessage } from "@/lib/types";
import { ChatErrorBoundary } from "./ChatErrorBoundary";

import { ProUpgradeModal } from "./ProUpgradeModal";

interface ClashChatProps {
    currentUser: any;
    onClose: () => void;
    hasGroups: boolean;
    // Props made optional as component now self-manages
    messages?: ClashMessage[];
    isLoading?: boolean;
    onMessageSent?: () => void;
    groupId?: string;
    groupName?: string;
    isGlobal?: boolean;
    className?: string;
}

function ClashChatInner({ currentUser, onClose, hasGroups, groupId, groupName, isGlobal, className }: ClashChatProps) {
    // Early return with null for missing user - safe
    if (!currentUser) return null;
    const [input, setInput] = useState("");
    const queryClient = useQueryClient(); // Add this line
    const scrollRef = useRef<HTMLDivElement>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(currentUser?.clashChatNotifications ?? true);
    const [showProModal, setShowProModal] = useState(false);

    // INSTANT CACHE: Read from localStorage directly for zero-delay initial render
    const getCachedMessages = (): ClashMessage[] => {
        try {
            const cacheKey = `chat-cache-${groupId}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (e) {
            console.warn("Cache read failed", e);
        }
        return [];
    };

    // React Query with INSTANT localStorage data
    const {
        data: messages = getCachedMessages(),
        isLoading,
        error,
        isFetching
    } = useQuery({
        queryKey: ['clash-messages', groupId],
        queryFn: async () => {
            const data = await getMessages(groupId || '');
            // Save to localStorage for next instant load
            try {
                localStorage.setItem(`chat-cache-${groupId}`, JSON.stringify(data));
            } catch (e) { /* ignore storage errors */ }
            return data;
        },
        enabled: !!groupId,
        refetchInterval: 2000,
        staleTime: Infinity, // Never consider stale - we manage freshness ourselves
        gcTime: 1000 * 60 * 60 * 24,
        refetchOnMount: true,
        placeholderData: getCachedMessages, // Show cached instantly while fetching
    });

    // Ensure we always have a safe array for rendering
    const safeMessages = Array.isArray(messages) ? messages : [];

    // Scroll to bottom when messages change (instant, no animation)
    useEffect(() => {
        if (scrollRef.current && safeMessages.length > 0) {
            scrollRef.current.scrollIntoView({ behavior: "auto" });
        }
    }, [safeMessages.length]);

    // Format timestamp helper - with try-catch to prevent crashes
    const formatTimestamp = (timestamp: string | undefined | null): string => {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch {
            return '';
        }
    };

    // Send message mutation - FULLY SYNCHRONOUS optimistic update
    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!groupId) throw new Error("No group selected");
            await sendChatMessage(groupId, content);
        },
        onMutate: (newContent) => {
            if (!groupId) return;
            // SYNCHRONOUS: Don't await cancelQueries - just update immediately
            queryClient.cancelQueries({ queryKey: ['clash-messages', groupId] });
            const previousMessages = queryClient.getQueryData<ClashMessage[]>(['clash-messages', groupId]) || [];

            const optimisticMessage: ClashMessage = {
                id: `temp-${Date.now()}`,
                content: newContent,
                userId: currentUser.id,
                groupId: groupId,
                timestamp: new Date().toISOString(),
                user: {
                    id: currentUser.id,
                    username: currentUser.username,
                    displayName: currentUser.displayName
                }
            };

            const newMessages = [...previousMessages, optimisticMessage];
            queryClient.setQueryData<ClashMessage[]>(['clash-messages', groupId], newMessages);

            // Also update localStorage for persistence
            try {
                localStorage.setItem(`chat-cache-${groupId}`, JSON.stringify(newMessages));
            } catch (e) { /* ignore */ }

            setInput(""); // Clear input immediately
            return { previousMessages };
        },
        onError: (err, _, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(['clash-messages', groupId], context.previousMessages);
            }
            console.error("Send failed:", err);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['clash-messages', groupId] });
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
        <div
            className={cn(
                "flex flex-col h-[60vh] md:h-[500px] w-full bg-background border border-border rounded-3xl shadow-2xl overflow-hidden relative",
                className
            )}
        >
            {!hasGroups && (
                <div className="absolute inset-0 z-50 bg-background/80 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Join a Group</h3>
                    <p className="text-muted-foreground mb-6 max-w-xs">
                        You need to be a member of a group to participate in the Clash Chat.
                    </p>
                    <button onClick={onClose} className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium transition-colors">
                        Close Chat
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-purple-500/10 via-background to-pink-500/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="font-bold text-lg leading-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-200">
                            {groupId && groupId !== 'global' ? (groupName || 'Squad Chat') : 'Clash Chat'}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                            Logged in as: <span className="text-foreground">{currentUser?.displayName || currentUser?.username || 'Guest'}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleToggleNotifications}
                            className={cn("p-2.5 rounded-full transition-colors", notificationsEnabled ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground')}
                            title={notificationsEnabled ? "Mute Notifications" : "Enable Notifications"}
                        >
                            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages Area - STABLE & FAST (No Virtualization, No Animation) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-black/20 no-scrollbar hardware-accelerated">
                {isLoading && safeMessages.length === 0 ? (
                    <div className="flex flex-col gap-4 mt-auto">
                        <div className="w-2/3 h-12 bg-muted rounded-2xl rounded-tl-none" />
                        <div className="w-1/2 h-12 bg-muted rounded-2xl rounded-tr-none ml-auto" />
                        <div className="w-3/4 h-12 bg-muted rounded-2xl rounded-tl-none" />
                    </div>
                ) : safeMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-sm font-medium">No chatter yet.</p>
                        <p className="text-xs text-muted-foreground">Be the first to break silence.</p>
                    </div>
                ) : (
                    <div className="flex flex-col justify-end min-h-0">
                        {safeMessages.map((msg, index) => {
                            if (!msg) return null; // Safety Check
                            const isMe = msg.userId === currentUser?.id;
                            const isNextSameUser = index < safeMessages.length - 1 && safeMessages[index + 1]?.userId === msg.userId;

                            return (
                                <div
                                    key={msg.id || index}
                                    className={cn(
                                        "flex flex-col gap-1 mb-2 select-text",
                                        isMe ? "items-end" : "items-start",
                                        !isNextSameUser ? "mb-4" : ""
                                    )}
                                >
                                    <div className="flex items-end gap-2 max-w-[85%]">
                                        {!isMe && (
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mb-1">
                                                {msg.user?.username?.[0]?.toUpperCase() || "?"}
                                            </div>
                                        )}
                                        <div
                                            className={cn(
                                                "p-3 rounded-2xl text-sm font-medium shadow-sm break-words",
                                                isMe
                                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                    : "bg-white dark:bg-zinc-800 text-foreground border border-border rounded-tl-sm"
                                            )}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                    {!isNextSameUser && (
                                        <span className="text-[9px] text-muted-foreground font-medium px-1 opacity-70">
                                            {msg.user?.displayName || msg.user?.username || "Unknown"} • {formatTimestamp(msg.timestamp)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={scrollRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-background border-t border-border mt-auto relative z-10 shrink-0">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex gap-2 items-center"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={!hasGroups ? "Join a group to chat..." : (isGlobal ? "Broadcast to everyone..." : "Message squad...")}
                        disabled={!hasGroups || sendMessageMutation.isPending}
                        className="flex-1 bg-secondary/50 border-0 focus:ring-1 focus:ring-primary h-11 rounded-xl px-4 text-sm transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || !hasGroups || sendMessageMutation.isPending}
                        className={cn(
                            "h-11 w-11 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95",
                            !input.trim() || !hasGroups
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
                        )}
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </form>
            </div>
            <ProUpgradeModal open={showProModal} onOpenChange={setShowProModal} />
        </div>
    );
}

// Export wrapped in ErrorBoundary for crash protection
export function ClashChat(props: ClashChatProps) {
    return (
        <ChatErrorBoundary>
            <ClashChatInner {...props} />
        </ChatErrorBoundary>
    );
}
