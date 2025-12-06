import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
    Users,
    ListTodo,
    Bell,
    Upload,
    LogOut,
    Shield,
    Search,
    Trash2,
    CheckCircle,
    XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("users");
    const [users, setUsers] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ title: "", body: "" });
    const [update, setUpdate] = useState({ versionCode: "", versionName: "", apkUrl: "", releaseNotes: "" });
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === "users") {
                const res = await apiRequest("GET", "/api/admin/users");
                const data = await res.json();
                setUsers(data);
            } else if (activeTab === "tasks") {
                const res = await apiRequest("GET", "/api/admin/tasks");
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: "Failed to fetch data",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendNotification = async () => {
        try {
            const res = await apiRequest("POST", "/api/admin/notifications", notification);
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to send notification");
            }
            toast({ title: "Success", description: "Notification sent successfully" });
            setNotification({ title: "", body: "" });
        } catch (error: any) {
            console.error("Notification error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to send notification",
                variant: "destructive"
            });
        }
    };

    const handlePushUpdate = async () => {
        try {
            const res = await apiRequest("POST", "/api/admin/updates", update);
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to push update");
            }
            toast({ title: "Success", description: "Update pushed successfully" });
            setUpdate({ versionCode: "", versionName: "", apkUrl: "", releaseNotes: "" });
        } catch (error: any) {
            console.error("Update error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to push update",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border pt-safe">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        <h1 className="text-xl font-bold">Admin Panel</h1>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/settings")}>
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            <main className="p-4 space-y-6">
                {/* Users Tab */}
                {activeTab === "users" && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">User Management</h2>
                        <div className="grid gap-4">
                            {users.map((user) => (
                                <Card key={user.id}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Avatar>
                                                <AvatarImage src={user.avatar} />
                                                <AvatarFallback>{user.username[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.displayName || user.username}</p>
                                                <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] bg-secondary px-2 py-0.5 rounded">
                                                        {user.role}
                                                    </span>
                                                    <span className="text-[10px] bg-secondary px-2 py-0.5 rounded font-mono">
                                                        Pass: {user.password.substring(0, 8)}...
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold">{user.taskCount || 0}</p>
                                            <p className="text-xs text-muted-foreground">Tasks</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tasks Tab */}
                {activeTab === "tasks" && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Task Oversight</h2>
                        <div className="grid gap-4">
                            {tasks.map((task) => (
                                <Card key={task.id}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-medium">{task.title}</h3>
                                            {task.completed ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-muted" />
                                            )}
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>User ID: {task.userId}</span>
                                            <span>{new Date(task.deadline).toLocaleDateString()}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Push Notifications</h2>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Send Broadcast</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Title</label>
                                    <Input
                                        value={notification.title}
                                        onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                                        placeholder="Notification Title"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Message</label>
                                    <Textarea
                                        value={notification.body}
                                        onChange={(e) => setNotification({ ...notification, body: e.target.value })}
                                        placeholder="Notification Body"
                                    />
                                </div>
                                <Button onClick={handleSendNotification} className="w-full">
                                    <Bell className="w-4 h-4 mr-2" />
                                    Send to All Users
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Updates Tab */}
                {activeTab === "updates" && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Update Management</h2>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Push New Update</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Version Code</label>
                                        <Input
                                            type="number"
                                            value={update.versionCode}
                                            onChange={(e) => setUpdate({ ...update, versionCode: e.target.value })}
                                            placeholder="e.g. 10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Version Name</label>
                                        <Input
                                            value={update.versionName}
                                            onChange={(e) => setUpdate({ ...update, versionName: e.target.value })}
                                            placeholder="e.g. 1.0.2"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">APK Download URL</label>
                                    <Input
                                        value={update.apkUrl}
                                        onChange={(e) => setUpdate({ ...update, apkUrl: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Release Notes</label>
                                    <Textarea
                                        value={update.releaseNotes}
                                        onChange={(e) => setUpdate({ ...update, releaseNotes: e.target.value })}
                                        placeholder="What's new?"
                                    />
                                </div>
                                <Button onClick={handlePushUpdate} className="w-full">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Push Update
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border pb-safe">
                <div className="flex justify-around items-center h-16">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`flex flex-col items-center gap-1 p-2 ${activeTab === "users" ? "text-primary" : "text-muted-foreground"}`}
                    >
                        <Users className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Users</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("tasks")}
                        className={`flex flex-col items-center gap-1 p-2 ${activeTab === "tasks" ? "text-primary" : "text-muted-foreground"}`}
                    >
                        <ListTodo className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Tasks</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("notifications")}
                        className={`flex flex-col items-center gap-1 p-2 ${activeTab === "notifications" ? "text-primary" : "text-muted-foreground"}`}
                    >
                        <Bell className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Notify</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("updates")}
                        className={`flex flex-col items-center gap-1 p-2 ${activeTab === "updates" ? "text-primary" : "text-muted-foreground"}`}
                    >
                        <Upload className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Update</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
