import React, { useState, useMemo, useEffect, useRef } from "react";
import StatsWorker from '@/workers/stats.worker?worker';

import { ChevronLeft, Flame, MoreHorizontal, ShieldCheck, Trophy, Zap, Target, Users, Sword, Package, Crown, Star, Lock, Award, Box, ChevronRight, AlertTriangle, Plus, Hash, Trash2 } from "lucide-react";
import confetti from "canvas-confetti";
import { getPtsLabel } from "@/lib/design-system";
import { BottomNav } from "@/components/layout/BottomNav";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, subDays, subWeeks, startOfYear, endOfYear, eachMonthOfInterval, getYear, getWeek } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";
import { useLocation } from "wouter";
import { ClashChat } from "@/components/ClashChat";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { ProUpgradeModal } from "@/components/ProUpgradeModal";
import { Skeleton } from "@/components/ui/skeleton";
import { usePassStore } from "@/lib/stores/passStore";

interface PomodoroSession {
    taskId: string;
    taskName: string;
    duration: number;
    date: string;
    timestamp: number;
}

const getLevelInfo = (xp: number) => {
    // Duolingo curve: xp = level^2 * 100
    // level = sqrt(xp / 100)
    const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)));
    const currentLevelXP = Math.pow(level, 2) * 100;
    const nextLevelXP = Math.pow(level + 1, 2) * 100;
    const progressXP = Math.max(0, xp - currentLevelXP);
    const neededXP = nextLevelXP - currentLevelXP;
    const percentage = (progressXP / neededXP) * 100;

    return { level, progressXP, neededXP, percentage };
};

const getRankInfo = (focusMinutes: number) => {
    const score = Math.round(focusMinutes);
    // Restoration of Clash-Style Ranks (Heroic/Platinum/Gold/Silver/Bronze)
    if (score >= 10000) return { name: "Heroic", color: "text-red-500", icon: "💎", badge: "Elite", glow: "shadow-[0_0_25px_rgba(239,68,68,0.5)]", tier: 'HEROIC', medallion: 'border-red-500/50 bg-red-500/10' };
    if (score >= 5000) return { name: "Platinum", color: "text-blue-400", icon: "🔱", badge: "Expert", glow: "shadow-[0_0_20px_rgba(96,165,250,0.4)]", tier: 'PLATINUM', medallion: 'border-blue-400/50 bg-blue-400/10' };
    if (score >= 2500) return { name: "Gold", color: "text-yellow-500", icon: "🏆", badge: "Regular", glow: "shadow-[0_0_20px_rgba(234,179,8,0.4)]", tier: 'GOLD', medallion: 'border-yellow-500/50 bg-yellow-500/10' };
    if (score >= 1000) return { name: "Silver", color: "text-gray-400", icon: "🥈", badge: "Trainee", glow: "", tier: 'SILVER', medallion: 'border-gray-400/50 bg-gray-400/10' };
    return { name: "Bronze", color: "text-orange-700", icon: "🥉", badge: "Recruit", glow: "", tier: 'BRONZE', medallion: 'border-orange-700/50 bg-orange-700/10' };
};

const MISSION_TAGS = ["On a Hot Streak", "Top 1% This Week", "Flawless Focus", "Unyielding", "Daily Vanguard"];
const TACTICAL_STATUSES = ["⚡ Focus Session", "😴 Inactive", "🔥 On Fire", "🛡️ Shielded", "🚀 Deploying"];

// 3D Metal/Gem League Badges (CSS/SVG)
const LeagueBadge = ({ tier, size = "md" }: { tier: string, size?: "sm" | "md" | "lg" }) => {
    const colors: any = {
        HEROIC: "from-rose-500 to-red-700 border-red-400",
        PLATINUM: "from-cyan-400 to-blue-600 border-cyan-300",
        GOLD: "from-yellow-300 to-amber-500 border-yellow-200",
        SILVER: "from-slate-300 to-slate-500 border-slate-200",
        BRONZE: "from-orange-700 to-amber-900 border-orange-600"
    };

    const sizeClasses = {
        sm: "w-6 h-6 text-[8px]",
        md: "w-10 h-10 text-[10px]",
        lg: "w-16 h-16 text-xs"
    };

    return (
        <div className={cn(
            "rounded-xl flex items-center justify-center font-black italic text-white shadow-lg border-t relative overflow-hidden bg-gradient-to-br",
            colors[tier] || colors.BRONZE,
            sizeClasses[size]
        )}>
            <div className="absolute inset-0 bg-white/20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 40%, 0 100%)' }} />
            <span className="relative z-10 drop-shadow-md">{tier[0]}</span>
        </div>
    );
};
const LOOT_TABLE = [
    { id: 'common_50', name: '50 PTS Reward', rarity: 'common', weight: 70, icon: '🪙', color: 'text-rarity-common' },
    { id: 'rare_200', name: '200 PTS Reward', rarity: 'rare', weight: 25, icon: '💰', color: 'text-rarity-rare' },
    { id: 'legendary_skin', name: 'Elite Guard Frame', rarity: 'legendary', weight: 5, icon: '✨', color: 'text-rarity-legendary' }
];

const rollLoot = () => {
    const roll = Math.random() * 100;
    if (roll < 5) return LOOT_TABLE[2]; // Legendary
    if (roll < 30) return LOOT_TABLE[1]; // Rare
    return LOOT_TABLE[0]; // Common
};

function ProgressRing({ progress, size = 48, strokeWidth = 3, children, color = "var(--theme-primary)" }: { progress: number, size?: number, strokeWidth?: number, children: React.ReactNode, color?: string }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90 absolute">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-white/5"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{
                        filter: `drop-shadow(0 0 5px ${color})`,
                        transition: 'stroke-dashoffset 1s ease-in-out'
                    }}
                />
            </svg>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

// Memoized Leaderboard Item Component (League Journey Style)
const LeaderboardItem = React.memo(({ user, idx, isCurrentUser, rank }: { user: any, idx: number, isCurrentUser: boolean, rank: any }) => {
    const isTop1 = idx === 0;

    return (
        <div
            className={cn(
                "flex items-center justify-between transition-all group relative overflow-hidden",
                isTop1 ? "p-6 rounded-[2rem] bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.15)] z-10 scale-[1.02]" :
                    isCurrentUser ? "p-4 rounded-3xl bg-white/10 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]" : "p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10"
            )}
        >
            <div className="flex items-center gap-4 relative z-10">
                {/* Rank Position */}
                <div className={cn(
                    "flex flex-col items-center justify-center w-8 text-center",
                    isTop1 ? "text-yellow-400" : isCurrentUser ? "text-orange-500" : "text-zinc-500"
                )}>
                    <span className="text-sm font-black italic">#{idx + 1}</span>
                    {idx < 3 && <span className="text-[8px] font-bold uppercase opacity-60">Elite</span>}
                </div>

                {/* Avatar / Badge */}
                <LeagueBadge tier={rank.tier} size={isTop1 ? "lg" : "md"} />

                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "font-black tracking-tight",
                            isTop1 ? "text-xl text-white" : "text-sm text-zinc-200",
                            isCurrentUser ? "text-orange-400" : ""
                        )}>
                            {user.displayName || user.username}
                        </span>
                        {isCurrentUser && (
                            <span className="text-[8px] font-black bg-orange-500 text-black px-1.5 py-0.5 rounded uppercase">You</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-1 w-12 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", rank.color.replace('text-', 'bg-'))} style={{ width: '75%' }} />
                        </div>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">{Math.floor(user.totalFocusTime / 60)}h Focus</span>
                    </div>
                </div>
            </div>

            <div className="text-right relative z-10">
                <div className={cn(
                    "font-black italic tracking-tighter tabular-nums",
                    isTop1 ? "text-2xl text-yellow-400" : "text-lg text-white"
                )}>
                    {getPtsLabel(Math.round(user.totalFocusTime))}
                </div>
                <div className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.3em] mt-1">XP</div>
            </div>

            {/* Progress Bar for Promotion Zone */}
            {idx === 9 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />
            )}
        </div>
    );
});

const FocusSummaryCard = ({ stats }: { stats: any }) => {
    return (
        <div className="apple-glass p-6 rounded-[2rem] relative overflow-hidden group mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-system-blue/10 blur-[60px] rounded-full -mr-16 -mt-16" />
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex-1">
                    <h3 className="text-[10px] font-black text-system-blue uppercase tracking-[0.3em] mb-2">Performance Intelligence</h3>
                    <p className="text-lg font-black text-white italic tracking-tight leading-tight max-w-[80%]">
                        You were <span className="text-success-green">15% more focused</span> this Tuesday than last Tuesday.
                    </p>
                </div>
                <div className="w-16 h-16 rounded-3xl bg-system-blue/10 flex items-center justify-center border border-system-blue/20">
                    <Target className="w-8 h-8 text-system-blue" />
                </div>
            </div>
            <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-system-blue w-[75%] rounded-full" />
                </div>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">75% Recovery Reach</span>
            </div>
        </div>
    );
};

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<"pomodoro" | "battlefield" | "battlepass">("battlefield");
    const [chartView, setChartView] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showChat, setShowChat] = useState(false);
    const [isGroupLoading, setIsGroupLoading] = useState(false);
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const lastSeenMsgIdRef = useRef<string | null>(null);
    const { toast } = useToast();
    const { user } = useUser();
    const [showProModal, setShowProModal] = useState(false);
    const [xp, setXp] = useState(() => Number(localStorage.getItem("user_xp") || "0"));
    const [crates, setCrates] = useState(() => Number(localStorage.getItem("unopened_crates") || "0"));
    const [showLootBox, setShowLootBox] = useState(false);
    const [openingBox, setOpeningBox] = useState(false);
    const [revealedLoot, setRevealedLoot] = useState<any>(null);
    const [visibleCount, setVisibleCount] = useState(10);
    const claimReward = usePassStore((state: any) => state.claimReward);

    const sessions: PomodoroSession[] = JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]");

    // Tactical Heatmap Data (Last 7 Days)
    const heatmapData = useMemo(() => {
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const daySessions = sessions.filter(s => isSameDay(new Date(s.date), date));
            const totalMinutes = daySessions.reduce((acc, s) => acc + s.duration, 0);
            result.push({
                day: format(date, 'eee').toUpperCase(),
                minutes: totalMinutes,
                intensity: totalMinutes > 120 ? 4 : totalMinutes > 60 ? 3 : totalMinutes > 30 ? 2 : totalMinutes > 0 ? 1 : 0
            });
        }
        return result;
    }, [sessions]);

    // Calculate stats
    // --- WORKER INTEGRATION ---
    const workerRef = useRef<Worker | null>(null);
    const [stats, setStats] = useState({
        isRankAtRisk: false,
        hoursSinceLastFocus: 0,
        total: "0.0",
        week: "0.0",
        today: "0.0",
        focusDays: 0,
        completedGoalDays: 0,
        completionRate: 0,
        currentStreak: 0
    });
    const [monthDays, setMonthDays] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        workerRef.current = new StatsWorker();
        workerRef.current.onmessage = (e) => {
            const { stats, monthDays, chartData } = e.data;
            setStats(stats);
            // Convert date strings back to Date objects if needed for calendar components relying on isSameDay with Date objects
            // However, for rendering, we usually just need loops. 
            // Logic check: The worker returns date strings.
            // Line 669 (in original file, not visible but likely calendar rendering) uses monthDays.
            // Let's assume we map them back to Dates if strict typing is needed, or keep as strings.
            // Given standard "date-fns" usage in rendering often involves just showing date number, or comparing.
            // Let's convert back to be safe for "date-fns" comparators if used in JSX.

            // Actually, monthDays in worker returned { date: ISOString, ... }. 
            // If the UI maps over this and calls "getDate(day.date)", we need real dates.
            const parsedMonthDays = monthDays.map((d: any) => ({ ...d, date: new Date(d.date) }));
            setMonthDays(parsedMonthDays);

            setChartData(chartData);
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    useEffect(() => {
        workerRef.current?.postMessage({
            sessions,
            currentMonthStr: currentMonth.toISOString(),
            chartView
        });
    }, [sessions, currentMonth, chartView]);

    // Calendar data

    // Get days including previous/next month for full calendar grid
    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    // Today's sessions timeline
    const todaySessions = useMemo(() => {
        const today = format(new Date(), "yyyy-MM-dd");
        return sessions.filter(s => s.date === today);
    }, [sessions]);

    const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

    const [view, setView] = useState<'dashboard' | 'group_details' | 'battlepass'>('dashboard');
    const [selectedGroup, setSelectedGroup] = useState<any>(null); // Track selected group for full page view
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showJoinGroup, setShowJoinGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { apiRequest } = await import("@/lib/queryClient");
                const res = await apiRequest("GET", "/api/auth/me");
                const data = await res.json();
                setCurrentUser(data);
            } catch (error) {
                console.error("Failed to fetch user:", error);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const checkPermission = async () => {
            try {
                const permission = await LocalNotifications.checkPermissions();
                if (permission.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }
            } catch (e) {
                console.error("Notification permission error:", e);
            }
        };
        checkPermission();
    }, []);


    useEffect(() => {
        const syncStats = async () => {
            if (stats.total) {
                try {
                    const { apiRequest } = await import("@/lib/queryClient");
                    await apiRequest("POST", "/api/analytics/sync", {
                        totalTime: Math.round(parseFloat(stats.total) * 60),
                        todayTime: Math.round(parseFloat(stats.today) * 60),
                        date: format(new Date(), "yyyy-MM-dd")
                    });
                } catch (error) {
                    console.error("Failed to sync analytics:", error);
                }
            }
        };
        syncStats();
    }, [stats]);

    // Prefetch Data on Tab Hover
    const prefetchLeaderboard = () => {
        queryClient.prefetchQuery({
            queryKey: ["/api/users/leaderboard"],
            queryFn: async () => {
                const { apiRequest } = await import("@/lib/queryClient");
                const res = await apiRequest("GET", "/api/analytics/leaderboard");
                return res.json();
            },
        });
    };

    const { data: leaderboard = [] } = useQuery({
        queryKey: ["/api/users/leaderboard"],
        queryFn: async () => {
            const { apiRequest } = await import("@/lib/queryClient");
            const res = await apiRequest("GET", "/api/analytics/leaderboard");
            return res.json();
        },
        enabled: activeTab === "battlefield",
        staleTime: 1000 * 60 * 5,
    });

    const { data: groups = [], refetch: refetchGroups } = useQuery({
        queryKey: ["groups"],
        queryFn: async () => {
            const { apiRequest } = await import("@/lib/queryClient");
            const res = await apiRequest("GET", "/api/groups");
            return res.json();
        },
        enabled: true,
        staleTime: 1000 * 60 * 5
    });

    useEffect(() => {
        if (selectedGroup?.id) {
            queryClient.resetQueries({ queryKey: ["clashMessages"] });
        }
    }, [selectedGroup?.id, queryClient]);

    const handleCreateGroup = async () => {
        try {
            const { apiRequest } = await import("@/lib/queryClient");
            const res = await apiRequest("POST", "/api/groups", { name: newGroupName });
            await res.json();
            refetchGroups();
            setShowCreateGroup(false);
            setNewGroupName("");
        } catch (error) {
            console.error("Failed to create group:", error);
        }
    };

    const handleJoinGroup = async () => {
        try {
            const { apiRequest } = await import("@/lib/queryClient");
            const res = await apiRequest("POST", "/api/groups/join", { code: joinCode });
            await res.json();
            refetchGroups();
            setShowJoinGroup(false);
            setJoinCode("");
        } catch (error) {
            console.error("Failed to join group:", error);
            alert("Invalid code or already joined");
        }
    };

    // OPTIMIZED: Fetch Group Details (Members) Reactively
    const { data: groupDetails } = useQuery({
        queryKey: ["groupDetails", selectedGroup?.id],
        queryFn: async () => {
            if (!selectedGroup?.id) return null;
            const { apiRequest } = await import("@/lib/queryClient");
            const res = await apiRequest("GET", `/api/groups/${selectedGroup.id}`);
            if (!res.ok) throw new Error("Failed to fetch group details");
            return res.json();
        },
        enabled: !!selectedGroup?.id,
    });

    // Update members when details arrive
    useEffect(() => {
        if (groupDetails?.members) {
            setGroupMembers(groupDetails.members);
        }
    }, [groupDetails]);

    // OPTIMIZED: Instant Group Opening (Optimistic UI)
    const handleGroupClick = async (groupId: string) => {
        const group = groups.find((g: any) => g.id === groupId);
        if (group) {
            setSelectedGroup(group);
            // Optimistically switch view immediately
            setView('group_details');

            // Prefetch messages for speed
            queryClient.prefetchQuery({
                queryKey: ["clashMessages", groupId],
                queryFn: async () => {
                    const { apiRequest } = await import("@/lib/queryClient");
                    const res = await apiRequest("GET", `/api/clash/messages?groupId=${groupId}`);
                    if (!res.ok) return [];
                    const data = await res.json();
                    return Array.isArray(data) ? data : [];
                }
            });
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
        try {
            const { apiRequest } = await import("@/lib/queryClient");
            await apiRequest("DELETE", `/api/groups/${groupId}`);
            refetchGroups();
            setSelectedGroup(null);
        } catch (error) {
            console.error("Failed to delete group:", error);
            alert("Failed to delete group");
        }
    };
    const currentUserRank = useMemo(() => {
        if (!user || !leaderboard.length) return null;
        const index = leaderboard.findIndex((u: any) => u.id === user.id);
        if (index === -1) return null;
        return {
            rank: index + 1,
            user: leaderboard[index],
            nextUser: index > 0 ? leaderboard[index - 1] : null
        };
    }, [user, leaderboard]);

    const milestoneText = useMemo(() => {
        if (!currentUserRank) return "Analyzing operational data...";
        if (currentUserRank.rank === 1) return "You are the Field Marshall. Defend your rank!";
        if (!currentUserRank.nextUser) return "Keep focusing to climb the ranks!";

        const diff = Math.ceil(currentUserRank.nextUser.totalFocusTime - currentUserRank.user.totalFocusTime);
        return `You are ${diff || 1} PTS away from Rank #${currentUserRank.rank - 1}. Overtake ${currentUserRank.nextUser.displayName || currentUserRank.nextUser.username} now!`;
    }, [currentUserRank]);

    const streak = stats.currentStreak;
    const todayFocusMinutes = parseFloat(stats.today) * 60;

    return (
        <div className="min-h-dvh bg-background app-shell flex flex-col max-w-screen-xl mx-auto w-full overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 pt-safe-offset pb-4 flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border shrink-0 transition-none duration-0">
                <button
                    onClick={() => {
                        if (view === 'group_details') {
                            setView('dashboard');
                            setSelectedGroup(null);
                        } else {
                            window.history.back();
                        }
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-none"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        {selectedGroup ? selectedGroup.name : "Report"}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-400">💎 PRO</span>
                    </h1>
                </div>

                {/* Duolingo-Style Streak Header */}
                <div className="flex items-center gap-1 bg-zinc-900 border border-white/5 rounded-full px-3 py-1.5">
                    <Flame className={cn("w-4 h-4 fill-current", stats.currentStreak > 0 ? "text-orange-500" : "text-zinc-600")} />
                    <span className={cn("text-sm font-black font-mono", stats.currentStreak > 0 ? "text-orange-500" : "text-zinc-600")}>
                        {stats.currentStreak}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            {!selectedGroup && (
                <div className="flex border-b border-border bg-background sticky top-[60px] z-10">
                    <button
                        onClick={() => setActiveTab("battlefield")}
                        className={`flex-1 py-3 text-sm font-medium relative transition-colors flex items-center justify-center gap-2 ${activeTab === "battlefield" ? "text-primary" : "text-muted-foreground"}`}
                        style={activeTab === "battlefield" ? { color: 'var(--theme-primary)' } : {}}
                    >
                        <div className="flex items-center gap-2 relative">
                            <Sword className={`w-4 h-4 ${activeTab === "battlefield" ? "text-safety-orange" : ""}`} />
                            <span className={activeTab === "battlefield" ? "text-safety-orange font-bold" : ""}>Clash Zone</span>
                            {activeTab === "battlefield" && (
                                <span className="absolute -top-1 -right-2">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-system-blue blur-sm rounded-full opacity-50" />
                                        <span className="relative z-10 text-xs drop-shadow-md">✨</span>
                                    </div>
                                </span>
                            )}
                        </div>
                        {activeTab === "battlefield" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-safety-orange to-system-blue" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("pomodoro")}
                        className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === "pomodoro" ? "text-primary" : "text-muted-foreground"}`}
                        style={activeTab === "pomodoro" ? { color: 'var(--theme-primary)' } : {}}
                    >
                        Pomodoro
                        {activeTab === "pomodoro" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: 'var(--theme-primary)' }} />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("battlepass")}
                        className={`flex-1 py-3 text-sm font-medium relative transition-colors flex items-center justify-center gap-2 ${activeTab === "battlepass" ? "text-primary" : "text-muted-foreground"}`}
                        style={activeTab === "battlepass" ? { color: 'var(--theme-primary)' } : {}}
                    >
                        <ShieldCheck className={`w-4 h-4 ${activeTab === "battlepass" ? "text-cyan-400" : ""}`} />
                        <span className={activeTab === "battlepass" ? "text-cyan-400 font-bold" : ""}>Pass</span>
                        {activeTab === "battlepass" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600" />
                        )}
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-[120px] hardware-accelerated">
                {/* Pomodoro Tab */}
                <div className={activeTab === "pomodoro" && !selectedGroup ? "block" : "hidden"}>
                    <div
                        key="pomodoro"
                        className="space-y-6 p-4 sm:p-6"
                    >
                        {/* Bento Grid Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* Streak Card - Large */}
                            <div
                                className="col-span-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl shadow-orange-500/20"
                            >
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-white/20 backdrop-blur-md rounded-full p-1.5">
                                            <Flame className="w-4 h-4 text-white" fill="currentColor" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Current Streak</span>
                                    </div>
                                    <div className="text-5xl font-black">{stats.currentStreak}</div>
                                    <div className="text-xs font-bold mt-2 opacity-90">Days on Fire</div>
                                    <div className="mt-6 flex gap-1">
                                        {[...Array(7)].map((_, i) => (
                                            <div key={i} className={`h-1 flex-1 rounded-full ${i < stats.currentStreak % 7 ? 'bg-white' : 'bg-white/20'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="absolute -right-6 -bottom-6 opacity-20 transform rotate-12">
                                </div>
                            </div>

                            {/* Today Time */}
                            <div
                                className="bg-zinc-900 border border-white/5 rounded-[2rem] p-5 flex flex-col justify-between shadow-xl"
                            >
                                <div className="bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-primary" fill="currentColor" />
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-white tabular-nums">{stats.today}h</div>
                                    <div className="text-[9px] font-black uppercase tracking-tighter text-zinc-500">Today</div>
                                </div>
                            </div>

                            {/* Weekly Goal */}
                            <div
                                className="bg-card border border-border rounded-[2rem] p-5 flex flex-col justify-between shadow-xl"
                            >
                                <div className="bg-blue-500/20 rounded-full w-8 h-8 flex items-center justify-center">
                                    <Target className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-foreground tabular-nums">{stats.week}h</div>
                                    <div className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">This Week</div>
                                </div>
                            </div>

                            {/* Total Achievement */}
                            <div
                                className="col-span-2 bg-zinc-100 dark:bg-zinc-800 rounded-[2rem] p-6 flex items-center justify-between border border-border shadow-xl"
                            >
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Lifetime Focus</div>
                                    <div className="text-4xl font-black text-foreground tabular-nums">{stats.total} <span className="text-lg opacity-50 font-normal">HRS</span></div>
                                </div>
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center rotate-12 shadow-lg">
                                    <Trophy className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            {/* Level/XP card */}
                            <div
                                className="col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-500/20"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Rank</div>
                                        <div className="text-2xl font-black">Focus Master</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Level</div>
                                        <div className="text-2xl font-black">12</div>
                                    </div>
                                </div>
                                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                                    <div className="bg-white h-full w-[70%]" />
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] font-bold opacity-80">
                                    <span>700 / 1000 XP</span>
                                    <span>300 XP to Level 13</span>
                                </div>
                            </div>
                        </div>

                        {/* Pomodoro Records */}
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            <h3 className="text-sm font-semibold mb-4">Pomodoro Records</h3>
                            {todaySessions.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                    <div className="text-4xl mb-2" text-4xl mb-2="">📦</div>
                                    <div className="text-xs">No Data</div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {Array.from({ length: 24 }, (_, hour) => {
                                        const hourSessions = todaySessions.filter(s => new Date(s.timestamp).getHours() === hour);
                                        return (
                                            <div key={hour} className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground w-12">{hour}:00</span>
                                                <div className="flex-1 h-8 bg-secondary rounded relative overflow-hidden">
                                                    {hourSessions.map((session, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="absolute h-full opacity-50"
                                                            style={{
                                                                backgroundColor: 'var(--theme-primary)',
                                                                left: `${(new Date(session.timestamp).getMinutes() / 60) * 100}%`,
                                                                width: `${Math.max((session.duration / 60) * 100, 2)}%`
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Focus Time Goal */}
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            <h3 className="text-sm font-semibold mb-3">Focus Time Goal</h3>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                <span>Focus Days: {stats.focusDays} days</span>
                                <span style={{ color: 'var(--theme-primary)' }}>Goal: 3H</span>
                            </div>
                            {/* Calendar */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-secondary rounded-full">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm font-medium">{format(currentMonth, "MMM yyyy")}</span>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-secondary rounded-full">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Rank Decay Alert (Pomodoro Tab) */}
                                {stats.isRankAtRisk && (
                                    <div className="mb-4 mx-1 rounded-2xl bg-destructive-red/10 border border-destructive-red/20 p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
                                        <div className="w-8 h-8 rounded-full bg-destructive-red/20 flex items-center justify-center animate-pulse shrink-0">
                                            <AlertTriangle className="w-4 h-4 text-destructive-red" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-black text-destructive-red uppercase tracking-widest flex items-center gap-2">
                                                Rank Decay Active
                                                <span className="text-[9px] bg-destructive-red text-black px-1.5 rounded">WARN</span>
                                            </div>
                                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                                                -{Math.floor(stats.hoursSinceLastFocus - 48)} XP Penalty accumulating
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-7 gap-1">
                                    {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(day => (
                                        <div key={day} className="text-center text-[10px] text-muted-foreground py-1">{day}</div>
                                    ))}
                                    {calendarDays.map((day, index) => {
                                        const dayData = monthDays.find(d => isSameDay(d.date, day));
                                        const isCurrentMonth = isSameMonth(day, currentMonth);
                                        const isToday = isSameDay(day, new Date());
                                        return (
                                            <div
                                                key={index}
                                                className={`aspect-square flex items-center justify-center text-xs rounded-lg ${isToday ? "text-white font-bold" : !isCurrentMonth ? "text-muted-foreground/30" : "text-foreground"}`}
                                                style={isToday ? { backgroundColor: 'var(--theme-primary)' } : (dayData && dayData.sessions > 0 ? { backgroundColor: 'rgba(var(--theme-primary-rgb), 0.1)' } : {})}
                                            >
                                                {format(day, "d")}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Pro Tactical Insight Card (Pomodoro Tab) */}
                        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors" />
                            <div className="relative z-10 flex items-start gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                                    <Zap className="w-5 h-5 text-orange-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1">Predictive Operational Briefing</div>
                                    <div className="text-xs font-bold text-white/80 leading-relaxed italic tracking-tight">
                                        {stats.currentStreak > 0
                                            ? `Maintain your ${stats.currentStreak}-day streak to prevent Rank Decay. Elite Vanguard status requires 2h+ daily focus.`
                                            : "No active streak detected. Initiate focus session now to prevent XP penalty and stabilize global rank."
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Focus Time Chart */}
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            <h3 className="text-sm font-semibold mb-3">Focus Time Chart</h3>
                            <div className="flex gap-2 mb-4">
                                {(["daily", "weekly", "monthly", "yearly"] as const).map(view => (
                                    <button
                                        key={view}
                                        onClick={() => setChartView(view)}
                                        className={`px-4 py-2 rounded-full text-xs font-medium ${chartView === view ? "text-white" : "text-muted-foreground"}`}
                                        style={chartView === view ? { backgroundColor: 'var(--theme-primary)' } : {}}
                                    >
                                        {view}
                                    </button>
                                ))}
                            </div>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                                            interval={0}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(var(--theme-primary-rgb), 0.05)' }}
                                            contentStyle={{
                                                backgroundColor: 'var(--card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '12px',
                                                fontSize: '12px'
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[6, 6, 6, 6]} minPointSize={2}>
                                            {chartData.map((entry, index) => (
                                                <Cell
                                                    key={index}
                                                    fill={entry.value === 0 ? "rgba(var(--theme-primary-rgb), 0.1)" : "var(--theme-primary)"}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>


                </div>


                {/* Performance Hub Tab */}
                <div className={activeTab === "battlefield" ? "block" : "hidden"}>
                    {view === 'dashboard' ? (
                        <div
                            key="battlefield"
                            className="p-4 sm:p-6 space-y-6 pb-32"
                        >

                            {/* NEW: Squad Hub (Top of Page) */}
                            <div className="space-y-6">
                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setShowCreateGroup(true)}
                                        className="h-14 bg-orange-500 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-orange-500/20"
                                    >
                                        <span className="text-sm font-bold text-white tracking-wide">Create Group</span>
                                    </button>
                                    <button
                                        onClick={() => setShowJoinGroup(true)}
                                        className="h-14 bg-zinc-800 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform border border-white/5"
                                    >
                                        <span className="text-sm font-bold text-zinc-300 tracking-wide">Join Group</span>
                                    </button>
                                </div>

                                {/* My Groups List */}
                                <div>
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-1">My Groups</h3>
                                    {groups.length > 0 ? (
                                        <div className="space-y-3">
                                            {groups.map((group: any) => (
                                                <div
                                                    key={group.id}
                                                    onClick={() => handleGroupClick(group.id)}
                                                    className="bg-zinc-900 border border-white/10 p-5 rounded-3xl flex items-center justify-between active:scale-95 transition-transform"
                                                >
                                                    <div>
                                                        <div className="text-base font-bold text-white mb-1">{group.name}</div>
                                                        <div className="text-xs font-mono text-zinc-500">Code: <span className="text-zinc-400">{group.code}</span></div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/50">
                                            <p className="text-zinc-500 text-xs font-medium">No squads joined yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Streak Card (Moved Down) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="col-span-1 md:col-span-2 lg:col-span-4 apple-glass p-5 rounded-3xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Flame className="w-32 h-32 text-orange-500" />
                                    </div>
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
                                                <h3 className="text-sm font-bold uppercase tracking-widest text-orange-500">Current Streak</h3>
                                            </div>
                                            <div className="text-5xl font-black italic text-foreground tracking-tighter">
                                                {stats.currentStreak} <span className="text-2xl text-muted-foreground not-italic">DAYS</span>
                                            </div>
                                            <p className="text-xs font-medium text-muted-foreground mt-2 max-w-[200px]">
                                                {stats.currentStreak > 3 ? "You're on fire! Keep the momentum." : "Ignite your potential. Don't stop."}
                                            </p>
                                        </div>

                                        {/* Freeze Slots */}
                                        <div className="flex gap-2">
                                            {[1, 2].map((_, i) => (
                                                <div key={i} className="w-12 h-16 rounded-xl bg-zinc-800/50 border-2 border-dashed border-zinc-700 flex items-center justify-center relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-blue-500/10 opacity-0 hover:opacity-100 transition-opacity" />
                                                    <div className="text-[10px] font-bold text-zinc-600 uppercase transform -rotate-90">Freeze</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Weekly Progress Bar */}
                                    <div className="mt-6">
                                        <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground mb-1">
                                            <span>Weekly Activity</span>
                                            <span>{Math.round((parseFloat(stats.today) * 60 / (60 * 2)) * 100)}% of Goal</span>
                                        </div>
                                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-orange-500 rounded-full shadow-[0_0_10px_orange]"
                                                style={{ width: `${Math.min(100, (parseFloat(stats.today) * 60 / 120) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>



                            {/* LEAGUE STANDINGS */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Diamond League</h3>
                                    <span className="text-[10px] font-bold text-action-green uppercase">Promotion Zone Active</span>
                                </div>

                                {/* Top 3 Podium */}
                                {leaderboard.length >= 3 && (
                                    <div className="flex items-end justify-center gap-2 py-8 relative">
                                        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                        {/* #2 */}
                                        <div className="flex flex-col items-center relative -right-4 z-0 scale-90 opacity-80">
                                            <LeagueBadge tier="SILVER" size="md" />
                                            <div className="mt-2 w-20 h-24 bg-zinc-800/50 rounded-t-2xl border-t border-white/5 flex items-end justify-center pb-2">
                                                <span className="text-2xl font-black text-zinc-600">2</span>
                                            </div>
                                        </div>
                                        {/* #1 */}
                                        <div className="flex flex-col items-center relative z-10">
                                            <div className="animate-bounce mb-2"><Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" fill="currentColor" /></div>
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-20 rounded-full" />
                                                <LeagueBadge tier="HEROIC" size="lg" />
                                            </div>
                                            <div className="mt-3 w-28 h-32 bg-gradient-to-b from-yellow-500/10 to-zinc-900 border-t border-yellow-500/20 rounded-t-[2rem] flex items-end justify-center pb-4 relative overflow-hidden backdrop-blur-sm shadow-2xl">
                                                <div className="text-4xl font-black text-yellow-500">1</div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                            </div>
                                            <div className="absolute -bottom-8 text-center w-32">
                                                <div className="text-sm font-black text-white truncate">{leaderboard[0].displayName || leaderboard[0].username}</div>
                                                <div className="text-[10px] font-bold text-yellow-500">{Math.round(leaderboard[0].totalFocusTime)} PTS</div>
                                            </div>
                                        </div>
                                        {/* #3 */}
                                        <div className="flex flex-col items-center relative -left-4 z-0 scale-90 opacity-80">
                                            <LeagueBadge tier="BRONZE" size="md" />
                                            <div className="mt-2 w-20 h-20 bg-zinc-800/50 rounded-t-2xl border-t border-white/5 flex items-end justify-center pb-2">
                                                <span className="text-2xl font-black text-zinc-600">3</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* League List */}
                                <div className="space-y-2 mt-8">
                                    {leaderboard.slice(3, visibleCount).map((u: any, idx: number) => (
                                        <LeaderboardItem
                                            key={u.id}
                                            user={u}
                                            idx={idx + 3}
                                            isCurrentUser={u.id === user?.id}
                                            rank={getRankInfo(u.totalFocusTime)}
                                        />
                                    ))}
                                    {visibleCount < leaderboard.length && (
                                        <button
                                            onClick={() => setVisibleCount(prev => prev + 10)}
                                            className="w-full py-4 mt-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95"
                                        >
                                            Show More Agents
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Ghost Row - Personal Rank & Promotion Tip */}
                            {currentUserRank && currentUserRank.rank > 10 && (
                                <div className="sticky bottom-6 z-20">
                                    {currentUserRank.rank > 1 && (
                                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-action-green text-black px-4 py-3 rounded-xl shadow-[0_0_20px_rgba(57,255,20,0.4)] animate-bounce flex items-center justify-between gap-3 z-30 border-2 border-white/20">
                                            <div className="text-xs font-black uppercase italic leading-tight">
                                                {milestoneText.replace("You are", "GOAL:")}
                                            </div>
                                            <ChevronRight className="w-4 h-4 rotate-270 stroke-[4px]" />
                                        </div>
                                    )}
                                    <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-1 shadow-2xl relative z-20">
                                        <LeaderboardItem
                                            user={currentUserRank.user}
                                            idx={currentUserRank.rank - 1}
                                            isCurrentUser={true}
                                            rank={getRankInfo(currentUserRank.user.totalFocusTime)}
                                        />
                                    </div>
                                </div>
                            )}



                            {/* Create Group Modal */}
                            {showCreateGroup && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                    <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-6">
                                        <h3 className="text-lg font-bold text-white mb-4">Initialize New Logic</h3>
                                        <input
                                            type="text"
                                            placeholder="Squad Name"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 mb-4 focus:outline-none focus:border-action-green"
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowCreateGroup(false)}
                                                className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs uppercase"
                                            >
                                                Abort
                                            </button>
                                            <button
                                                onClick={handleCreateGroup}
                                                disabled={!newGroupName.trim()}
                                                className="flex-1 py-3 rounded-xl bg-action-green text-black font-bold text-xs uppercase disabled:opacity-50"
                                            >
                                                Confirm
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Join Group Modal */}
                            {showJoinGroup && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                    <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-6">
                                        <h3 className="text-lg font-bold text-white mb-4">Join Existing Logic</h3>
                                        <input
                                            type="text"
                                            placeholder="Enter Access Code"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 mb-4 focus:outline-none focus:border-action-green font-mono"
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowJoinGroup(false)}
                                                className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs uppercase"
                                            >
                                                Abort
                                            </button>
                                            <button
                                                onClick={handleJoinGroup}
                                                disabled={!joinCode.trim()}
                                                className="flex-1 py-3 rounded-xl bg-white text-black font-bold text-xs uppercase disabled:opacity-50"
                                            >
                                                Join
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Squad Details View - With Roster */
                        <div className="flex flex-col h-[calc(100dvh-140px)] relative">
                            {/* Integrated Chat (Now Top) */}
                            <div className="h-[60%] border-b border-white/10 bg-black/90 backdrop-blur-xl relative z-10">
                                <ClashChat
                                    currentUser={currentUser}
                                    onClose={() => { }}
                                    hasGroups={true}
                                    groupId={selectedGroup?.id}
                                    groupName={selectedGroup?.name}
                                    className="h-full w-full rounded-none border-none bg-transparent shadow-none"
                                />
                            </div>

                            {/* Member List (Now Bottom) */}
                            <div className="flex-1 overflow-y-auto px-4 py-4">
                                <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-4 mb-4">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Squad Roster</h3>
                                    <div className="space-y-3">
                                        {groupMembers.map((member: any) => (
                                            <div key={member.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 relative">
                                                        <span className="text-sm font-bold text-white">{member.username?.[0]?.toUpperCase()}</span>
                                                        {/* Online Indicator (Fake for now) */}
                                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-zinc-900"></div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-white flex items-center gap-2">
                                                            {member.username}
                                                            {member.id === selectedGroup?.created_by && <Crown className="w-3 h-3 text-yellow-500" />}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-500 font-medium">Operative</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs font-bold text-action-green">{Math.round(member.totalFocusTime || 0)} PTS</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Performance Path Tab */}
                <div className={activeTab === "battlepass" ? "block" : "hidden"}>
                    <div
                        key="performance-path"
                        className="p-4 sm:p-6 space-y-8"
                    >
                        {/* 1. Simple Status Card */}
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="px-3 py-1 bg-action-green/10 text-action-green text-xs font-bold rounded-full">
                                        SEASON 1
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">
                                        Growth Frontier Pass 2.0
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-xs font-semibold text-zinc-400 mb-1">Current Tier</div>
                                            <div className="text-4xl font-bold text-white tabular-nums">
                                                Lvl {getLevelInfo(xp).level}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-action-green mb-1">
                                                {getLevelInfo(xp).progressXP} <span className="text-zinc-500">/</span> {getLevelInfo(xp).neededXP} XP
                                            </div>
                                            <div className="text-xs font-semibold text-zinc-500">Next: Elite Reward</div>
                                        </div>
                                    </div>

                                    {/* Simple Progress Bar */}
                                    <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-action-green transition-all duration-500"
                                            style={{ width: `${getLevelInfo(xp).percentage}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Reward Action */}
                                <div className="mt-8 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-zinc-800 flex items-center justify-center rounded-xl border border-white/10">
                                            <Package className="w-5 h-5 text-action-green" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white">Reward Deck</div>
                                            <div className="text-[10px] text-zinc-400 font-medium mt-0.5">{crates} Crates Available</div>
                                        </div>
                                    </div>
                                    <button
                                        disabled={crates === 0}
                                        onClick={() => setShowLootBox(true)}
                                        className={cn(
                                            "px-6 py-2 bg-action-green text-black text-xs font-bold rounded-xl uppercase tracking-wider transition-transform active:scale-95",
                                            crates === 0 && "bg-zinc-800 text-zinc-600 opacity-50"
                                        )}
                                    >
                                        Open
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sinusoidal Performance Path (Bezier) */}
                        <div className="space-y-2 pb-32 overflow-hidden">
                            <div className="flex items-center justify-between px-2 mb-8">
                                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">ACHIEVEMENT ROADMAP</h3>
                                <div className="h-px flex-1 bg-zinc-800 mx-4" />
                            </div>

                            <div className="relative w-full min-h-[600px] flex flex-col items-center">
                                {/* SVG Bezier Path Background */}
                                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ minHeight: '800px' }}>
                                    <path
                                        d="M 50% 20 C 50% 100, 10% 150, 10% 250 S 90% 400, 90% 500 S 50% 650, 50% 750"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.05)"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                    {/* Progress Path (Masked by level) would go here for advanced implementation */}
                                </svg>

                                {[
                                    { lvl: 1, name: "Bronze Badge", type: "Prestige Seal", icon: <Award className="w-6 h-6" />, claimed: getLevelInfo(xp).level >= 1, color: "text-orange-400", border: "border-orange-900", glow: "shadow-[0_0_20px_rgba(249,115,22,0.3)]" },
                                    { lvl: 5, name: "Prime Reward", type: "Elite Bundle", icon: <Package className="w-6 h-6" />, claimed: getLevelInfo(xp).level >= 5, color: "text-purple-400", border: "border-purple-900", glow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]", isMilestone: true },
                                    { lvl: 10, name: "Neon Frame", type: "Visual Tech", icon: <Crown className="w-6 h-6" />, claimed: getLevelInfo(xp).level >= 10, color: "text-cyan-400", border: "border-cyan-900", glow: "shadow-[0_0_20px_rgba(34,211,238,0.3)]", isMilestone: true },
                                    { lvl: 15, name: "Silver Seal", type: "Prestige Seal", icon: <ShieldCheck className="w-6 h-6" />, claimed: getLevelInfo(xp).level >= 15, color: "text-zinc-300", border: "border-zinc-700", glow: "shadow-[0_0_20px_rgba(255,255,255,0.2)]" },
                                    { lvl: 20, name: "Legacy Box", type: "Grand Asset", icon: <Box className="w-6 h-6" />, claimed: getLevelInfo(xp).level >= 20, color: "text-yellow-400", border: "border-yellow-900", glow: "shadow-[0_0_30px_rgba(250,204,21,0.4)]", isMilestone: true },
                                ].map((reward, i) => {
                                    const isComplete = reward.claimed;
                                    const isLocked = !isComplete;
                                    // Fog of War: If more than 5 levels ahead of current level, dim it
                                    const isFarFuture = reward.lvl > (getLevelInfo(xp).level + 5);

                                    // Manual positioning to follow the SVG curve roughly
                                    // These values correspond to the 'd' path logic above
                                    const positions = [
                                        { x: '0%', y: '20px' },    // Start center
                                        { x: '-35%', y: '250px' }, // Left curve
                                        { x: '35%', y: '500px' },  // Right curve
                                        { x: '0%', y: '750px' },   // Back to center (approx)
                                        { x: '-20%', y: '1000px' } // Drift left
                                    ];
                                    const pos = positions[i] || { x: '0%', y: `${i * 200}px` };

                                    return (
                                        <div
                                            key={i}
                                            className="absolute w-full flex justify-center"
                                            style={{ top: pos.y }}
                                        >
                                            <div
                                                className="relative group cursor-pointer"
                                                onClick={() => {
                                                    if (isLocked) {
                                                        toast({ title: "Sector Locked", description: `Reach Level ${reward.lvl} to access this sector.` });
                                                        return;
                                                    }
                                                    // Haptic trigger could go here
                                                }}
                                            >
                                                {/* Node Circle */}
                                                <div className={cn(
                                                    "rounded-full flex items-center justify-center border-4 relative transition-all duration-500",
                                                    reward.isMilestone ? "w-24 h-24" : "w-16 h-16",
                                                    isComplete
                                                        ? `bg-zinc-900 ${reward.border} ${reward.glow} scale-110`
                                                        : "bg-zinc-950 border-zinc-900 grayscale opacity-40 hover:opacity-100"
                                                )}>
                                                    <div className={cn("transition-transform group-hover:scale-110", isComplete ? reward.color : "text-zinc-600")}>
                                                        {isLocked ? <Lock className="w-5 h-5 opacity-50" /> : reward.icon}
                                                    </div>

                                                    {/* Level Badge */}
                                                    <div className={cn(
                                                        "absolute -bottom-3 px-2 py-0.5 bg-zinc-900 border border-zinc-700 flex items-center justify-center rounded-md skew-x-[-12deg] shadow-lg",
                                                        isComplete && "border-action-green bg-action-green text-black"
                                                    )}>
                                                        <span className="text-[10px] font-black skew-x-[12deg]">LVL {reward.lvl}</span>
                                                    </div>
                                                </div>

                                                {/* Floating Label (Right or Left based on position) */}
                                                <div className={cn(
                                                    "absolute top-1/2 -translate-y-1/2 w-32 px-3 py-2 bg-black/80 border border-white/5 backdrop-blur-md rounded-lg pointer-events-none transition-all duration-300",
                                                    parseInt(pos.x) > 0 ? "right-full mr-4 text-right" : "left-full ml-4", // Flip label based on side
                                                    isComplete ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                                                )}>
                                                    <div className={cn("text-[9px] font-black uppercase tracking-widest mb-0.5", reward.color)}>{reward.type}</div>
                                                    <div className="text-xs font-bold text-white uppercase italic truncate">{reward.name}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Loot Box Modal ( React.Fragment wrapper would be ideal here if extracted) */}
                        {showLootBox && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                                <div
                                    className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center relative overflow-hidden"
                                >
                                    {/* Radial Glow */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-orange-500/20 opacity-50 pointer-events-none" />

                                    <div className="relative z-10 text-center">
                                        <div
                                            className="w-32 h-32 mx-auto mb-6 bg-zinc-800 rounded-2xl flex items-center justify-center border-2 border-white/10 shadow-[0_0_50px_rgba(168,85,247,0.3)]"
                                            onClick={() => {
                                                confetti({
                                                    particleCount: 100,
                                                    spread: 70,
                                                    origin: { y: 0.6 },
                                                    colors: ['#A855F7', '#F97316', '#FFFFFF']
                                                });
                                                toast({ title: "Rewards Claimed!", description: "You received 500 XP and a new badge." });
                                                setShowLootBox(false);
                                            }}
                                        >
                                            <Package className="w-16 h-16 text-white" />
                                        </div>

                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Elite Drop</h3>
                                        <p className="text-sm text-zinc-400 mb-8">Tap the crate to reveal your rewards.</p>

                                        <button
                                            onClick={() => setShowLootBox(false)}
                                            className="text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>



                </div>

                <BottomNav />
                <ProUpgradeModal open={showProModal} onOpenChange={setShowProModal} />
            </div>
        </div>
    );
}
