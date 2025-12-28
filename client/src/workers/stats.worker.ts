import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    subDays,
    startOfWeek,
    endOfWeek,
    subWeeks,
    isSameMonth,
    startOfYear,
    endOfYear,
    eachMonthOfInterval,
    getYear,
    getWeek
} from "date-fns";

interface PomodoroSession {
    taskId: string;
    taskName: string;
    duration: number;
    date: string;
    timestamp: number;
}

self.onmessage = (e: MessageEvent) => {
    const { sessions, currentMonthStr, chartView } = e.data;
    const currentMonth = new Date(currentMonthStr);

    // --- Stats Calculation ---
    const today = format(new Date(), "yyyy-MM-dd");
    const thisWeekStart = startOfWeek(new Date());
    const thisWeekEnd = endOfWeek(new Date());

    // Filter sessions for detailed stats
    const totalMinutes = sessions.reduce((sum: number, s: PomodoroSession) => sum + s.duration, 0);
    const todayMinutes = sessions.filter((s: PomodoroSession) => s.date === today).reduce((sum: number, s: PomodoroSession) => sum + s.duration, 0);

    const weekSessions = sessions.filter((s: PomodoroSession) => {
        const sessionDate = new Date(s.date);
        return sessionDate >= thisWeekStart && sessionDate <= thisWeekEnd;
    });
    const weekMinutes = weekSessions.reduce((sum: number, s: PomodoroSession) => sum + s.duration, 0);

    // Goal Stats
    const uniqueDays = new Set(sessions.map((s: PomodoroSession) => s.date));
    const focusDays = uniqueDays.size;

    const dailyTotals = sessions.reduce((acc: Record<string, number>, s: PomodoroSession) => {
        acc[s.date] = (acc[s.date] || 0) + s.duration;
        return acc;
    }, {} as Record<string, number>);

    const GOAL_MINUTES = 180;
    const completedGoalDays = Object.values(dailyTotals).filter((minutes) => (minutes as number) >= GOAL_MINUTES).length;
    const completionRate = focusDays > 0 ? Math.round((completedGoalDays / focusDays) * 100) : 0;

    // Streak Logic
    let currentStreak = 0;
    const hasToday = uniqueDays.has(format(new Date(), "yyyy-MM-dd"));
    const hasYesterday = uniqueDays.has(format(subDays(new Date(), 1), "yyyy-MM-dd"));

    if (hasToday || hasYesterday) {
        let tempDate = hasToday ? new Date() : subDays(new Date(), 1);
        let streakActive = true;

        while (streakActive) {
            const dateStr = format(tempDate, "yyyy-MM-dd");
            if (uniqueDays.has(dateStr)) {
                currentStreak++;
                tempDate = subDays(tempDate, 1);
            } else {
                streakActive = false;
            }
        }
    }

    // Rank Decay
    const lastSession = sessions.length > 0
        ? sessions.reduce((latest: PomodoroSession, s: PomodoroSession) => (s.timestamp + s.duration * 60000) > (latest.timestamp + latest.duration * 60000) ? s : latest)
        : null;
    const hoursSinceLastFocus = lastSession
        ? (Date.now() - (lastSession.timestamp + lastSession.duration * 60000)) / (1000 * 60 * 60)
        : 0;
    const isRankAtRisk = sessions.length > 0 && hoursSinceLastFocus > 48;

    const stats = {
        isRankAtRisk,
        hoursSinceLastFocus,
        total: (totalMinutes / 60).toFixed(1),
        week: (weekMinutes / 60).toFixed(1),
        today: (todayMinutes / 60).toFixed(1),
        focusDays,
        completedGoalDays,
        completionRate,
        currentStreak
    };

    // --- Calendar Days Calculation ---
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    const monthDays = days.map(day => {
        const daySessions = sessions.filter((s: PomodoroSession) => isSameDay(new Date(s.date), day));
        return {
            date: day.toISOString(), // Send as string to avoid cloning issues
            sessions: daySessions.length,
            minutes: daySessions.reduce((sum: number, s: PomodoroSession) => sum + s.duration, 0)
        };
    });

    // --- Chart Data Calculation ---
    const now = new Date();
    let chartData = [];

    if (chartView === "daily") {
        const days = eachDayOfInterval({
            start: subDays(now, 6),
            end: now
        });
        chartData = days.map(day => {
            const dateStr = format(day, "yyyy-MM-dd");
            const minutes = sessions
                .filter((s: PomodoroSession) => s.date === dateStr)
                .reduce((sum: number, s: PomodoroSession) => sum + s.duration, 0);
            return {
                name: format(day, "d MMM"),
                value: Math.round(minutes),
                fullDate: dateStr
            };
        });
    } else if (chartView === "weekly") {
        const weeks = [0, 1, 2, 3].map(i => subWeeks(now, i)).reverse();
        chartData = weeks.map(weekDate => {
            const weekStart = startOfWeek(weekDate);
            const weekEnd = endOfWeek(weekDate);
            const minutes = sessions
                .filter((s: PomodoroSession) => {
                    const d = new Date(s.date);
                    return d >= weekStart && d <= weekEnd;
                })
                .reduce((sum: number, s: PomodoroSession) => sum + s.duration, 0);
            return {
                name: `W${getWeek(weekDate)}`,
                value: Math.round(minutes / 60),
                fullDate: `Week ${getWeek(weekDate)}`
            };
        });
    } else if (chartView === "monthly") {
        const months = eachMonthOfInterval({
            start: startOfYear(now),
            end: endOfYear(now)
        });
        chartData = months.map(month => {
            const minutes = sessions
                .filter((s: PomodoroSession) => isSameMonth(new Date(s.date), month))
                .reduce((sum: number, s: PomodoroSession) => sum + s.duration, 0);
            return {
                name: format(month, "MMM"),
                value: Math.round(minutes / 60),
                fullDate: format(month, "MMMM yyyy")
            };
        });
    } else {
        const currentYear = getYear(now);
        const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
        chartData = years.map(year => {
            const minutes = sessions
                .filter((s: PomodoroSession) => getYear(new Date(s.date)) === year)
                .reduce((sum: number, s: PomodoroSession) => sum + s.duration, 0);
            return {
                name: year.toString(),
                value: Math.round(minutes / 60),
                fullDate: year.toString()
            };
        });
    }

    self.postMessage({ stats, monthDays, chartData });
};
