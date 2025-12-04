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
}

export function AddTodoDrawer({ open, onOpenChange, onAdd, selectedDate }: AddTodoDrawerProps) {
    const [text, setText] = useState("");
    const [time, setTime] = useState("08:00");
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
        onOpenChange(false);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-background border-t border-border text-foreground max-h-[85dvh]">
                <div className="mx-auto w-full max-w-lg px-4 sm:px-6">
                    <DrawerHeader>
                        <DrawerTitle>Add New Task</DrawerTitle>
                    </DrawerHeader>

                    <form onSubmit={handleSubmit} className="p-4 space-y-6">
                        <div className="space-y-2">
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

                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary">
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
                            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-lg font-medium">
                                Add Task
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="outline" className="w-full border-border hover:bg-secondary text-foreground">
                                    Cancel
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </form>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
