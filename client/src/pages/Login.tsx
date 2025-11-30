import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const IS_MOBILE = Capacitor.isNativePlatform();

export default function Login() {
    const [, setLocation] = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Check if already logged in
        const checkAuth = async () => {
            const user = localStorage.getItem("user");
            if (user) {
                setLocation("/todo");
            }
        };
        checkAuth();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isRegistering) {
                await apiRequest("POST", "/api/register", { username: email, password });
            } else {
                await apiRequest("POST", "/api/login", { username: email, password });
            }

            // Fetch user data to confirm login and get details
            const res = await apiRequest("GET", "/api/auth/me");
            const user = await res.json();

            localStorage.setItem("user", JSON.stringify(user));
            setLocation("/todo");
        } catch (error) {
            console.error("Login error:", error);
            toast({
                title: isRegistering ? "Registration Failed" : "Login Failed",
                description: error instanceof Error ? error.message : "Could not sign in. Please try again.",
                variant: "destructive",
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border-border bg-card">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <LogIn className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome to AssignFlow</CardTitle>
                    <CardDescription>
                        {isRegistering ? "Create an account to continue" : "Sign in to continue"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Username</Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="Enter username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <Button className="w-full h-11 text-base" type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : null}
                            {isRegistering ? "Create Account" : "Sign In"}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsRegistering(!isRegistering)}
                        disabled={isLoading}
                    >
                        {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Register"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

