import React, { useState, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/layout/BottomNav";
import { AddTodoDrawer } from "@/components/AddTodoDrawer";
import { TimelineItem } from "@/components/TimelineItem";
import { Todo } from "@/lib/types";
import { getTodosFromStorage, saveTodoToStorage, updateTodosInStorage } from "@/lib/utils";
import { playSuccessSound, playDeleteSound } from "@/lib/sounds";
import { scheduleNotification, requestNotificationPermissions } from "@/lib/notifications";
import { format, isSameDay, parseISO, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import confetti from "canvas-confetti";
import { backupData } from "@/lib/backup";
import { Tutorial } from "@/components/Tutorial";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TodoPage() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [todoToDelete, setTodoToDelete] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>("All");
    const [xp, setXp] = useState(() => Number(localStorage.getItem("user_xp") || "0"));
    const [floatingXp, setFloatingXp] = useState<{ id: string, amount: number }[]>([]);

    useEffect(() => {
        localStorage.setItem("user_xp", xp.toString());
    }, [xp]);

    const calculateTier = (xp: number) => {
        if (xp < 500) return { name: "Bronze III", color: "text-orange-700" };
        if (xp < 1000) return { name: "Bronze II", color: "text-orange-600" };
        if (xp < 2000) return { name: "Bronze I", color: "text-orange-500" };
        if (xp < 4000) return { name: "Silver III", color: "text-gray-400" };
        if (xp < 7000) return { name: "Silver II", color: "text-gray-300" };
        if (xp < 10000) return { name: "Silver I", color: "text-slate-200" };
        if (xp < 15000) return { name: "Gold III", color: "text-yellow-600" };
        return { name: "Gold II", color: "text-yellow-500" };
    };

    const tier = calculateTier(xp);

    // Get user info
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const username = user.displayName || user.username || user.email || "User";
    const initials = username.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);

    useEffect(() => {
        const syncTasks = async () => {
            try {
                // Load from local storage - LOCAL IS THE SOURCE OF TRUTH
                const localTodos = getTodosFromStorage();
                setTodos(localTodos);

                // Only restore from server if local storage is completely empty
                // This prevents duplication when server creates new IDs for tasks
                if (localTodos.length === 0) {
                    const { apiRequest } = await import("@/lib/queryClient");
                    const res = await apiRequest("GET", "/api/tasks");
                    const serverTasks = await res.json();

                    if (serverTasks && Array.isArray(serverTasks) && serverTasks.length > 0) {
                        // Convert server tasks to local Todo format
                        const convertedTasks: Todo[] = serverTasks.map(t => {
                            const dateObj = new Date(t.deadline);
                            const dateStr = dateObj.getFullYear() + '-' +
                                String(dateObj.getMonth() + 1).padStart(2, '0') + '-' +
                                String(dateObj.getDate()).padStart(2, '0');
                            const timeStr = String(dateObj.getHours()).padStart(2, '0') + ':' +
                                String(dateObj.getMinutes()).padStart(2, '0');

                            return {
                                id: t.id,
                                text: t.title,
                                completed: t.completed,
                                date: dateStr,
                                time: timeStr,
                                category: t.courseCode,
                                createdAt: dateObj.getTime(),
                                hasAlarm: false
                            };
                        });

                        // Restore from server (first install / after data wipe)
                        updateTodosInStorage(convertedTasks);
                        setTodos(convertedTasks);

                        import("@/lib/widgetBridge").then(({ updateTodoWidget }) => {
                            updateTodoWidget(convertedTasks);
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to sync tasks from server:", error);
            }
        };

        syncTasks();

        // Warm-up Cache Strategy (Uber-style)
        // Prefetch "Clash Zone" (Leaderboard) data when user is viewing tasks
        const warmUpCache = async () => {
            try {
                const { queryClient, apiRequest } = await import("@/lib/queryClient");
                console.log("[WarmUp] Prefetching Leaderboard data...");
                await queryClient.prefetchQuery({
                    queryKey: ['leaderboard'],
                    queryFn: async () => {
                        const res = await apiRequest("GET", "/api/leaderboard");
                        return res.json();
                    },
                    staleTime: 60 * 1000 // 1 minute freshness
                });
            } catch (e) {
                console.warn("[WarmUp] Failed to prefetch", e);
            }
        };

        // Use requestIdleCallback if available to not block main thread
        if ('requestIdleCallback' in window) {
            // @ts-ignore
            window.requestIdleCallback(() => warmUpCache(), { timeout: 5000 });
        } else {
            setTimeout(warmUpCache, 3000);
        }
    }, []);

    // ... existing imports

    const handleAddTodo = React.useCallback(async (todoData: Omit<Todo, 'id' | 'createdAt'>) => {
        const newTodo: Todo = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            ...todoData
        };

        saveTodoToStorage(newTodo);
        setTodos(prev => [...prev, newTodo]);
        playSuccessSound();
        backupData(true); // Auto-backup

        if (newTodo.hasAlarm && newTodo.time && newTodo.date) {
            const hasPermission = await requestNotificationPermissions();
            if (hasPermission) {
                const [hours, minutes] = newTodo.time.split(':').map(Number);
                const scheduleDate = parseISO(newTodo.date);
                scheduleDate.setHours(hours, minutes, 0, 0);
                const notificationId = Math.abs(newTodo.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
                scheduleNotification(notificationId, "Task Reminder", newTodo.text, scheduleDate);
            } else {
                console.warn("Notification permissions denied");
            }
        }

        // Sync with server
        try {
            const { apiRequest } = await import("@/lib/queryClient");
            await apiRequest("POST", "/api/tasks", {
                userId: user.id,
                type: "todo",
                title: newTodo.text,
                courseCode: newTodo.category || "General",
                sectionId: "default",
                deadline: newTodo.date ? `${newTodo.date}T${newTodo.time || "00:00"}` : new Date().toISOString(),
                completed: newTodo.completed,
                notificationTime: 24 * 60
            });
        } catch (error) {
            console.error("Failed to sync todo to server:", error);
        }

        // Update Widget
        console.log("Syncing new todo to widget:", newTodo);
        import("@/lib/widgetBridge").then(({ updateTodoWidget }) => {
            updateTodoWidget([...todos, newTodo]);
        });

        setIsDrawerOpen(false);
    }, [todos, user.id]);

    const handleToggleTodo = React.useCallback((id: string) => {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;

        const updatedTodo = { ...todo, completed: !todo.completed };
        const updatedTodos = todos.map(t => t.id === id ? updatedTodo : t);

        updateTodosInStorage(updatedTodos);
        setTodos(updatedTodos);
        backupData(true); // Auto-backup

        // Update Widget
        import("@/lib/widgetBridge").then(({ updateTodoWidget }) => {
            updateTodoWidget(updatedTodos);
        });

        // Optimistic Sync
        import("@/lib/queryClient").then(({ apiRequest }) => {
            apiRequest("PATCH", `/api/tasks/${id}`, { completed: updatedTodo.completed })
                .catch(err => console.error("Failed to sync task toggle:", err));
        });

        if (updatedTodo.completed) {
            playSuccessSound();
            // Haptic success feedback
            import("@capacitor/haptics").then(({ Haptics, NotificationType, ImpactStyle }) => {
                Haptics.notification({ type: NotificationType.Success });
                Haptics.impact({ style: ImpactStyle.Heavy });
            }).catch(() => { });

            // XP Logic
            const xpGain = 100;
            setXp(prev => prev + xpGain);
            const floatId = Math.random().toString(36).substring(7);
            setFloatingXp(prev => [...prev, { id: floatId, amount: xpGain }]);

            // Specialized Tactical Confetti
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FF8A00', '#FFD700', '#00D1FF'],
                shapes: ['square', 'circle'],
                ticks: 200
            });
        }
    }, [todos]);

    const confirmDeleteTodo = React.useCallback((id: string) => {
        setTodoToDelete(id);
    }, []);

    const executeDeleteTodo = React.useCallback(async (id: string) => {
        const updatedTodos = todos.filter(t => t.id !== id);
        updateTodosInStorage(updatedTodos);
        setTodos(updatedTodos);
        playDeleteSound();
        backupData(true); // Auto-backup
        setTodoToDelete(null); // Close dialog

        // Update Widget
        import("@/lib/widgetBridge").then(({ updateTodoWidget }) => {
            updateTodoWidget(updatedTodos);
        });

        // Sync with server
        try {
            const { apiRequest } = await import("@/lib/queryClient");
            await apiRequest("DELETE", `/api/tasks/${id}`);
        } catch (error) {
            console.error("Failed to delete task from server:", error);
        }
    }, [todos]);

    // Get todos for selected date and filter by category
    const todosForDate = todos.filter(todo => {
        const dateMatch = todo.date && isSameDay(parseISO(todo.date), selectedDate);
        const categoryMatch = activeCategory === "All" || todo.category === activeCategory;
        return dateMatch && categoryMatch;
    }).sort((a, b) => {
        if (!a.time || !b.time) return 0;
        return a.time.localeCompare(b.time);
    });

    // Generate week days
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const goToPreviousWeek = () => {
        setWeekStart(subWeeks(weekStart, 1));
    };

    const goToNextWeek = () => {
        setWeekStart(addWeeks(weekStart, 1));
    };

    return (
        <div className="min-h-dvh bg-background app-shell flex flex-col no-scrollbar hardware-accelerated">
            {/* Header - Theme Aware */}
            <div className="px-4 py-6 shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${tier.color} bg-white/5 px-2 py-0.5 rounded-full border border-white/5`}>
                                {tier.name}
                            </span>
                            <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(xp % 1000) / 10}%` }}
                                    className="h-full bg-gradient-to-r from-orange-500 to-yellow-500"
                                />
                            </div>
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-foreground">Field <span className="text-primary italic text-3xl">Ops</span></h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mt-1">
                            {format(selectedDate, "EEEE, MMMM do")}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex -space-x-2">
                            {[1, 2].map(i => (
                                <Avatar key={i} className="w-8 h-8 border-2 border-background ring-2 ring-primary/20">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">U{i}</AvatarFallback>
                                </Avatar>
                            ))}
                        </div>
                        <span className="text-[10px] font-black text-orange-500 tracking-tighter">{xp} XP</span>
                    </div>
                </div>

                {/* Floating XP Overlay */}
                <AnimatePresence>
                    {floatingXp.map(f => (
                        <motion.div
                            key={f.id}
                            initial={{ opacity: 0, scale: 0.5, y: 0 }}
                            animate={{ opacity: 1, scale: 1.5, y: -150 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            onAnimationComplete={() => setFloatingXp(prev => prev.filter(x => x.id !== f.id))}
                            className="fixed inset-x-0 top-1/2 flex justify-center pointer-events-none z-[100]"
                        >
                            <span className="text-4xl font-black italic text-orange-500 drop-shadow-[0_0_20px_rgba(255,138,0,0.5)]">
                                +{f.amount} XP
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Category Switcher */}
                <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                    {["All", "Study", "Work", "Personal", "Health", "Social"].map(cat => (
                        <button
                            key={cat}
                            onClick={() => {
                                setActiveCategory(cat);
                                try {
                                    import("@capacitor/haptics").then(({ Haptics, ImpactStyle }) => {
                                        Haptics.impact({ style: ImpactStyle.Light });
                                    });
                                } catch (e) { }
                            }}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${activeCategory === cat
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-foreground"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="glass-card p-2 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest pl-2">
                            {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d")}
                        </span>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={goToPreviousWeek} aria-label="Previous Week" className="h-6 w-6 rounded-full p-0 text-zinc-400 hover:bg-white/50 dark:hover:bg-white/10">
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={goToNextWeek} aria-label="Next Week" className="h-6 w-6 rounded-full p-0 text-zinc-400 hover:bg-white/50 dark:hover:bg-white/10">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {weekDays.map((day, index) => {
                            const isSelected = isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, new Date());
                            const hasTodos = todos.some(todo => todo.date && isSameDay(parseISO(todo.date), day));
                            return (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setSelectedDate(day);
                                        try {
                                            import("@capacitor/haptics").then(({ Haptics, ImpactStyle }) => {
                                                Haptics.impact({ style: ImpactStyle.Light });
                                            });
                                        } catch (e) { }
                                    }}
                                    className="relative flex flex-col items-center py-2 group"
                                >
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-gradient-to-b from-orange-500 to-amber-600 rounded-[14px] shadow-lg shadow-orange-500/20" />
                                    )}
                                    <span className={`relative text-[10px] font-medium mb-1 z-10 ${isSelected ? "text-white/80" : "text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"}`}>
                                        {format(day, "EEE")}
                                    </span>
                                    <div className={`relative z-10 w-8 h-8 flex items-center justify-center text-lg font-medium ${isSelected ? "text-white font-bold" : (isToday ? "text-orange-500" : "text-zinc-400 dark:text-zinc-300")}`}>
                                        {format(day, "d")}
                                    </div>
                                    {hasTodos && !isSelected && (
                                        <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Task Area */}
            <div className="flex-1 px-4 overflow-y-auto no-scrollbar pb-[12rem]">
                <div className="space-y-4">
                    {todosForDate.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 text-primary">
                                <CalendarIcon className="w-8 h-8" />
                            </div>
                            <p className="text-lg font-medium mb-1">No events scheduled</p>
                            <p className="text-sm text-muted-foreground italic">"Plan your day, rule your world"</p>
                        </div>
                    ) : (
                        <Virtuoso
                            style={{ height: '100%', minHeight: '400px' }}
                            useWindowScroll
                            data={todosForDate}
                            itemContent={(index: number, todo: Todo) => (
                                <div className="mb-4">
                                    <TimelineItem
                                        key={todo.id}
                                        todo={todo}
                                        onToggle={() => handleToggleTodo(todo.id)}
                                        onDelete={() => confirmDeleteTodo(todo.id)}
                                    />
                                </div>
                            )}
                        />
                    )}
                </div>
            </div>

            {/* Fluid Add Bar */}
            {isDrawerOpen ? (
                <>
                    <div onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-black/60 z-[120] h-dvh" />
                    <div className="fixed bottom-0 left-0 right-0 z-[130] bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-white/10 rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl max-h-[85vh]">
                        <div className="p-1">
                            <AddTodoDrawer
                                open={true}
                                onOpenChange={setIsDrawerOpen}
                                onAdd={handleAddTodo}
                                selectedDate={selectedDate}
                                embedded={true}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <div className="fixed bottom-[5.5rem] left-0 right-0 z-40 px-4 flex justify-center pointer-events-none mb-[env(safe-area-inset-bottom)]">
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="pointer-events-auto w-full max-w-md bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 h-14 rounded-full shadow-xl dark:shadow-2xl flex items-center justify-between px-6 group hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95"
                    >
                        <div className="font-medium text-lg text-foreground/60 dark:text-white/60 italic">Plan a new event...</div>
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg overflow-hidden relative">
                            <Plus className="w-5 h-5 absolute group-hover:rotate-90 group-hover:scale-110" />
                        </div>
                    </button>
                </div>
            )}

            {/* Bottom Nav High Index */}
            <div className="relative z-[100]">
                <BottomNav />
            </div>

            <Tutorial />

            <AlertDialog open={!!todoToDelete} onOpenChange={(open) => !open && setTodoToDelete(null)}>
                <AlertDialogContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-foreground dark:text-white rounded-2xl max-w-[85vw] sm:max-w-lg z-[200]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">Delete this Event?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-500 dark:text-zinc-400">
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => todoToDelete && executeDeleteTodo(todoToDelete)}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-xl border-0"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
