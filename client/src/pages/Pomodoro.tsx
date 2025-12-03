import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, SkipForward, Music, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/layout/BottomNav";
import { Todo } from "@/lib/types";
import { getTodosFromStorage } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import confetti from "canvas-confetti";
import { LocalNotifications } from "@capacitor/local-notifications";
import { playAlarmSound } from "@/lib/sounds";
import { scheduleNotification } from "@/lib/notifications";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

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
    const [isBreak, setIsBreak] = useState(false); // New state for break mode
    const [selectedTask, setSelectedTask] = useState<string>("focus");
    const [todos, setTodos] = useState<Todo[]>([]);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [showMusic, setShowMusic] = useState(false);
    const [spotifyLink, setSpotifyLink] = useState("https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS?utm_source=generator");
    const [customMinutes, setCustomMinutes] = useState(25);
    const [dndEnabled, setDndEnabled] = useState(() => {
        return localStorage.getItem('pomodoro_dnd') === 'true';
    });
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const backgroundTimerRef = useRef<number | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        localStorage.setItem('pomodoro_dnd', String(dndEnabled));
    }, [dndEnabled]);

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
            const { timeLeft: saved, totalTime: savedTotal, isRunning: savedRunning, backgroundStart, isBreak: savedIsBreak } = JSON.parse(savedState);
            if (savedIsBreak !== undefined) setIsBreak(savedIsBreak);

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
                    const minutes = Math.floor(newTime / 60);
                    const seconds = newTime % 60;
                    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                    const progress = ((totalTime - newTime) / totalTime) * 100;

                    // Save state for background sync
                    const backgroundStart = Date.now() - ((totalTime - newTime) * 1000);
                    localStorage.setItem('pomodoro_state', JSON.stringify({
                        timeLeft: newTime,
                        totalTime,
                        isRunning: true,
                        backgroundStart,
                        isBreak
                    }));

                    // Update Widget
                    // We send the absolute target time (when timer ends) for Chronometer
                    const targetTime = Date.now() + (newTime * 1000);

                    if (newTime % 5 === 0) { // Update widget every 5 seconds to save battery
                        import("@/lib/widgetBridge").then(({ updatePomodoroWidget }) => {
                            updatePomodoroWidget(timeString, true, progress, targetTime);
                        });
                    }

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
    }, [isRunning, timeLeft, totalTime, isBreak]);

    const scheduleBackgroundNotification = async () => {
        try {
            await LocalNotifications.schedule({
                notifications: [{
                    title: isBreak ? "Break Over!" : "Pomodoro Complete!",
                    body: isBreak ? "Time to focus again." : "Your focus session has ended. Time for a break!",
                    id: Date.now(),
                    schedule: {
                        at: new Date(Date.now() + (timeLeft * 1000)),
                        allowWhileIdle: true
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
        playAlarmSound();

        if (dndEnabled) {
            toast({
                title: "Session Complete",
                description: "You can disable Do Not Disturb mode now.",
            });
            scheduleNotification(
                Date.now() + 2,
                "Session Complete",
                "You can disable Do Not Disturb mode now.",
                new Date(Date.now() + 1000)
            );
        }

        if (!isBreak) {
            // Focus Session Completed
            // Save session - Use actual elapsed time for accurate duration
            const elapsedSeconds = totalTime - timeLeft;
            const actualDurationMinutes = Math.floor(elapsedSeconds / 60);

            const sessions = JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]");
            const newSession: PomodoroSession = {
                taskId: selectedTask,
                taskName: selectedTask === "focus" ? "Focus" : todos.find(t => t.id === selectedTask)?.text || "Focus",
                duration: actualDurationMinutes, // Fix: Use actual configured time
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

            // Start Break Automatically
            setIsBreak(true);
            setTotalTime(5 * 60); // 5 minute break
            setTimeLeft(5 * 60);
            setIsRunning(true); // Auto start break

            // Update Widget for Break
            import("@/lib/widgetBridge").then(({ updatePomodoroWidget }) => {
                updatePomodoroWidget("05:00", true, 0, Date.now() + (5 * 60 * 1000));
            });

        } else {
            // Break Completed
            setIsBreak(false);
            const focusTime = customMinutes * 60;
            setTotalTime(focusTime);
            setTimeLeft(focusTime);
            // Don't auto-start focus, let user decide

            // Update Widget
            import("@/lib/widgetBridge").then(({ updatePomodoroWidget }) => {
                updatePomodoroWidget(String(customMinutes).padStart(2, '0') + ":00", false, 100);
            });
        }
    };

    const toggleTimer = async () => {
        if (!isRunning) {
            // Starting timer
            if (dndEnabled) {
                toast({
                    title: "Focus Mode",
                    description: "Please enable Do Not Disturb mode for best focus.",
                });
                // Immediate notification for DND
                scheduleNotification(
                    Date.now() + 1,
                    "Focus Mode Started",
                    "Please enable Do Not Disturb mode on your device.",
                    new Date(Date.now() + 1000)
                );
            }
            await scheduleBackgroundNotification();
            localStorage.setItem('pomodoro_state', JSON.stringify({
                timeLeft,
                totalTime,
                isRunning: true,
                backgroundStart: Date.now() - ((totalTime - timeLeft) * 1000),
                isBreak
            }));
        } else {
            // Pausing timer
            localStorage.setItem('pomodoro_state', JSON.stringify({
                timeLeft,
                totalTime,
                isRunning: false,
                backgroundStart: null,
                isBreak
            }));
        }
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        if (isBreak) {
            setTimeLeft(5 * 60);
        } else {
            setTimeLeft(customMinutes * 60);
        }
        localStorage.removeItem('pomodoro_state');
    };

    const skipBreak = () => {
        setIsBreak(false);
        setIsRunning(false);
        const focusTime = customMinutes * 60;
        setTotalTime(focusTime);
        setTimeLeft(focusTime);
        localStorage.removeItem('pomodoro_state');

        // Update Widget
        import("@/lib/widgetBridge").then(({ updatePomodoroWidget }) => {
            updatePomodoroWidget(String(customMinutes).padStart(2, '0') + ":00", false, 100);
        });
    };

    const updateTimer = () => {
        const newTotal = customMinutes * 60;
        setTotalTime(newTotal);
        setTimeLeft(newTotal);
        setShowSettings(false);
        localStorage.removeItem('pomodoro_state');
        setIsBreak(false); // Reset to focus mode on settings change
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
            <div className="px-6 pb-6 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}>
                <h1 className="text-2xl font-medium">Pomodoro Timer</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowMusic(true)}
                        className="p-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
                    >
                        <Music className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="px-4 py-2 bg-secondary rounded-full text-sm hover:bg-secondary/80 transition-colors"
                    >
                        ⚙️ Set Timer
                    </button>
                </div>
            </div>

            {/* Music Player Dialog */}
            {showMusic && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowMusic(false)}>
                    <div className="bg-card rounded-2xl p-4 max-w-sm w-full border border-border" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Focus Music</h3>
                            <button onClick={() => setShowMusic(false)} className="p-1 hover:bg-secondary rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Paste Spotify Link (Song/Playlist)"
                                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm mb-2"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const target = e.target as HTMLInputElement;
                                        const url = target.value;
                                        if (url.includes('spotify.com')) {
                                            // Convert to embed URL
                                            // https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
                                            // -> https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT
                                            const embedUrl = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
                                            setSpotifyLink(embedUrl);
                                            target.value = '';
                                        }
                                    }
                                }}
                            />
                            <p className="text-[10px] text-muted-foreground">Paste link and press Enter</p>
                        </div>

                        <iframe
                            style={{ borderRadius: '12px' }}
                            src={spotifyLink}
                            width="100%"
                            height="80"
                            frameBorder="0"
                            allowFullScreen
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                        ></iframe>
                    </div>
                </div>
            )}

            {/* Timer Settings Dialog */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
                    <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border">
                        <h3 className="text-lg font-semibold mb-4">Timer Settings</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-muted-foreground mb-2 block">Focus Minutes</label>
                                <input
                                    type="number"
                                    value={customMinutes}
                                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3"
                                    min="1"
                                    max="120"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-muted-foreground">DND Reminders</label>
                                <Switch
                                    checked={dndEnabled}
                                    onCheckedChange={setDndEnabled}
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
                        style={{ backgroundColor: isBreak ? '#4CAF50' : 'var(--theme-primary)' }}
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
                            stroke={isBreak ? '#4CAF50' : "var(--theme-primary)"}
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 145}`}
                            strokeDashoffset={`${2 * Math.PI * 145 * (1 - progress / 100)}`}
                            className="transition-all duration-1000"
                            strokeLinecap="round"
                            style={{
                                filter: `drop-shadow(0 0 12px ${isBreak ? 'rgba(76, 175, 80, 0.6)' : 'rgba(var(--theme-primary-rgb), 0.6)'})`
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
                            {isBreak ? "Break Time" : "Focus Session"}
                        </div>
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {/* Reset Button */}
                    <button
                        onClick={resetTimer}
                        className="w-14 h-14 rounded-2xl bg-secondary/80 backdrop-blur-xl border border-border flex items-center justify-center hover:bg-secondary transition-all"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>

                    {/* Main Play/Pause Button */}
                    <button
                        onClick={toggleTimer}
                        disabled={timeLeft === 0}
                        className="w-20 h-20 rounded-3xl shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        style={{
                            backgroundColor: isBreak ? '#4CAF50' : 'var(--theme-primary)',
                            boxShadow: `0 10px 15px -3px ${isBreak ? 'rgba(76, 175, 80, 0.3)' : 'rgba(var(--theme-primary-rgb), 0.3)'}`
                        }}
                    >
                        {isRunning ? (
                            <Pause className="w-8 h-8 text-white" />
                        ) : (
                            <Play className="w-8 h-8 ml-1 text-white" />
                        )}
                    </button>

                    {/* Complete Early Button */}
                    {isRunning && !isBreak && (
                        <button
                            onClick={handlePomodoroComplete}
                            className="w-14 h-14 rounded-2xl bg-secondary/80 backdrop-blur-xl border border-border flex items-center justify-center hover:bg-secondary transition-all"
                            title="Complete Early"
                        >
                            <Check className="w-5 h-5 text-green-500" />
                        </button>
                    )}

                    {/* Skip Break Button */}
                    {isBreak && (
                        <button
                            onClick={skipBreak}
                            className="w-14 h-14 rounded-2xl bg-secondary/80 backdrop-blur-xl border border-border flex items-center justify-center hover:bg-secondary transition-all"
                            title="Skip Break"
                        >
                            <SkipForward className="w-5 h-5" />
                        </button>
                    )}
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
