import React, { useState, useEffect, useRef, useMemo } from "react";
import { Share2, RotateCcw, Play, Pause, SkipForward, Volume2, VolumeX, Maximize2, Minimize2, CheckCircle2, Check, Flame, Star, Trophy, Target, Activity, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/layout/BottomNav";
import { Todo } from "@/lib/types";
import { cn, getTodosFromStorage } from "@/lib/utils";
import { format, isSameDay, subDays } from "date-fns";
import confetti from "canvas-confetti";
import { LocalNotifications } from "@capacitor/local-notifications";
import { playAlarmSound, playSuccessSound } from "@/lib/sounds";
import { scheduleNotification } from "@/lib/notifications";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { getDeviceTier, shouldEnableBlur, shouldEnableParticles } from "@/lib/performance";

interface PomodoroSession {
    taskId: string;
    taskName: string;
    duration: number;
    date: string;
    timestamp: number;
}

export default function PomodoroPage() {
    const savedMinutes = parseInt(localStorage.getItem('pomodoro_custom_minutes') || '25', 10);
    const [timeLeft, setTimeLeft] = useState(savedMinutes * 60);
    const [totalTime, setTotalTime] = useState(savedMinutes * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false); // New state for break mode
    const [showVictory, setShowVictory] = useState(false);
    const [selectedTask, setSelectedTask] = useState<string>("focus");
    const [todos, setTodos] = useState<Todo[]>([]);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [showSettings, setShowSettings] = useState(false);

    // Performance Adaptive Stats
    const [deviceTier] = useState(() => getDeviceTier());

    const [customMinutes, setCustomMinutes] = useState(() => {
        const saved = localStorage.getItem('pomodoro_custom_minutes');
        return saved ? parseInt(saved, 10) : 25;
    });
    const [dndEnabled, setDndEnabled] = useState(() => {
        return localStorage.getItem('pomodoro_dnd') === 'true';
    });
    const intervalRef = useRef<number | null>(null);
    const endTimeRef = useRef<number | null>(null);
    const { toast } = useToast();

    // Sound Refs
    const tickSound = useMemo(() => new Audio('/sounds/tick.mp3'), []);
    const alarmSound = useMemo(() => new Audio('/sounds/alarm.mp3'), []);

    // Haptic Feedback Helper
    const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
        try {
            await Haptics.impact({ style });
        } catch (e) {
            // Haptics not supported or failed
        }
    };

    // Precision Timer Logic (Date.now() delta)
    useEffect(() => {
        if (isRunning && endTimeRef.current) {
            intervalRef.current = window.setInterval(() => {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((endTimeRef.current! - now) / 1000));

                setTimeLeft(remaining);

                // Tick Haptic & Sound (every 60s)
                if (remaining > 0 && remaining % 60 === 0) {
                    triggerHaptic(ImpactStyle.Light);
                    try { tickSound.currentTime = 0; tickSound.play().catch(() => { }); } catch (e) { }
                }

                if (remaining <= 0) {
                    handlePomodoroComplete();
                }
            }, 100); // Polling at 100ms for responsiveness, but updates state only when second changes effectively due to ceil
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning]);

    const toggleTimer = () => {
        triggerHaptic(ImpactStyle.Medium);
        if (isRunning) {
            // Pause
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            // Save state if needed (not fully implemented in this simplified view)
        } else {
            // Start
            setIsRunning(true);
            const targetTime = Date.now() + (timeLeft * 1000);
            endTimeRef.current = targetTime;

            // Re-schedule notification for accurate background alarm
            LocalNotifications.cancel(getPendingNotificationId());
            scheduleBackgroundNotification(targetTime);
        }
    };

    const resetTimer = () => {
        triggerHaptic(ImpactStyle.Heavy);
        setIsRunning(false);
        const minutes = isBreak ? 5 : customMinutes; // Default break 5m, custom focus
        setTimeLeft(minutes * 60);
        setTotalTime(minutes * 60);
    };

    // Helper for notification ID
    const getPendingNotificationId = () => {
        return { notifications: [{ id: 1 }] }; // Simplified ID management
    };

    const scheduleBackgroundNotification = async (targetTime: number) => {
        try {
            const permission = await LocalNotifications.checkPermissions();
            if (permission.display === 'granted') {
                await LocalNotifications.schedule({
                    notifications: [{
                        title: isBreak ? "Break Over!" : "Focus Complete!",
                        body: isBreak ? "Time to focus." : "Great session! Take a break.",
                        id: 1,
                        schedule: { at: new Date(targetTime) },
                        sound: 'default',
                    }]
                });
            }
        } catch (error) {
            console.error("Error scheduling notification:", error);
        }
    };

    // Calculate progress for the ring
    const progress = useMemo(() => {
        return ((totalTime - timeLeft) / totalTime) * 100;
    }, [timeLeft, totalTime]);

    // Format time M:SS or MM:SS
    const formattedTime = useMemo(() => {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }, [timeLeft]);

    const handlePomodoroComplete = async () => {
        setIsRunning(false);
        localStorage.removeItem('pomodoro_state');

        // Play success fanfare for focus completion
        if (!isBreak) {
            playSuccessSound();
        } else {
            playAlarmSound();
        }

        // Also vibrate on mobile if supported
        if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500, 200, 500]);
        }
        await Haptics.notification({ type: NotificationType.Success });


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

            // Award XP & Crates (Duolingo x Free Fire Engine)
            const currentXP = Number(localStorage.getItem("user_xp") || "0");
            const newXP = currentXP + actualDurationMinutes;
            localStorage.setItem("user_xp", String(newXP));

            const totalMinutes = sessions.reduce((acc: number, s: any) => acc + s.duration, 0);
            const prevTotalMinutes = totalMinutes - actualDurationMinutes;
            const newCrateAwarded = Math.floor(totalMinutes / 120) > Math.floor(prevTotalMinutes / 120);

            if (newCrateAwarded) {
                const currentCrates = Number(localStorage.getItem("unopened_crates") || "0");
                localStorage.setItem("unopened_crates", String(currentCrates + 1));
                toast({
                    title: "TACTICAL SUPPLY DROP",
                    description: "120m focus milestone reached. Crate added to vault.",
                });
            }

            // Celebrate
            setShowVictory(true); // Full-screen "Perfect Session!" card
            if (shouldEnableParticles(deviceTier)) {
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#58cc02', '#f7931e', '#ff8c42'], // Added Duolingo Green
                    zIndex: 9999
                });
            }
            setTimeout(() => setShowVictory(false), 5000);

            // Start Break Automatically
            setIsBreak(true);
            const breakTime = 5 * 60;
            setTotalTime(breakTime);
            setTimeLeft(breakTime);

            // Precision Timer Start
            setIsRunning(true);
            const targetTime = Date.now() + (breakTime * 1000);
            endTimeRef.current = targetTime;
            scheduleBackgroundNotification(targetTime);

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
            // Don't auto-start focus

            // Update Widget
            import("@/lib/widgetBridge").then(({ updatePomodoroWidget }) => {
                updatePomodoroWidget(String(customMinutes).padStart(2, '0') + ":00", false, 100);
            });
        }
    };



    const todaySessions = JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]")
        .filter((s: PomodoroSession) => s.date === format(new Date(), "yyyy-MM-dd"))
        .length;

    const streak = useMemo(() => {
        const sessions = JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]");
        const uniqueDays = new Set(sessions.map((s: any) => s.date));
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
        return currentStreak;
    }, [sessionsCompleted]);


    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-500 flex flex-col pb-[120px] relative overflow-hidden">
            {/* Ambient Background Glow (Animated) */}
            {/* Ambient Background Glow (Static) */}
            <div
                className={cn(
                    "fixed inset-0 pointer-events-none opacity-20 transition-colors duration-1000",
                    isBreak ? "bg-blue-500/10" : "bg-orange-500/10"
                )}
            />

            {/* Simple Header with Notch Safety */}
            <header className="pt-safe px-6 pt-4 flex items-center justify-between w-full relative z-10 shrink-0">
                <div className="flex flex-col items-start">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Focus
                    </h1>
                    <div className={cn(
                        "mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                        isBreak
                            ? "border-blue-500/20 text-blue-400 bg-blue-500/5"
                            : "border-orange-500/20 text-orange-500 bg-orange-500/5"
                    )}>
                        {isBreak ? "Rest & Recover" : "Deep Work"}
                    </div>
                </div>

                {/* Streak Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/50 border border-white/5 rounded-full">
                    <Flame className={cn("w-4 h-4", streak > 0 ? "fill-orange-500 text-orange-500" : "text-zinc-600")} />
                    <span className={cn("text-sm font-bold font-mono", streak > 0 ? "text-orange-500" : "text-zinc-500")}>{streak}</span>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 w-full max-w-lg mx-auto pb-safe">
                {/* Flow State Clock (Static) */}
                <div
                    className="relative w-80 h-80 max-w-[80vw] max-h-[80vw] flex items-center justify-center mb-10"
                >    {/* Ambient Glow */}
                    <div className={cn(
                        "absolute inset-0 rounded-full blur-[50px] opacity-20",
                        isBreak ? "bg-blue-500" : "bg-orange-500"
                    )} />

                    {/* Static Progress Ring using CSS Conic Gradient (GPU Accelerated) */}
                    <div className="relative w-[280px] h-[280px] rounded-full bg-zinc-900 border-8 border-white/5 flex items-center justify-center shadow-2xl">
                        {/* Progress Segment */}
                        <div
                            className="absolute inset-0 rounded-full transition-[background] duration-500"
                            style={{
                                background: `conic-gradient(${isBreak ? '#3b82f6' : '#f97316'} ${progress}%, transparent ${progress}%)`,
                                WebkitMask: 'radial-gradient(transparent 65%, black 66%)', // Create the ring shape
                                mask: 'radial-gradient(transparent 65%, black 66%)'
                            }}
                        />
                        {/* Cap ends if needed, but smooth gradient is fine for now */}
                    </div>

                    {/* Central Time Readout */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-7xl font-bold tabular-nums tracking-tighter text-white font-mono drop-shadow-lg">
                            {formattedTime}
                        </div>
                        <div className={cn(
                            "mt-2 text-xs font-bold uppercase tracking-[0.2em] opacity-80",
                            isBreak ? "text-blue-300" : "text-orange-300"
                        )}>
                            {isRunning ? "Flow State" : "Ready"}
                        </div>
                    </div>
                </div>

                {/* High-End Controls with Spring Physics */}
                <div className="flex flex-col items-center gap-10 w-full mb-8">
                    {/* Task Pill */}
                    <div className="w-full max-w-xs">
                        <Select value={selectedTask} onValueChange={setSelectedTask} disabled={isRunning}>
                            <SelectTrigger className="w-full bg-black/20 backdrop-blur-md border-white/5 h-12 rounded-full text-sm font-medium text-center justify-center shadow-inner">
                                <SelectValue placeholder="Select Focus Objective" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900/95 backdrop-blur-xl border-zinc-800 rounded-2xl">
                                <SelectItem value="focus">Generic Focus</SelectItem>
                                {todos.map(todo => (
                                    <SelectItem key={todo.id} value={todo.id}>{todo.text}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-center gap-8">
                        {/* Reset */}
                        <button
                            onClick={() => {
                                Haptics.impact({ style: ImpactStyle.Light });
                                resetTimer();
                            }}
                            className="w-16 h-16 flex items-center justify-center rounded-full bg-zinc-800/50 backdrop-blur-sm border border-white/5 text-zinc-400 hover:text-white transition-colors active:scale-95"
                        >
                            <RotateCcw className="w-6 h-6" />
                        </button>

                        {/* PLAY/PAUSE */}
                        <button
                            onClick={() => {
                                Haptics.impact({ style: ImpactStyle.Medium });
                                toggleTimer();
                            }}
                            className={cn(
                                "w-24 h-24 flex items-center justify-center rounded-full shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-white/10 relative overflow-hidden group active:scale-95 transition-transform",
                                isRunning
                                    ? "bg-zinc-900"
                                    : "bg-gradient-to-br from-orange-400 to-orange-600"
                            )}
                        >
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {isRunning ? (
                                <Pause className="w-10 h-10 fill-white text-white/90" />
                            ) : (
                                <Play className="w-10 h-10 fill-white text-white ml-2 drop-shadow-md" />
                            )}
                        </button>

                        {/* Settings */}
                        <button
                            onClick={() => {
                                Haptics.impact({ style: ImpactStyle.Light });
                                setShowSettings(true);
                            }}
                            className="w-16 h-16 flex items-center justify-center rounded-full bg-zinc-800/50 backdrop-blur-sm border border-white/5 text-zinc-400 hover:text-white transition-colors active:scale-95"
                        >
                            <Target className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Glassmorphism Stat Bar */}
                <div className="w-full max-w-sm bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-between p-4 shadow-xl">
                    <div className="flex-1 flex flex-col items-center border-r border-white/5">
                        <div className="flex items-center gap-1.5 mb-1 text-orange-400">
                            <Activity className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Session</span>
                        </div>
                        <div className="text-xl font-mono font-bold text-white leading-none">{todaySessions}</div>
                    </div>

                    <div className="flex-1 flex flex-col items-center border-r border-white/5">
                        <div className="flex items-center gap-1.5 mb-1 text-blue-400">
                            <Trophy className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Total</span>
                        </div>
                        <div className="text-xl font-mono font-bold text-white leading-none">{sessionsCompleted}</div>
                    </div>

                    <div className="flex-1 flex flex-col items-center">
                        <div className="flex items-center gap-1.5 mb-1 text-yellow-400">
                            <Zap className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Logic</span>
                        </div>
                        <div className="text-xl font-mono font-bold text-white leading-none">
                            {JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]").length}
                        </div>
                    </div>
                </div>
            </main>

            {/* Victory Overlay (Static) */}
            {showVictory && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-300"
                >
                    <div
                        className="text-center p-8 apple-glass rounded-[3rem] border-2 border-safety-orange/20 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300"
                    >
                        <Trophy className="w-16 h-16 text-warning-gold mx-auto mb-4 animate-bounce" />
                        <h2 className="text-3xl font-black italic text-foreground tracking-tighter mb-2 uppercase leading-none">Achievement Unlocked</h2>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-safety-orange/60 mb-8 italic">Peak Performance Protocol</p>

                        <div className="flex gap-4 mb-8">
                            <div className="flex-1 apple-card p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-success-green mb-1">Growth XP</div>
                                <div className="text-2xl font-black italic tabular-nums">+25</div>
                            </div>
                            <div className="flex-1 apple-card p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-mythic-magenta mb-1">Status</div>
                                <div className="text-xl font-black italic uppercase">Mythic</div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowVictory(false)}
                            className="w-full py-4 bg-safety-orange text-white font-black italic rounded-full uppercase text-sm shadow-lg shadow-safety-orange/20 active:scale-95 transition-transform"
                        >
                            Continue Growth
                        </button>
                    </div>
                </div>
            )}

            {/* Timer Settings Dialog */}
            {
                showSettings && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
                        <div className="bg-card rounded-[2.5rem] p-8 max-w-sm w-full border border-border shadow-2xl">
                            <h3 className="apple-header text-2xl mb-6">Mission Config</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Focus Duration</label>
                                    <input
                                        type="number"
                                        value={customMinutes}
                                        onChange={(e) => setCustomMinutes(Number(e.target.value))}
                                        className="w-full bg-secondary border border-border rounded-2xl px-4 py-4 text-xl font-bold"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => { resetTimer(); setShowSettings(false); }}
                                        className="flex-1 bg-orange-500 text-white rounded-2xl py-4 font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20"
                                    >
                                        Engage
                                    </button>
                                    <button
                                        onClick={() => setShowSettings(false)}
                                        className="flex-1 bg-secondary text-foreground rounded-2xl py-4 font-black uppercase text-xs tracking-widest"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <BottomNav />
        </div >
    );
}
