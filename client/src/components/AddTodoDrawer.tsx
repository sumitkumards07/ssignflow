import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const [hasAlarm, setHasAlarm] = useState(false);
    const [category, setCategory] = useState<Todo['category']>('general');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        onAdd({
            text: text.trim(),
            completed: false,
            time,
            hasAlarm,
            category,
            date: format(selectedDate, 'yyyy-MM-dd'),
        });

        setText("");
        setHasAlarm(false);
        onOpenChange(false);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-background border-t border-border text-foreground">
                <div className="mx-auto w-full max-w-lg">
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

                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                                    <SelectTrigger className="bg-secondary border-border text-foreground">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="morning">Morning</SelectItem>
                                        <SelectItem value="work">Work</SelectItem>
                                        <SelectItem value="night">Night</SelectItem>
                                        <SelectItem value="general">General</SelectItem>
                                    </SelectContent>
                                </Select>
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

                        <DrawerFooter className="px-0">
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
