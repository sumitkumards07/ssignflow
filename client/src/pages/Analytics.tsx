import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, subDays, subWeeks, startOfYear, endOfYear, eachMonthOfInterval, getYear, getWeek } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface PomodoroSession {
    taskId: string;
    taskName: string;
    duration: number;
    date: string;
    timestamp: number;
}

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<"pomodoro" | "task">("pomodoro");
    const [chartView, setChartView] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
    const [currentMonth, setCurrentMonth] = useState(new Date());

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

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            {/* Header */}
            <div className="px-6 pt-safe pb-4 flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
                <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-semibold">Report</h1>
                <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
                    <CalendarIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
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
                    onClick={() => setActiveTab("task")}
                    className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === "task" ? "text-primary" : "text-muted-foreground"
                        }`}
                    style={activeTab === "task" ? { color: 'var(--theme-primary)' } : {}}
                >
                    Task
                    {activeTab === "task" && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5"
                            style={{ backgroundColor: 'var(--theme-primary)' }}
                        />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto">
                {activeTab === "pomodoro" ? (
                    <div className="space-y-6 p-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-3">
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
                ) : (
                    <div className="p-6">
                        <div className="text-center text-muted-foreground py-12">
                            Task analytics coming soon...
                        </div>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
