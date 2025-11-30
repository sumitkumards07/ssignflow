import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Todo } from "@/lib/types";
import { getTodosFromStorage } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import confetti from "canvas-confetti";

interface PomodoroSession {
    taskId: string;
    taskName: string;
    duration: number; // in minutes
    date: string;
    timestamp: number;
}

export function PomodoroTimer({ trigger }: { trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
    const [isRunning, setIsRunning] = useState(false);
    const [selectedTask, setSelectedTask] = useState<string>("study");
    const [todos, setTodos] = useState<Todo[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Load today's todos
        const allTodos = getTodosFromStorage();
        const todayTodos = allTodos.filter(todo =>
            todo.date && isSameDay(new Date(todo.date), new Date()) && !todo.completed
        );
        setTodos(todayTodos);
    }, [isOpen]);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            handlePomodoroComplete();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft]);

    const handlePomodoroComplete = () => {
        setIsRunning(false);

        // Save session
        const sessions = JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]");
        const newSession: PomodoroSession = {
            taskId: selectedTask,
            taskName: selectedTask === "study" ? "Study" : todos.find(t => t.id === selectedTask)?.text || "Study",
            duration: 25,
            date: format(new Date(), "yyyy-MM-dd"),
            timestamp: Date.now()
        };
        sessions.push(newSession);
        localStorage.setItem("pomodoro_sessions", JSON.stringify(sessions));

        // Celebrate
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        // Play sound notification
        const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBT2P1vLBcCUFLIHO8tiJNw==");
        audio.play().catch(() => { });
    };

    const toggleTimer = () => {
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(25 * 60);
    };

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const progress = ((25 * 60 - timeLeft) / (25 * 60)) * 100;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-gradient-to-b from-card to-card/95 border-border">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl font-semibold text-primary">
                        Pomodoro Timer
                    </DialogTitle>
                    <p className="text-center text-sm text-muted-foreground">
                        Focus on work and study
                    </p>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Task Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Task</label>
                        <Select value={selectedTask} onValueChange={setSelectedTask} disabled={isRunning}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a task" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="study">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                                        Study (Default)
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

                    {/* Timer Display */}
                    <div className="relative flex items-center justify-center py-8">
                        {/* Progress Circle */}
                        <svg className="absolute w-64 h-64 transform -rotate-90">
                            <circle
                                cx="128"
                                cy="128"
                                r="120"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-secondary"
                            />
                            <circle
                                cx="128"
                                cy="128"
                                r="120"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 120}`}
                                strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                                className="text-primary transition-all duration-1000"
                                strokeLinecap="round"
                            />
                        </svg>

                        {/* Time Display */}
                        <div className="text-center z-10">
                            <div className="text-6xl font-bold tabular-nums">
                                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                            </div>
                            <div className="text-sm text-muted-foreground mt-2">
                                {selectedTask === "study" ? "Study" : todos.find(t => t.id === selectedTask)?.text || "Study"}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={resetTimer}
                            className="w-12 h-12 rounded-full"
                            disabled={!isRunning && timeLeft === 25 * 60}
                        >
                            <RotateCcw className="w-5 h-5" />
                        </Button>

                        <Button
                            onClick={toggleTimer}
                            className="w-32 h-12 rounded-full text-base font-semibold"
                            disabled={timeLeft === 0}
                        >
                            {isRunning ? (
                                <>
                                    <Pause className="w-5 h-5 mr-2" />
                                    Pause
                                </>
                            ) : timeLeft === 0 ? (
                                <>
                                    <Check className="w-5 h-5 mr-2" />
                                    Complete
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5 mr-2" />
                                    Start
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">25</div>
                            <div className="text-xs text-muted-foreground">Minutes</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                                {JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]")
                                    .filter((s: PomodoroSession) => s.date === format(new Date(), "yyyy-MM-dd"))
                                    .length}
                            </div>
                            <div className="text-xs text-muted-foreground">Today</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                                {JSON.parse(localStorage.getItem("pomodoro_sessions") || "[]").length}
                            </div>
                            <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
