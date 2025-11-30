import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/layout/BottomNav";
import { Todo } from "@/lib/types";
import { getTodosFromStorage } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import confetti from "canvas-confetti";
import { LocalNotifications } from "@capacitor/local-notifications";
import { playAlarmSound } from "@/lib/sounds";

interface PomodoroSession {
    taskId: string;
    taskName: string;
    duration: number;
    date: string;
    timestamp: number;
}

export default function PomodoroPage() {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [totalTime, setTotalTime] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [selectedTask, setSelectedTask] = useState<string>("focus");
    const [todos, setTodos] = useState<Todo[]>([]);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [customMinutes, setCustomMinutes] = useState(25);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const backgroundTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const allTodos = getTodosFromStorage();
        const todayTodos = allTodos.filter(todo =>
            todo.date && isSameDay(new Date(todo.date), new Date()) && !todo.completed
        );
        setTodos(todayTodos);

        // Request notification permissions
        LocalNotifications.requestPermissions();

        // Restore timer state from localStorage
        const savedState = localStorage.getItem('pomodoro_state');
        if (savedState) {
            const { timeLeft: saved, totalTime: savedTotal, isRunning: savedRunning, backgroundStart } = JSON.parse(savedState);
            if (savedRunning && backgroundStart) {
                const elapsed = Math.floor((Date.now() - backgroundStart) / 1000);
                const remaining = Math.max(0, saved - elapsed);
                setTimeLeft(remaining);
                setTotalTime(savedTotal);
                setIsRunning(true);
            }
        }

        // Listen for app becoming visible again
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const handleVisibilityChange = () => {
        if (!document.hidden) {
            // App became visible - sync timer
            const savedState = localStorage.getItem('pomodoro_state');
            if (savedState) {
                const { totalTime: savedTotal, isRunning: savedRunning, backgroundStart } = JSON.parse(savedState);
                if (savedRunning && backgroundStart) {
                    const elapsed = Math.floor((Date.now() - backgroundStart) / 1000);
                    const remaining = Math.max(0, savedTotal - elapsed);
                    setTimeLeft(remaining);
                    if (remaining === 0) {
                        handlePomodoroComplete();
                    }
                }
            }
        }
    };

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    const newTime = prev - 1;
                    // Save state for background sync
                    localStorage.setItem('pomodoro_state', JSON.stringify({
                        timeLeft: newTime,
                        totalTime,
                        isRunning: true,
                        backgroundStart: Date.now() - ((totalTime - newTime) * 1000)
                    }));
                    return newTime;
                });
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            handlePomodoroComplete();
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft, totalTime]);

    const scheduleBackgroundNotification = async () => {
        try {
            // Create a channel for the alarm
            await LocalNotifications.createChannel({
                id: 'pomodoro_alarm',
                name: 'Pomodoro Alarm',
                description: 'Alarm for Pomodoro timer',
                importance: 5, // High importance
                visibility: 1, // Public
                sound: 'beep.wav', // Ensure this file exists in android/app/src/main/res/raw or use default
                vibration: true,
            });

            await LocalNotifications.schedule({
                notifications: [{
                    title: "Pomodoro Complete!",
                    body: "Your focus session has ended. Time for a break!",
                    id: Date.now(),
                    schedule: {
                        at: new Date(Date.now() + (timeLeft * 1000)),
                        allowWhileIdle: true // Critical for background execution on Android
                    },
                    channelId: 'pomodoro_alarm',
                    sound: 'beep.wav',
                    actionTypeId: "",
                    extra: null
                }]
            });
        } catch (error) {
            console.error("Error scheduling notification:", error);
        }
    };

    const handlePomodoroComplete = async () => {
        setIsRunning(false);
        localStorage.removeItem('pomodoro_state');

        // Play alarm sound
        playAlarmSound();

        // Save session
        const sessions = JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]");
        const newSession: PomodoroSession = {
            taskId: selectedTask,
            taskName: selectedTask === "focus" ? "Focus" : todos.find(t => t.id === selectedTask)?.text || "Focus",
            duration: customMinutes,
            date: format(new Date(), "yyyy-MM-dd"),
            timestamp: Date.now()
        };
        sessions.push(newSession);
        localStorage.setItem("pomodoro_sessions", JSON.stringify(sessions));
        setSessionsCompleted(prev => prev + 1);

        // Celebrate
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ff6b35', '#f7931e', '#ff8c42']
        });

        // Reset for next session
        setTimeLeft(totalTime);
    };

    const toggleTimer = async () => {
        if (!isRunning) {
            // Starting timer
            await scheduleBackgroundNotification();
            localStorage.setItem('pomodoro_state', JSON.stringify({
                timeLeft,
                totalTime,
                isRunning: true,
                backgroundStart: Date.now() - ((totalTime - timeLeft) * 1000)
            }));
        } else {
            // Pausing timer
            localStorage.setItem('pomodoro_state', JSON.stringify({
                timeLeft,
                totalTime,
                isRunning: false,
                backgroundStart: null
            }));
        }
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(totalTime);
        localStorage.removeItem('pomodoro_state');
    };

    const skipBreak = () => {
        setTimeLeft(totalTime);
        setIsRunning(false);
        localStorage.removeItem('pomodoro_state');
    };

    const updateTimer = () => {
        const newTotal = customMinutes * 60;
        setTotalTime(newTotal);
        setTimeLeft(newTotal);
        setShowSettings(false);
        localStorage.removeItem('pomodoro_state');
    };

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    const todaySessions = JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]")
        .filter((s: PomodoroSession) => s.date === format(new Date(), "yyyy-MM-dd"))
        .length;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
            {/* Header */}
            <div className="px-6 pt-8 pb-6 flex items-center justify-between">
                <h1 className="text-2xl font-medium">Pomodoro Timer</h1>
                <button
                    onClick={() => setShowSettings(true)}
                    className="px-4 py-2 bg-secondary rounded-full text-sm hover:bg-secondary/80 transition-colors"
                >
                    ⚙️ Set Timer
                </button>
            </div>

            {/* Timer Settings Dialog */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
                    <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border">
                        <h3 className="text-lg font-semibold mb-4">Timer Settings</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-muted-foreground mb-2 block">Minutes</label>
                                <input
                                    type="number"
                                    value={customMinutes}
                                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3"
                                    min="1"
                                    max="120"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={updateTimer}
                                    className="flex-1 text-white rounded-full py-3 font-medium"
                                    style={{ backgroundColor: 'var(--theme-primary)' }}
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="flex-1 bg-secondary hover:bg-secondary/80 rounded-full py-3 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
                {/* Task Selection */}
                <div className="w-full max-w-sm mb-8">
                    <Select value={selectedTask} onValueChange={setSelectedTask} disabled={isRunning}>
                        <SelectTrigger className="w-full bg-secondary border-border h-12 rounded-xl">
                            <SelectValue placeholder="Choose a task" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="focus">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
                                    Focus (Default)
                                </div>
                            </SelectItem>
                            {todos.map(todo => (
                                <SelectItem key={todo.id} value={todo.id}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        {todo.text}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Circular Progress Ring */}
                <div className="relative mb-12">
                    {/* Glow Effect */}
                    <div
                        className="absolute inset-0 rounded-full blur-3xl scale-110 opacity-20"
                        style={{ backgroundColor: 'var(--theme-primary)' }}
                    />

                    {/* SVG Circle */}
                    <svg className="w-80 h-80 transform -rotate-90 relative z-10">
                        {/* Background Circle */}
                        <circle
                            cx="160"
                            cy="160"
                            r="145"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            className="text-secondary"
                        />
                        {/* Progress Circle */}
                        <circle
                            cx="160"
                            cy="160"
                            r="145"
                            stroke="var(--theme-primary)"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 145}`}
                            strokeDashoffset={`${2 * Math.PI * 145 * (1 - progress / 100)}`}
                            className="transition-all duration-1000"
                            strokeLinecap="round"
                            style={{
                                filter: 'drop-shadow(0 0 12px rgba(var(--theme-primary-rgb), 0.6))'
                            }}
                        />
                    </svg>

                    {/* Time Display (Center) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.div
                            className="text-7xl font-bold tabular-nums tracking-tight"
                            animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
                            transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
                        >
                            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                        </motion.div>
                        <div className="text-sm text-muted-foreground mt-2 font-medium">
                            Focus Session
                        </div>
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {/* Reset Button */}
                    <button
                        onClick={resetTimer}
                        disabled={!isRunning && timeLeft === 25 * 60}
                        className="w-14 h-14 rounded-2xl bg-secondary/80 backdrop-blur-xl border border-border flex items-center justify-center hover:bg-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>

                    {/* Main Play/Pause Button */}
                    <button
                        onClick={toggleTimer}
                        disabled={timeLeft === 0}
                        className="w-20 h-20 rounded-3xl shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        style={{
                            backgroundColor: 'var(--theme-primary)',
                            boxShadow: '0 10px 15px -3px rgba(var(--theme-primary-rgb), 0.3)'
                        }}
                    >
                        {isRunning ? (
                            <Pause className="w-8 h-8 text-white" />
                        ) : (
                            <Play className="w-8 h-8 ml-1 text-white" />
                        )}
                    </button>

                    {/* Skip Break Button */}
                    <button
                        onClick={skipBreak}
                        className="w-14 h-14 rounded-2xl bg-secondary/80 backdrop-blur-xl border border-border flex items-center justify-center hover:bg-secondary transition-all"
                    >
                        <SkipForward className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Dots */}
                <div className="flex items-center gap-2 mb-8">
                    {[...Array(4)].map((_, index) => (
                        <div
                            key={index}
                            className={`w-2 h-2 rounded-full transition-all ${index < sessionsCompleted % 4
                                ? 'w-3'
                                : 'bg-secondary'
                                }`}
                            style={index < sessionsCompleted % 4 ? { backgroundColor: 'var(--theme-primary)' } : {}}
                        />
                    ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 w-full max-w-sm">
                    <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>{todaySessions}</div>
                        <div className="text-xs text-muted-foreground mt-1">Today</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>{sessionsCompleted}</div>
                        <div className="text-xs text-muted-foreground mt-1">Session</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>
                            {JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]").length}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Total</div>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
