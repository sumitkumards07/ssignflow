import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, ChevronLeft, Shield, User, Clock } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface User {
    id: string;
    username: string;
    email: string;
    displayName: string;
    role: string;
    lastActive?: string;
    taskCount?: number;
    completedTaskCount?: number;
}

export default function AdminDashboard() {
    const { data: users, isLoading, error } = useQuery<User[]>({
        queryKey: ["/api/admin/users"],
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h2 className="text-xl font-bold text-destructive mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-4">You do not have permission to view this page.</p>
                <Link href="/settings">
                    <a className="text-primary hover:underline">Return to Settings</a>
                </Link>
            </div>
        );
    }

    const totalTasks = users?.reduce((acc, user) => acc + (user.taskCount || 0), 0) || 0;
    const totalCompleted = users?.reduce((acc, user) => acc + (user.completedTaskCount || 0), 0) || 0;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="px-6 pt-safe pb-4 bg-background sticky top-0 z-10 border-b border-border">
                <div className="flex items-center gap-4 pt-4">
                    <Link href="/settings">
                        <a className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </a>
                    </Link>
                    <h1 className="text-xl font-bold">Admin Dashboard</h1>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold" style={{ color: 'var(--theme-primary)' }}>
                                {users?.length || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold" style={{ color: 'var(--theme-primary)' }}>
                                {totalTasks}
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                    ({totalCompleted} done)
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <h2 className="text-lg font-semibold">User Activity</h2>
                <div className="space-y-4">
                    {users?.map((user) => (
                        <div
                            key={user.id}
                            className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
                        >
                            <Avatar className="h-10 w-10 border border-border">
                                <AvatarFallback className="bg-secondary text-secondary-foreground">
                                    {user.displayName?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium truncate">{user.displayName || user.username}</h3>
                                    {user.role === "admin" && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            Admin
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                            {user.lastActive
                                                ? format(new Date(user.lastActive), "MMM d, h:mm a")
                                                : "Never"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">{user.taskCount || 0}</span> tasks
                                        <span className="text-muted-foreground/50">|</span>
                                        <span className="font-medium text-green-600">{user.completedTaskCount || 0}</span> done
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
