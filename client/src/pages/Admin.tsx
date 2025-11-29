import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, CheckSquare, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
    id: string;
    username: string;
    email: string;
    displayName: string;
    role: string;
}

interface Stats {
    totalUsers: number;
    totalTasks: number;
    users: User[];
}

export default function AdminDashboard() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = () => {
            const userStr = localStorage.getItem("user");
            if (!userStr) {
                setLocation("/login");
                return false;
            }
            const user = JSON.parse(userStr);
            if (user.role !== "admin") {
                toast({
                    title: "Access Denied",
                    description: "You do not have permission to view this page.",
                    variant: "destructive",
                });
                setLocation("/");
                return false;
            }
            return true;
        };

        if (checkAuth()) {
            fetchStats();
        }
    }, []);

    const fetchStats = async () => {
        try {
            // Simulate fetching stats locally for standalone APK
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data for demonstration
            const mockStats: Stats = {
                totalUsers: 12,
                totalTasks: 45,
                users: [
                    { id: "1", username: "john.doe", email: "john.doe@gmail.com", displayName: "John Doe", role: "user" },
                    { id: "2", username: "jane.smith", email: "jane.smith@gmail.com", displayName: "Jane Smith", role: "user" },
                    { id: "3", username: "admin", email: "admin@assignflow.com", displayName: "Admin User", role: "admin" },
                    { id: "4", username: "alice.w", email: "alice.w@gmail.com", displayName: "Alice Williams", role: "user" },
                    { id: "5", username: "bob.b", email: "bob.b@gmail.com", displayName: "Bob Brown", role: "user" },
                ]
            };

            setStats(mockStats);
        } catch (error) {
            console.error("Stats error:", error);
            toast({
                title: "Error",
                description: "Failed to load admin stats.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        setLocation("/login");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User List</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats?.users.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-4 border rounded-lg bg-card/50"
                            >
                                <div>
                                    <p className="font-medium">{user.displayName || user.username}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin'
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-secondary text-secondary-foreground'
                                        }`}>
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {stats?.users.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">No users found.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
