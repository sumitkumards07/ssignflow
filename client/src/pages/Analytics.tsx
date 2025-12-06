import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, User, Sword, MessageCircle, Loader2, X } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, subDays, subWeeks, startOfYear, endOfYear, eachMonthOfInterval, getYear, getWeek } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useLocation } from "wouter";
import { ClashChat } from "@/components/ClashChat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useToast } from "@/hooks/use-toast";

interface PomodoroSession {
    taskId: string;
    taskName: string;
    duration: number;
    date: string;
    timestamp: number;
}

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<"pomodoro" | "battlefield">("pomodoro");
    const [chartView, setChartView] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showChat, setShowChat] = useState(false);
    const [isGroupLoading, setIsGroupLoading] = useState(false);
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const lastSeenMsgIdRef = useRef<string | null>(null);
    const { toast } = useToast();

    const sessions: PomodoroSession[] = JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]");

    // Calculate stats
    const stats = useMemo(() => {
        const today = format(new Date(), "yyyy-MM-dd");
        const thisWeekStart = startOfWeek(new Date());
        const thisWeekEnd = endOfWeek(new Date());

        const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
        const todayMinutes = sessions.filter(s => s.date === today).reduce((sum, s) => sum + s.duration, 0);
        const weekSessions = sessions.filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= thisWeekStart && sessionDate <= thisWeekEnd;
        });
        const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);

        // Goal Stats
        const uniqueDays = new Set(sessions.map(s => s.date));
        const focusDays = uniqueDays.size;

        // Calculate daily totals for goal completion
        const dailyTotals = sessions.reduce((acc, s) => {
            acc[s.date] = (acc[s.date] || 0) + s.duration;
            return acc;
        }, {} as Record<string, number>);

        const GOAL_MINUTES = 180; // 3 hours
        const completedGoalDays = Object.values(dailyTotals).filter(minutes => minutes >= GOAL_MINUTES).length;
        const completionRate = focusDays > 0 ? Math.round((completedGoalDays / focusDays) * 100) : 0;

        return {
            total: (totalMinutes / 60).toFixed(1),
            week: (weekMinutes / 60).toFixed(1),
            today: (todayMinutes / 60).toFixed(1),
            focusDays,
            completedGoalDays,
            completionRate
        };
    }, [sessions]);

    // Calendar data
    const monthDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            const daySessions = sessions.filter(s => isSameDay(new Date(s.date), day));
            return {
                date: day,
                sessions: daySessions.length,
                minutes: daySessions.reduce((sum, s) => sum + s.duration, 0)
            };
        });
    }, [currentMonth, sessions]);

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

    // Chart Data
    const chartData = useMemo(() => {
        const now = new Date();
        let data = [];

        if (chartView === "daily") {
            // Last 7 days
            const days = eachDayOfInterval({
                start: subDays(now, 6),
                end: now
            });
            data = days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const minutes = sessions
                    .filter(s => s.date === dateStr)
                    .reduce((sum, s) => sum + s.duration, 0);
                return {
                    name: format(day, "EEE"), // Mon, Tue
                    value: Math.round(minutes), // Minutes
                    fullDate: dateStr
                };
            });
        } else if (chartView === "weekly") {
            // Last 4 weeks
            // Simplified: Group by week number
            const weeks = [0, 1, 2, 3].map(i => subWeeks(now, i)).reverse();
            data = weeks.map(weekDate => {
                const weekStart = startOfWeek(weekDate);
                const weekEnd = endOfWeek(weekDate);
                const minutes = sessions
                    .filter(s => {
                        const d = new Date(s.date);
                        return d >= weekStart && d <= weekEnd;
                    })
                    .reduce((sum, s) => sum + s.duration, 0);
                return {
                    name: `W${getWeek(weekDate)}`,
                    value: Math.round(minutes / 60), // Hours
                    fullDate: `Week ${getWeek(weekDate)}`
                };
            });
        } else if (chartView === "monthly") {
            // This Year
            const months = eachMonthOfInterval({
                start: startOfYear(now),
                end: endOfYear(now)
            });
            data = months.map(month => {
                const minutes = sessions
                    .filter(s => isSameMonth(new Date(s.date), month))
                    .reduce((sum, s) => sum + s.duration, 0);
                return {
                    name: format(month, "MMM"),
                    value: Math.round(minutes / 60), // Hours
                    fullDate: format(month, "MMMM yyyy")
                };
            });
        } else {
            // Yearly (Last 5 years)
            const currentYear = getYear(now);
            const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
            data = years.map(year => {
                const minutes = sessions
                    .filter(s => getYear(new Date(s.date)) === year)
                    .reduce((sum, s) => sum + s.duration, 0);
                return {
                    name: year.toString(),
                    value: Math.round(minutes / 60), // Hours
                    fullDate: year.toString()
                };
            });
        }
        return data;
    }, [chartView, sessions]);

    const maxChartValue = Math.max(...chartData.map(d => d.value), 1); // Avoid 0 division

    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showJoinGroup, setShowJoinGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Fetch current user
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

    // Poll for messages
    const { data: messages = [], isLoading: isMessagesLoading, refetch: refetchMessages } = useQuery<any[]>({
        queryKey: ["clashMessages", selectedGroup?.id],
        queryFn: async () => {
            if (!selectedGroup?.id) return [];
            const { apiRequest } = await import("@/lib/queryClient");
            const res = await apiRequest("GET", `/api/clash/messages?groupId=${selectedGroup.id}`);
            if (!res.ok) return [];
            const data = await res.json();
            if (!Array.isArray(data)) return [];
            return data;
        },
        refetchInterval: selectedGroup?.id ? 2000 : false, // Poll every 2 seconds when a group is selected (optimized for performance)
        enabled: !!currentUser && groups.length > 0 && !!selectedGroup?.id, // Only fetch if user has groups and a group is selected
        staleTime: 0, // Always consider data stale to force refetch on group change
        gcTime: 0, // Don't cache old group messages
    });

    // Handle notifications permission
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

    // Global Notification Logic
    useEffect(() => {
        if (!currentUser || messages.length === 0) return;

        // Check if notifications are enabled for user
        if (currentUser.clashChatNotifications === false) return;

        const lastMessage = messages[messages.length - 1];

        // Initialize ref if empty
        if (!lastSeenMsgIdRef.current) {
            lastSeenMsgIdRef.current = lastMessage.id;
            return;
        }

        // Check if new message is different from last seen
        if (lastMessage.id !== lastSeenMsgIdRef.current) {
            lastSeenMsgIdRef.current = lastMessage.id;

            // Don't notify for own messages
            if (lastMessage.userId === currentUser.id) return;

            // Don't notify if chat is open (optional, but usually desired behavior)
            // if (showChat) return; 

            LocalNotifications.schedule({
                notifications: [{
                    title: "Clash Zone",
                    body: `${lastMessage.user?.displayName || 'User'}: ${lastMessage.content}`,
                    id: Math.floor(Math.random() * 100000),
                    schedule: { at: new Date(Date.now() + 100) },
                    sound: "default",
                    actionTypeId: "",
                    extra: null
                }]
            }).catch(e => console.error("Notification schedule error:", e));
        }
    }, [messages, currentUser, showChat]);

    // Sync stats to server
    useEffect(() => {
        const syncStats = async () => {
            if (stats.total) {
                try {
                    const { apiRequest } = await import("@/lib/queryClient");
                    await apiRequest("POST", "/api/analytics/sync", {
                        totalTime: Math.round(parseFloat(stats.total) * 60), // Convert back to minutes
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

    // Fetch leaderboard
    useEffect(() => {
        if (activeTab === "battlefield") {
            const fetchLeaderboard = async () => {
                try {
                    const { apiRequest } = await import("@/lib/queryClient");
                    const res = await apiRequest("GET", "/api/analytics/leaderboard");
                    const data = await res.json();
                    setLeaderboard(data);
                } catch (error) {
                    console.error("Failed to fetch leaderboard:", error);
                }
            };
            fetchLeaderboard();
        }
    }, [activeTab]);

    // Fetch groups
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const { apiRequest } = await import("@/lib/queryClient");
                const res = await apiRequest("GET", "/api/groups");
                const data = await res.json();
                setGroups(data);
            } catch (error) {
                console.error("Failed to fetch groups:", error);
            }
        };
        fetchGroups();
    }, []);

    // Invalidate messages query when switching groups
    useEffect(() => {
        if (selectedGroup?.id) {
            // Use resetQueries to completely clear the cache and force fresh fetch
            queryClient.resetQueries({ queryKey: ["clashMessages"] });
        }
    }, [selectedGroup?.id, queryClient]);

    const handleCreateGroup = async () => {
        try {
            const { apiRequest } = await import("@/lib/queryClient");
            const res = await apiRequest("POST", "/api/groups", { name: newGroupName });
            const group = await res.json();
            setGroups([...groups, group]);
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
            const data = await res.json();
            setGroups([...groups, data.group]);
            setShowJoinGroup(false);
            setJoinCode("");
        } catch (error) {
            console.error("Failed to join group:", error);
            alert("Invalid code or already joined");
        }
    };

    const handleGroupClick = async (groupId: string) => {
        setIsGroupLoading(true);
        try {
            const { apiRequest } = await import("@/lib/queryClient");
            const res = await apiRequest("GET", `/api/groups/${groupId}`);

            if (!res.ok) {
                throw new Error("Failed to fetch group");
            }

            const data = await res.json();

            if (!data.group) {
                throw new Error("Invalid group data");
            }

            setSelectedGroup(data.group);
            setGroupMembers(data.members);
        } catch (error) {
            console.error("Failed to fetch group details:", error);
            toast({
                title: "Error",
                description: "Failed to load group. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsGroupLoading(false);
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
        try {
            const { apiRequest } = await import("@/lib/queryClient");
            await apiRequest("DELETE", `/api/groups/${groupId}`);
            setGroups(groups.filter(g => g.id !== groupId));
            setSelectedGroup(null);
        } catch (error) {
            console.error("Failed to delete group:", error);
            alert("Failed to delete group");
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-40 max-w-screen-xl mx-auto w-full">
            {/* Header */}
            <div className="px-4 sm:px-6 pt-safe pb-4 flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
                <button
                    onClick={() => selectedGroup ? setSelectedGroup(null) : window.history.back()}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-semibold">{selectedGroup ? selectedGroup.name : "Report"}</h1>
                <button
                    onClick={() => setLocation("/settings")}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                >
                    <User className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
            {!selectedGroup && (
                <div className="flex border-b border-border bg-background sticky top-[60px] z-10">
                    <button
                        onClick={() => setActiveTab("pomodoro")}
                        className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === "pomodoro" ? "text-primary" : "text-muted-foreground"
                            }`}
                        style={activeTab === "pomodoro" ? { color: 'var(--theme-primary)' } : {}}
                    >
                        Pomodoro
                        {activeTab === "pomodoro" && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5"
                                style={{ backgroundColor: 'var(--theme-primary)' }}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("battlefield")}
                        className={`flex-1 py-3 text-sm font-medium relative transition-colors flex items-center justify-center gap-2 ${activeTab === "battlefield" ? "text-primary" : "text-muted-foreground"
                            }`}
                        style={activeTab === "battlefield" ? { color: 'var(--theme-primary)' } : {}}
                    >
                        <div className="flex items-center gap-2">
                            <Sword className={`w-4 h-4 ${activeTab === "battlefield" ? "animate-pulse text-orange-500" : ""}`} />
                            <span className={activeTab === "battlefield" ? "text-orange-500 font-bold" : ""}>Clash Zone</span>
                            {activeTab === "battlefield" && (
                                <span className="absolute -top-1 -right-1 text-xs">🔥</span>
                            )}
                        </div>
                        {activeTab === "battlefield" && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                            />
                        )}
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto">
                {activeTab === "pomodoro" && !selectedGroup ? (
                    <div className="space-y-6 p-4 sm:p-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
                                <div className="text-3xl font-bold" style={{ color: 'var(--theme-primary)' }}>{stats.total}</div>
                                <div className="text-[10px] text-muted-foreground mt-1">Total Focus Time(h)</div>
                            </div>
                            <div className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
                                <div className="text-3xl font-bold" style={{ color: 'var(--theme-primary)' }}>{stats.week}</div>
                                <div className="text-[10px] text-muted-foreground mt-1">Focus Time of This Week(h)</div>
                            </div>
                            <div className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
                                <div className="text-3xl font-bold" style={{ color: 'var(--theme-primary)' }}>{stats.today}</div>
                                <div className="text-[10px] text-muted-foreground mt-1">Focus Time of Today(h)</div>
                            </div>
                        </div>

                        {/* Pomodoro Records */}
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            <h3 className="text-sm font-semibold mb-4">Pomodoro Records</h3>
                            {todaySessions.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                    <div className="text-4xl mb-2">📦</div>
                                    <div className="text-xs">No Data</div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {Array.from({ length: 24 }, (_, hour) => {
                                        const hourSessions = todaySessions.filter(s => {
                                            const sessionHour = new Date(s.timestamp).getHours();
                                            return sessionHour === hour;
                                        });
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
                                                                width: `${Math.max((session.duration / 60) * 100, 2)}%` // Min width for visibility
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }).filter((_, hour) => hour >= 0 && hour <= 23)}
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
                            <div className="text-xs text-muted-foreground mb-4">
                                Completed Goal Days: {stats.completedGoalDays} days · Goal Completion Rate: {stats.completionRate}%
                            </div>

                            {/* Calendar */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-secondary rounded-full transition-colors">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm font-medium">{format(currentMonth, "MMM yyyy")}</span>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-secondary rounded-full transition-colors">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(day => (
                                        <div key={day} className="text-center text-[10px] text-muted-foreground py-1">
                                            {day}
                                        </div>
                                    ))}
                                    {calendarDays.map((day, index) => {
                                        const dayData = monthDays.find(d => isSameDay(d.date, day));
                                        const isCurrentMonth = isSameMonth(day, currentMonth);
                                        const isToday = isSameDay(day, new Date());

                                        return (
                                            <div
                                                key={index}
                                                className={`aspect-square flex items-center justify-center text-xs rounded-lg ${isToday ? "text-white font-bold" :
                                                    !isCurrentMonth ? "text-muted-foreground/30" :
                                                        dayData && dayData.sessions > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                                                    }`}
                                                style={isToday ? { backgroundColor: 'var(--theme-primary)' } : (dayData && dayData.sessions > 0 ? { backgroundColor: 'rgba(var(--theme-primary-rgb), 0.1)' } : {})}
                                            >
                                                {format(day, "d")}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Focus Time Chart */}
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            <h3 className="text-sm font-semibold mb-3">Focus Time Chart</h3>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                                <span>Top: {maxChartValue} {chartView === 'daily' ? 'min' : 'h'}</span>
                                <span>Average: {Math.round(chartData.reduce((a, b) => a + b.value, 0) / (chartData.length || 1))} {chartView === 'daily' ? 'min' : 'h'}</span>
                            </div>

                            {/* Chart View Tabs */}
                            <div className="flex gap-2 mb-4">
                                {(["daily", "weekly", "monthly", "yearly"] as const).map(view => (
                                    <button
                                        key={view}
                                        onClick={() => setChartView(view)}
                                        className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${chartView === view
                                            ? "text-white"
                                            : "bg-transparent text-muted-foreground hover:bg-secondary"
                                            }`}
                                        style={chartView === view ? { backgroundColor: 'var(--theme-primary)' } : {}}
                                    >
                                        {view.charAt(0).toUpperCase() + view.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Chart */}
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: '#71717a' }}
                                            dy={10}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-popover border border-border p-2 rounded-lg shadow-lg text-xs">
                                                            <p className="font-medium mb-1">{payload[0].payload.fullDate}</p>
                                                            <p style={{ color: 'var(--theme-primary)' }}>
                                                                {payload[0].value} {chartView === 'daily' ? 'min' : 'hours'}
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill="var(--theme-primary)" />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                ) : activeTab === "battlefield" ? (
                    <div className="p-4 sm:p-6 space-y-6">
                        {selectedGroup ? (
                            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold">
                                        {selectedGroup.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowChat(!showChat)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 shadow-md hover:shadow-primary/25 active:scale-95 ${showChat
                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white ring-2 ring-purple-500/50 ring-offset-2 ring-offset-background'
                                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90'
                                                }`}
                                        >
                                            <MessageCircle className="w-3.5 h-3.5 animate-pulse" />
                                            {showChat ? 'Hide' : 'Chat'}
                                        </button>
                                        <div className="text-xs text-muted-foreground bg-secondary/50 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50">
                                            Code: <span className="font-mono select-all font-bold text-foreground">{selectedGroup.code}</span>
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {showChat && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mb-6 overflow-hidden"
                                        >
                                            <ClashChat
                                                currentUser={currentUser}
                                                onClose={() => setShowChat(false)}
                                                hasGroups={groups.length > 0}
                                                messages={Array.isArray(messages) ? messages : []}
                                                isLoading={isMessagesLoading}
                                                onMessageSent={() => refetchMessages()}
                                                groupId={selectedGroup?.id}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="space-y-4">
                                    {groupMembers.map((user, index) => (
                                        <div key={user.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors group">
                                            <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                                                index === 1 ? "bg-zinc-400/20 text-zinc-400" :
                                                    index === 2 ? "bg-orange-500/20 text-orange-500" :
                                                        "bg-secondary text-muted-foreground"
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium flex items-center gap-2">
                                                    {user.displayName || user.username}
                                                    {user.id === selectedGroup.createdBy && (
                                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">Admin</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Today: {Math.round(user.todayFocusTime / 60)}h {user.todayFocusTime % 60}m
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <div>
                                                    <div className="font-bold text-primary" style={{ color: 'var(--theme-primary)' }}>
                                                        {Math.round(user.totalFocusTime / 60)}h
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">Total</div>
                                                </div>

                                                {/* Remove Member Button (Only for Creator) */}
                                                {selectedGroup.createdBy === currentUser.id && user.id !== currentUser.id && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm(`Remove ${user.username} from the group?`)) return;
                                                            try {
                                                                const { apiRequest } = await import("@/lib/queryClient");
                                                                await apiRequest("DELETE", `/api/groups/${selectedGroup.id}/members/${user.id}`);
                                                                queryClient.invalidateQueries({ queryKey: ["groupMembers", selectedGroup.id] });
                                                                toast({ title: "Member removed" });
                                                            } catch (e) {
                                                                toast({ title: "Failed to remove member", variant: "destructive" });
                                                            }
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                                        title="Remove from group"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {(currentUser?.id === selectedGroup.createdBy || currentUser?.role === "admin") && (
                                    <div className="mt-8 pt-6 border-t border-border flex justify-center">
                                        <button
                                            onClick={() => handleDeleteGroup(selectedGroup.id)}
                                            className="flex items-center gap-2 text-sm bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-2 rounded-full transition-colors"
                                        >
                                            <span className="text-lg">🗑️</span> Delete Group
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Groups List */}
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setShowCreateGroup(true); setShowJoinGroup(false); }}
                                            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                                            style={{ backgroundColor: 'var(--theme-primary)' }}
                                        >
                                            Create Group
                                        </button>
                                        <button
                                            onClick={() => { setShowJoinGroup(true); setShowCreateGroup(false); }}
                                            className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium text-sm hover:bg-secondary/80 transition-colors"
                                        >
                                            Join Group
                                        </button>
                                    </div>

                                    {showCreateGroup && (
                                        <div className="bg-card border border-border rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                            <h4 className="text-sm font-medium mb-2">Create New Group</h4>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newGroupName}
                                                    onChange={(e) => setNewGroupName(e.target.value)}
                                                    placeholder="Group Name"
                                                    className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                                <button
                                                    onClick={handleCreateGroup}
                                                    disabled={!newGroupName.trim()}
                                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
                                                    style={{ backgroundColor: 'var(--theme-primary)' }}
                                                >
                                                    Create
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {showJoinGroup && (
                                        <div className="bg-card border border-border rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                            <h4 className="text-sm font-medium mb-2">Join Group</h4>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={joinCode}
                                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                                    placeholder="Enter Code"
                                                    className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono uppercase"
                                                />
                                                <button
                                                    onClick={handleJoinGroup}
                                                    disabled={!joinCode.trim()}
                                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
                                                    style={{ backgroundColor: 'var(--theme-primary)' }}
                                                >
                                                    Join
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <h3 className="text-sm font-semibold text-muted-foreground mt-6 mb-2">My Groups</h3>
                                    {groups.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm bg-secondary/30 rounded-xl border border-dashed border-border">
                                            You haven't joined any groups yet.
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {groups.map(group => (
                                                <button
                                                    key={group.id}
                                                    onClick={() => handleGroupClick(group.id)}
                                                    className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:bg-secondary/50 transition-colors text-left"
                                                >
                                                    <div>
                                                        <div className="font-medium">{group.name}</div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">Code: {group.code}</div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                                </button>
                                            ))}
                                            {isGroupLoading && (
                                                <div className="flex justify-center py-4">
                                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Global Leaderboard */}
                                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mt-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <span className="text-2xl">🏆</span> Global Leaderboard
                                        </h3>
                                        <div className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                                            Top 10
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Show only top 10 */}
                                        {leaderboard.slice(0, 10).map((user, index) => (
                                            <div key={user.id} className={`flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors ${currentUser?.id === user.id ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''}`}>
                                                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                                                    index === 1 ? "bg-zinc-400/20 text-zinc-400" :
                                                        index === 2 ? "bg-orange-500/20 text-orange-500" :
                                                            "bg-secondary text-muted-foreground"
                                                    }`}>
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium flex items-center gap-2">
                                                        {user.displayName || user.username}
                                                        {currentUser?.id === user.id && <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">You</span>}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Today: {Math.round(user.todayFocusTime / 60)}h {user.todayFocusTime % 60}m
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-primary" style={{ color: 'var(--theme-primary)' }}>
                                                        {Math.round(user.totalFocusTime / 60)}h
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">Total</div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Show current user's rank if not in top 10 */}
                                        {currentUser && leaderboard.length > 10 && !leaderboard.slice(0, 10).some(u => u.id === currentUser.id) && (
                                            <>
                                                <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
                                                    <div className="h-px flex-1 bg-border"></div>
                                                    <span className="text-xs">...</span>
                                                    <div className="h-px flex-1 bg-border"></div>
                                                </div>
                                                {leaderboard.map((user, index) => {
                                                    if (user.id === currentUser.id) {
                                                        return (
                                                            <div key={user.id} className="flex items-center gap-4 p-3 rounded-xl ring-2 ring-purple-500 bg-purple-500/10">
                                                                <div className="w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm bg-purple-500/20 text-purple-500">
                                                                    {index + 1}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="font-medium flex items-center gap-2">
                                                                        {user.displayName || user.username}
                                                                        <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">You</span>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Today: {Math.round(user.todayFocusTime / 60)}h {user.todayFocusTime % 60}m
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-bold text-purple-500">
                                                                        {Math.round(user.totalFocusTime / 60)}h
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground">Total</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </>
                                        )}

                                        {leaderboard.length === 0 && (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <p>No warriors found yet.</p>
                                                <p className="text-xs mt-1">Start focusing to join the battlefield!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : null}
            </div>

            <BottomNav />
        </div>
    );
}
