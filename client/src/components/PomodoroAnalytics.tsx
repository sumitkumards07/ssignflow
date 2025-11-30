import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

interface PomodoroSession {
    taskId: string;
    taskName: string;
    duration: number;
    date: string;
    timestamp: number;
}

export function PomodoroAnalytics({ trigger }: { trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewDate, setViewDate] = useState<Date>(new Date());

    const sessions: PomodoroSession[] = JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]");

    // Calculate hours per day for the current month
    const monthDays = useMemo(() => {
        const start = startOfMonth(viewDate);
        const end = endOfMonth(viewDate);
        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            const daySessions = sessions.filter(s =>
                isSameDay(new Date(s.date), day)
            );
            const totalMinutes = daySessions.reduce((sum, s) => sum + s.duration, 0);
            return {
                date: day,
                hours: totalMinutes / 60,
                sessions: daySessions.length,
                tasks: daySessions
            };
        });
    }, [viewDate, sessions]);

    // Get selected date details
    const selectedDayData = useMemo(() => {
        const daySessions = sessions.filter(s =>
            isSameDay(new Date(s.date), selectedDate)
        );

        // Group by task
        const taskGroups = daySessions.reduce((acc, session) => {
            if (!acc[session.taskName]) {
                acc[session.taskName] = {
                    name: session.taskName,
                    sessions: 0,
                    minutes: 0
                };
            }
            acc[session.taskName].sessions += 1;
            acc[session.taskName].minutes += session.duration;
            return acc;
        }, {} as Record<string, { name: string; sessions: number; minutes: number }>);

        return {
            total: daySessions.length,
            totalHours: daySessions.reduce((sum, s) => sum + s.duration, 0) / 60,
            tasks: Object.values(taskGroups)
        };
    }, [selectedDate, sessions]);

    // Colors for task visualization
    const taskColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-primary">
                        Focus Analytics
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Track your productivity and focus time
                    </p>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh]">
                    <div className="space-y-6 py-4">
                        {/* Calendar with Pomodoro Indicators */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Focus Calendar</h3>
                            <div className="relative">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => date && setSelectedDate(date)}
                                    month={viewDate}
                                    onMonthChange={setViewDate}
                                    className="rounded-lg border"
                                    modifiers={{
                                        hasPomodoros: (date) => {
                                            return monthDays.some(d =>
                                                isSameDay(d.date, date) && d.sessions > 0
                                            );
                                        }
                                    }}
                                    modifiersClassNames={{
                                        hasPomodoros: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary"
                                    }}
                                />
                            </div>
                        </div>

                        {/* Selected Date Details */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">
                                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                                </h3>
                                <div className="text-sm text-muted-foreground">
                                    {selectedDayData.total} pomodoros • {selectedDayData.totalHours.toFixed(1)}h
                                </div>
                            </div>

                            {selectedDayData.total === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No focus sessions on this day</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Progress Bars */}
                                    {selectedDayData.tasks.map((task, index) => (
                                        <div key={task.name} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{task.name}</span>
                                                <span className="text-muted-foreground">
                                                    {task.sessions} × 25min
                                                </span>
                                            </div>
                                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full transition-all duration-500 rounded-full"
                                                    style={{
                                                        width: `${(task.minutes / (selectedDayData.totalHours * 60)) * 100}%`,
                                                        backgroundColor: taskColors[index % taskColors.length]
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Monthly Stats */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">
                                    {sessions.filter(s => {
                                        const sessionDate = new Date(s.date);
                                        return sessionDate.getMonth() === viewDate.getMonth() &&
                                            sessionDate.getFullYear() === viewDate.getFullYear();
                                    }).length}
                                </div>
                                <div className="text-xs text-muted-foreground">This Month</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">
                                    {(sessions.filter(s => {
                                        const sessionDate = new Date(s.date);
                                        return sessionDate.getMonth() === viewDate.getMonth() &&
                                            sessionDate.getFullYear() === viewDate.getFullYear();
                                    }).reduce((sum, s) => sum + s.duration, 0) / 60).toFixed(1)}h
                                </div>
                                <div className="text-xs text-muted-foreground">Focus Time</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">
                                    {Math.max(...monthDays.map(d => d.sessions), 0)}
                                </div>
                                <div className="text-xs text-muted-foreground">Best Day</div>
                            </div>
                        </div>

                        {/* Weekly Chart */}
                        <div className="space-y-2 pt-4 border-t border-border">
                            <h3 className="text-sm font-medium">Last 7 Days</h3>
                            <div className="flex items-end justify-between gap-1 h-32">
                                {monthDays.slice(-7).map((day, index) => {
                                    const maxSessions = Math.max(...monthDays.map(d => d.sessions), 1);
                                    const height = (day.sessions / maxSessions) * 100;

                                    return (
                                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                                            <div
                                                className="w-full bg-primary rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer"
                                                style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                                                title={`${day.sessions} pomodoros`}
                                            />
                                            <span className="text-[10px] text-muted-foreground">
                                                {format(day.date, "EEE")}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
