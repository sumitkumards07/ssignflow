import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { CalendarStrip } from "@/components/CalendarStrip";
import { TimelineItem } from "@/components/TimelineItem";
import { AddTodoDrawer } from "@/components/AddTodoDrawer";
import { Todo } from "@/lib/types";
import { getTodosFromStorage, saveTodoToStorage, updateTodosInStorage } from "@/lib/utils";
import { playSuccessSound, playDeleteSound } from "@/lib/sounds";
import { scheduleNotification } from "@/lib/notifications";
import { format, isSameDay, parseISO } from "date-fns";
import confetti from "canvas-confetti";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function TodoPage() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        setTodos(getTodosFromStorage());
    }, []);

    const handleAddTodo = (todoData: Omit<Todo, 'id' | 'createdAt'>) => {
        const newTodo: Todo = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            ...todoData
        };

        saveTodoToStorage(newTodo);
        setTodos(prev => [...prev, newTodo]);
        playSuccessSound();

        if (newTodo.hasAlarm && newTodo.time && newTodo.date) {
            // Parse date and time to create a Date object
            const [hours, minutes] = newTodo.time.split(':').map(Number);
            const scheduleDate = parseISO(newTodo.date);
            scheduleDate.setHours(hours, minutes, 0, 0);

            // Use a numeric ID for notifications (hash the string ID)
            const notificationId = Math.abs(newTodo.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));

            scheduleNotification(
                notificationId,
                "Task Reminder",
                newTodo.text,
                scheduleDate
            );
        }
    };

    const handleToggle = (id: string) => {
        const updatedTodos = todos.map(todo => {
            if (todo.id === id) {
                const newCompleted = !todo.completed;
                if (newCompleted) {
                    playSuccessSound();
                    confetti({
                        particleCount: 40,
                        spread: 50,
                        origin: { y: 0.7 },
                        colors: ['#FF8FA3', '#8AB4F8']
                    });
                }
                return { ...todo, completed: newCompleted };
            }
            return todo;
        });

        setTodos(updatedTodos);
        updateTodosInStorage(updatedTodos);
    };

    const filteredTodos = todos.filter(todo => {
        if (!todo.date) return false; // Or handle legacy todos
        return isSameDay(parseISO(todo.date), selectedDate);
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-hidden flex flex-col">
            {/* Header */}
            <header className="pt-safe px-6 pb-4 flex items-center justify-between bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold">{format(selectedDate, 'MMMM yyyy')}</h1>
                    <p className="text-muted-foreground text-sm">Keep up the good work!</p>
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="p-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors">
                                <CalendarIcon className="w-6 h-6 text-primary" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border text-foreground" align="end">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                initialFocus
                                className="p-3 pointer-events-auto"
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </header>

            {/* Calendar Strip */}
            <CalendarStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

            {/* Timeline */}
            <main className="flex-1 overflow-y-auto px-6 pt-4 pb-32 relative">
                <div className="absolute left-[3.25rem] top-0 bottom-0 w-0.5 bg-border" />

                <AnimatePresence mode="popLayout">
                    {filteredTodos.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-center opacity-50 pl-12"
                        >
                            <p className="text-lg font-medium">No tasks for today</p>
                            <p className="text-sm text-muted-foreground">Enjoy your free time!</p>
                        </motion.div>
                    ) : (
                        filteredTodos.map((todo, index) => (
                            <TimelineItem
                                key={todo.id}
                                todo={todo}
                                isLast={index === filteredTodos.length - 1}
                                onToggle={handleToggle}
                            />
                        ))
                    )}
                </AnimatePresence>
            </main>

            <AddTodoDrawer
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                onAdd={handleAddTodo}
                selectedDate={selectedDate}
            />

            <BottomNav onAddClick={() => setIsDrawerOpen(true)} />
        </div>
    );
}
