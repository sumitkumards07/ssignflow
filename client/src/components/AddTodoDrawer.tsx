import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Todo } from '@/lib/types';
import { format } from 'date-fns';
import { Bell, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface AddTodoDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (todo: Omit<Todo, 'id' | 'createdAt'>) => void;
    selectedDate: Date;
    embedded?: boolean;
}

export function AddTodoDrawer({ open, onOpenChange, onAdd, selectedDate, embedded }: AddTodoDrawerProps) {
    const [text, setText] = useState("");
    const [time, setTime] = useState(() => format(new Date(), "HH:mm")); // Current time as default
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [hasAlarm, setHasAlarm] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        onAdd({
            text: text.trim(),
            completed: false,
            time,
            hasAlarm,
            category: "general",
            date: date,
        });

        setText("");
        setHasAlarm(false);
        setDate(format(new Date(), "yyyy-MM-dd"));
        // onOpenChange(false); // Let parent handle closing if embedded
    };

    // New "Embedded" Render for Fluid Transition
    if (embedded) {
        return (
            <div className="p-4 pt-6 text-foreground h-auto gpu-layer">
                <h2 className="text-xl font-semibold mb-6 px-2 tracking-tight">Add New Event</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Task Input */}
                    <Input
                        id="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Name of the event..."
                        className="bg-zinc-100 dark:bg-zinc-900/50 shadow-sm dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-zinc-200 dark:border-0 text-foreground dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-600 text-lg h-14 rounded-2xl focus-visible:ring-0 px-4"
                        autoFocus
                    />

                    {/* Flattened Grid: Date, Time, Alarm in single row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label htmlFor="date" className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
                                <CalendarIcon className="w-3 h-3" /> Date
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-0 text-foreground dark:text-white h-11 rounded-xl focus-visible:ring-0 text-sm"
                            />
                        </div>
                        <div>
                            <Label htmlFor="time" className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
                                <Clock className="w-3 h-3" /> Time
                            </Label>
                            <Input
                                id="time"
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-0 text-foreground dark:text-white h-11 rounded-xl focus-visible:ring-0 text-sm"
                            />
                        </div>
                        <div className="flex flex-col">
                            <Label className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
                                <Bell className="w-3 h-3" /> Alarm
                            </Label>
                            <div className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-0 rounded-xl h-11">
                                <Switch
                                    checked={hasAlarm}
                                    onCheckedChange={setHasAlarm}
                                    className="data-[state=checked]:bg-orange-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 pb-6 flex gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-foreground dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors border-0"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            onClick={() => {
                                // Haptic feedback on submit
                                import("@capacitor/haptics").then(({ Haptics, ImpactStyle }) => {
                                    Haptics.impact({ style: ImpactStyle.Medium });
                                }).catch(() => { });
                            }}
                            className="flex-[2] bg-gradient-to-r from-orange-500 to-orange-600 hover:to-orange-500 text-white h-14 rounded-2xl text-lg font-medium shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all border-0"
                        >
                            Add Event
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-background border-t border-border text-foreground max-h-[85dvh]">
                {/* ... existing drawer content ... */}
                <div className="mx-auto w-full max-w-lg px-4 sm:px-6">
                    <DrawerHeader>
                        <DrawerTitle>Add New Event</DrawerTitle>
                    </DrawerHeader>

                    <form onSubmit={handleSubmit} className="p-4 space-y-6">
                        <div
                            className="space-y-2"
                        >
                            <Label htmlFor="text">Task Name</Label>
                            <Input
                                id="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="What needs to be done?"
                                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                                autoFocus
                            />
                        </div>

                        <div
                            className="grid grid-cols-2 gap-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="date" className="flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4" /> Date
                                </Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="bg-secondary border-border text-foreground"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="time" className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Time
                                </Label>
                                <Input
                                    id="time"
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="bg-secondary border-border text-foreground"
                                />
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-4 rounded-xl bg-secondary"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-primary/20">
                                    <Bell className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">Set Alarm</p>
                                    <p className="text-xs text-muted-foreground">Remind me at {time}</p>
                                </div>
                            </div>
                            <Switch
                                checked={hasAlarm}
                                onCheckedChange={setHasAlarm}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        <DrawerFooter className="px-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                            <div
                                className="w-full space-y-2"
                            >
                                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-lg font-medium">
                                    Add Event
                                </Button>
                                <DrawerClose asChild>
                                    <Button variant="outline" className="w-full border-border hover:bg-secondary text-foreground">
                                        Cancel
                                    </Button>
                                </DrawerClose>
                            </div>
                        </DrawerFooter>
                    </form>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
