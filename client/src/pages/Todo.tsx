import React, { useState, useEffect } from "react";
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

export default function TodoPage() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Get user info
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const username = user.displayName || user.username || user.email || "User";
    const initials = username.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);

    useEffect(() => {
        const syncTasks = async () => {
            try {
                // 1. Load from local storage first for immediate display
                const localTodos = getTodosFromStorage();
                setTodos(localTodos);

                // 2. Fetch from server to restore/sync
                const { apiRequest } = await import("@/lib/queryClient");
                const res = await apiRequest("GET", "/api/tasks");
                const serverTasks = await res.json();

                if (serverTasks && Array.isArray(serverTasks)) {
                    // Convert server tasks to local Todo format
                    const convertedTasks: Todo[] = serverTasks.map(t => ({
                        id: t.id,
                        text: t.title,
                        completed: t.completed,
                        date: t.deadline.split('T')[0],
                        time: t.deadline.split('T')[1]?.substring(0, 5) || "00:00",
                        category: t.courseCode,
                        createdAt: new Date(t.deadline).getTime(), // Approximated
                        hasAlarm: false // Server doesn't store this yet, default to false
                    }));

                    // 3. Update local storage with server data (Server is source of truth for restoration)
                    // We merge: if server has more tasks, we use server. 
                    // Simple strategy: If local is empty and server has data, use server.
                    // If both have data, we might want to merge by ID.

                    // For now, let's merge by ID, preferring server for status
                    const mergedMap = new Map<string, Todo>();
                    localTodos.forEach(t => mergedMap.set(t.id, t));
                    convertedTasks.forEach(t => mergedMap.set(t.id, t)); // Server overwrites local if ID matches

                    const mergedTodos = Array.from(mergedMap.values());

                    // If we restored data (server had data we didn't), update storage
                    if (mergedTodos.length > localTodos.length || JSON.stringify(mergedTodos) !== JSON.stringify(localTodos)) {
                        updateTodosInStorage(mergedTodos);
                        setTodos(mergedTodos);

                        // Update Widget
                        import("@/lib/widgetBridge").then(({ updateTodoWidget }) => {
                            updateTodoWidget(mergedTodos);
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to sync tasks from server:", error);
            }
        };

        syncTasks();
    }, []);

    // ... existing imports

    const handleAddTodo = async (todoData: Omit<Todo, 'id' | 'createdAt'>) => {
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
                // Optionally show a toast that permissions were denied
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
    };

    const handleToggleTodo = (id: string) => {
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

        if (updatedTodo.completed) {
            playSuccessSound();
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 }
            });
        }
    };

    const handleDeleteTodo = async (id: string) => {
        const updatedTodos = todos.filter(t => t.id !== id);
        updateTodosInStorage(updatedTodos);
        setTodos(updatedTodos);
        playDeleteSound();
        backupData(true); // Auto-backup

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
    };

    // Get todos for selected date
    const todosForDate = todos.filter(todo =>
        todo.date && isSameDay(parseISO(todo.date), selectedDate)
    ).sort((a, b) => {
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
        <div className="min-h-screen bg-background">
            {/* Header with User Profile */}
            <div className="relative px-6 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {format(selectedDate, "MMMM")}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => window.location.href = "/upcoming"}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all rounded-full px-4 h-9"
                        >
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Assignments
                        </Button>
                        <Avatar className="w-10 h-10 border-2" style={{ borderColor: 'var(--theme-primary)' }}>
                            <AvatarFallback className="text-white font-semibold text-sm" style={{ backgroundColor: 'var(--theme-primary)' }}>
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </div>

            {/* Week Navigator */}
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousWeek}
                    className="h-8 w-8 rounded-full"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-sm text-muted-foreground font-medium">
                    {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextWeek}
                    className="h-8 w-8 rounded-full"
                >
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            {/* Calendar Week Strip */}
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const hasTodos = todos.some(todo => todo.date && isSameDay(parseISO(todo.date), day));

                    return (
                        <button
                            key={index}
                            onClick={() => setSelectedDate(day)}
                            className="flex flex-col items-center py-3 rounded-xl transition-all relative"
                        >
                            <span className="text-xs text-muted-foreground font-medium mb-1">
                                {format(day, "EEE")}
                            </span>
                            <div
                                className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-semibold transition-all ${isSelected
                                    ? "text-white scale-110 shadow-lg"
                                    : isToday
                                        ? "bg-secondary text-foreground"
                                        : "hover:bg-secondary"
                                    }`}
                                style={isSelected ? { backgroundColor: 'var(--theme-primary)' } : (isToday ? { color: 'var(--theme-primary)' } : {})}
                            >
                                {format(day, "d")}
                            </div>
                            {hasTodos && !isSelected && (
                                <div className="w-1 h-1 rounded-full mt-1" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
                            )}
                        </button>
                    );
                })}
            </div>


            {/* Tasks Section */}
            <div className="px-6 pb-24">
                <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 min-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">
                            {format(selectedDate, "EEEE, MMMM d")}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {todosForDate.length} {todosForDate.length === 1 ? "task" : "tasks"}
                        </span>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {todosForDate.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16 text-center"
                            >
                                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                                    <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p className="text-lg font-medium mb-1">No tasks for this day</p>
                                <p className="text-sm text-muted-foreground">
                                    Tap the + button to add a new task
                                </p>
                            </motion.div>
                        ) : (
                            <div className="space-y-3">
                                {todosForDate.map((todo) => (
                                    <TimelineItem
                                        key={todo.id}
                                        todo={todo}
                                        onToggle={() => handleToggleTodo(todo.id)}
                                        onDelete={() => handleDeleteTodo(todo.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <AddTodoDrawer
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                onAdd={handleAddTodo}
                selectedDate={selectedDate}
            />

            <Button
                onClick={() => setIsDrawerOpen(true)}
                className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 z-50 flex items-center justify-center"
            >
                <Plus className="w-8 h-8 text-primary-foreground" />
            </Button>

            <BottomNav />
            <Tutorial />
        </div >
    );
}
