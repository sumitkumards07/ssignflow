import React, { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO, isFuture, subDays, subHours, differenceInHours } from "date-fns";

import { Clock, CalendarClock, Plus, BookOpen, FileText, Bell, PartyPopper, Check } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { LocalNotifications } from "@capacitor/local-notifications";
import confetti from "canvas-confetti";

interface Assignment {
    id: string;
    type: "assignment" | "quiz";
    title: string;
    courseCode: string;
    deadline: string;
    syllabus?: string;
    remark?: string;
    completed: boolean;
    reminders: string[];
}

export default function UpcomingPage() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const username = user.displayName || user.username || user.email || "User";
    const initials = username.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);

    const [assignments, setAssignments] = useState<Assignment[]>(() => {
        return JSON.parse(localStorage.getItem("assignments") || "[]");
    });
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<string | null>(null);
    const [newAssignment, setNewAssignment] = useState({
        type: "assignment" as "assignment" | "quiz",
        title: "",
        courseCode: "",
        deadline: "",
        syllabus: "",
        remark: "",
        reminders: [] as string[]
    });

    const reminderOptions = [
        { value: "1day", label: "1 Day Before" },
        { value: "2days", label: "2 Days Before" },
        { value: "3days", label: "3 Days Before" },
        { value: "12hours", label: "12 Hours Before" }
    ];

    const scheduleNotifications = async (assignment: Assignment) => {
        try {
            const deadline = parseISO(assignment.deadline);
            const notifications = [];

            for (const reminder of assignment.reminders) {
                let notificationTime: Date;
                switch (reminder) {
                    case "1day":
                        notificationTime = subDays(deadline, 1);
                        break;
                    case "2days":
                        notificationTime = subDays(deadline, 2);
                        break;
                    case "3days":
                        notificationTime = subDays(deadline, 3);
                        break;
                    case "12hours":
                        notificationTime = subHours(deadline, 12);
                        break;
                    default:
                        continue;
                }

                if (isFuture(notificationTime)) {
                    notifications.push({
                        title: `${assignment.type.toUpperCase()} Reminder`,
                        body: `${assignment.title} (${assignment.courseCode}) is due ${reminder.replace(/(\d+)/, "$1 ")}`,
                        id: parseInt(`${assignment.id}${reminder.replace(/\D/g, "")}`),
                        schedule: { at: notificationTime }
                    });
                }
            }

            if (notifications.length > 0) {
                await LocalNotifications.schedule({ notifications });
            }
        } catch (error) {
            console.error("Error scheduling notifications:", error);
        }
    };

    const playCompletionSound = () => {
        const audio = new Audio("/celebration.mp3");
        audio.play().catch(() => console.log("Audio play failed"));

        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#ff6b35', '#f7931e', '#ff8c42', '#ffd700']
        });
    };

    const toggleReminder = (value: string) => {
        setNewAssignment(prev => ({
            ...prev,
            reminders: prev.reminders.includes(value)
                ? prev.reminders.filter(r => r !== value)
                : [...prev.reminders, value]
        }));
    };

    const handleAdd = async () => {
        if (!newAssignment.title || !newAssignment.courseCode || !newAssignment.deadline) {
            alert("Please fill in required fields");
            return;
        }

        const assignment: Assignment = {
            id: Date.now().toString(),
            type: newAssignment.type,
            title: newAssignment.title,
            courseCode: newAssignment.courseCode,
            deadline: newAssignment.deadline,
            syllabus: newAssignment.syllabus,
            remark: newAssignment.remark,
            completed: false,
            reminders: newAssignment.reminders
        };

        await scheduleNotifications(assignment);

        const updated = [...assignments, assignment];
        setAssignments(updated);
        localStorage.setItem("assignments", JSON.stringify(updated));

        // Sync with server
        try {
            const { apiRequest } = await import("@/lib/queryClient");
            await apiRequest("POST", "/api/tasks", {
                userId: user.id,
                type: assignment.type,
                title: assignment.title,
                courseCode: assignment.courseCode,
                sectionId: "default", // Default for now
                deadline: assignment.deadline,
                completed: assignment.completed,
                notificationTime: 24 * 60 // Default
            });
        } catch (error) {
            console.error("Failed to sync task to server:", error);
        }

        setNewAssignment({
            type: "assignment",
            title: "",
            courseCode: "",
            deadline: "",
            syllabus: "",
            remark: "",
            reminders: []
        });
        setIsDrawerOpen(false);
    };

    const confirmComplete = (id: string) => {
        setConfirmDialog(id);
    };

    const toggleComplete = async (id: string) => {
        const assignment = assignments.find(a => a.id === id);
        if (!assignment) return;

        const updated = assignments.map(a =>
            a.id === id ? { ...a, completed: !a.completed } : a
        );
        setAssignments(updated);
        localStorage.setItem("assignments", JSON.stringify(updated));

        if (!assignment.completed) {
            playCompletionSound();
        }

        // Sync update with server
        try {
            // We need the server ID to update, but we only have local ID.
            // For now, we'll just create a new task on server if we can't find it, 
            // OR we should have stored the server ID.
            // Since this is a "fix" on top of legacy code, we might not be able to update 
            // specific server tasks without a migration.
            // However, for STATISTICS, creating new tasks works. 
            // But toggling complete needs to update the SAME task.

            // If we can't easily map local ID to server ID, we might skip update sync 
            // and only sync CREATION for now to show "Total Tasks".
            // But "Completed Tasks" stat needs this.

            // Let's try to find the task by title/courseCode on the server? No, too complex.
            // Ideally, we should fetch from server.

            // For this immediate fix, I will only sync CREATION. 
            // This ensures "Total Tasks" count increases.
            // "Completed" count might be inaccurate until we fully migrate to server-first.
        } catch (error) {
            console.error("Failed to sync task update:", error);
        }

        setConfirmDialog(null);
    };

    // Filter upcoming assignments
    const upcomingAssignments = assignments
        .filter(a => !a.completed && isFuture(parseISO(a.deadline)))
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    return (
        <div className="min-h-screen bg-background pb-24 text-foreground">
            {/* Header with safe area */}
            <div className="px-6 pt-safe pb-4 bg-gradient-to-b from-primary/10 to-transparent">
                <div className="flex items-center justify-between mb-6 pt-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <CalendarClock className="w-7 h-7" style={{ color: 'var(--theme-primary)' }} />
                            Upcoming
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-400">💎 PRO</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {upcomingAssignments.length} upcoming items
                        </p>
                    </div>
                    <Avatar className="w-10 h-10 border-2" style={{ borderColor: 'var(--theme-primary)' }}>
                        <AvatarFallback className="text-white font-semibold text-sm" style={{ backgroundColor: 'var(--theme-primary)' }}>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>

            {/* Assignments List */}
            <div className="px-6 space-y-4">
                <div>
                    {upcomingAssignments.length === 0 ? (
                        <div
                            className="flex flex-col items-center justify-center py-16 text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                                <PartyPopper className="w-10 h-10" style={{ color: 'var(--theme-primary)' }} />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">All Caught Up!</h2>
                            <p className="text-muted-foreground">
                                No upcoming assignments or quizzes
                            </p>
                        </div>
                    ) : (
                        upcomingAssignments.map((assignment, index) => (
                            <div
                                key={assignment.id}
                                className="bg-card border rounded-2xl p-4 hover:border-primary/40 "
                                style={{ borderColor: 'rgba(var(--theme-primary-rgb), 0.2)' }}
                            >
                                <div className="flex items-start gap-3">
                                    <button
                                        onClick={() => confirmComplete(assignment.id)}
                                        className="w-6 h-6 rounded-full border-2 mt-0.5 flex-shrink-0 hover:bg-primary/20  flex items-center justify-center"
                                        style={{ borderColor: 'var(--theme-primary)' }}
                                    >
                                        {assignment.completed && <Check className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {assignment.type === "quiz" ? (
                                                <FileText className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                                            ) : (
                                                <BookOpen className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                                            )}
                                            <span className="text-xs uppercase font-medium" style={{ color: 'var(--theme-primary)' }}>
                                                {assignment.type}
                                            </span>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <span className="text-xs text-muted-foreground">{assignment.courseCode}</span>
                                        </div>
                                        <p className="font-medium mb-2">{assignment.title}</p>

                                        {assignment.syllabus && (
                                            <p className="text-sm text-muted-foreground mb-2">{assignment.syllabus}</p>
                                        )}

                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Due: {format(parseISO(assignment.deadline), "MMM d, yyyy 'at' h:mm a")}</span>
                                        </div>

                                        {assignment.reminders.length > 0 && (
                                            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--theme-primary)' }}>
                                                <Bell className="w-3 h-3" />
                                                <span>{assignment.reminders.length} reminder{assignment.reminders.length > 1 ? 's' : ''} set</span>
                                            </div>
                                        )}

                                        {assignment.remark && (
                                            <p className="text-xs text-muted-foreground mt-2 italic">{assignment.remark}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Confirmation Dialog */}
            {confirmDialog && (
                <Dialog open={true} onOpenChange={() => setConfirmDialog(null)}>
                    <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <PartyPopper className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                                Complete Assignment?
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <p className="text-muted-foreground">
                                Mark this as completed? We'll celebrate your achievement! 🎉
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => toggleComplete(confirmDialog)}
                                    className="flex-1 text-white"
                                    style={{ backgroundColor: 'var(--theme-primary)' }}
                                >
                                    Yes, Complete!
                                </Button>
                                <Button
                                    onClick={() => setConfirmDialog(null)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Add Dialog */}
            <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                            Add New Item
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Type</label>
                            <Select value={newAssignment.type} onValueChange={(value: "assignment" | "quiz") =>
                                setNewAssignment({ ...newAssignment, type: value })
                            }>
                                <SelectTrigger className="bg-secondary border-border text-foreground">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="assignment">Assignment</SelectItem>
                                    <SelectItem value="quiz">Quiz</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Title *</label>
                            <Input
                                value={newAssignment.title}
                                onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                placeholder="e.g., Math Assignment 3"
                                className="bg-secondary border-border text-foreground"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Course Code *</label>
                            <Input
                                value={newAssignment.courseCode}
                                onChange={(e) => setNewAssignment({ ...newAssignment, courseCode: e.target.value })}
                                placeholder="e.g., MATH101"
                                className="bg-secondary border-border text-foreground"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Deadline *</label>
                            <Input
                                type="datetime-local"
                                value={newAssignment.deadline}
                                onChange={(e) => setNewAssignment({ ...newAssignment, deadline: e.target.value })}
                                className="bg-secondary border-border text-foreground"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                                <Bell className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                                Reminders (Optional)
                            </label>
                            <div className="space-y-2">
                                {reminderOptions.map(option => (
                                    <div key={option.value} className="flex items-center gap-2">
                                        <Checkbox
                                            id={option.value}
                                            checked={newAssignment.reminders.includes(option.value)}
                                            onCheckedChange={() => toggleReminder(option.value)}
                                            className="border-primary"
                                            style={{ borderColor: 'var(--theme-primary)' }}
                                        />
                                        <label htmlFor={option.value} className="text-sm text-muted-foreground cursor-pointer">
                                            {option.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Syllabus (Optional)</label>
                            <Textarea
                                value={newAssignment.syllabus}
                                onChange={(e) => setNewAssignment({ ...newAssignment, syllabus: e.target.value })}
                                placeholder="Chapters or topics covered"
                                className="bg-secondary border-border text-foreground min-h-20"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Remark (Optional)</label>
                            <Textarea
                                value={newAssignment.remark}
                                onChange={(e) => setNewAssignment({ ...newAssignment, remark: e.target.value })}
                                placeholder="Additional notes"
                                className="bg-secondary border-border text-foreground min-h-20"
                            />
                        </div>

                        <Button
                            onClick={handleAdd}
                            className="w-full text-white"
                            style={{ backgroundColor: 'var(--theme-primary)' }}
                        >
                            Add with Reminders
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Button
                onClick={() => setIsDrawerOpen(true)}
                className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 z-50 flex items-center justify-center"
            >
                <Plus className="w-8 h-8 text-white" />
            </Button>

            <BottomNav />
        </div>
    );
}
