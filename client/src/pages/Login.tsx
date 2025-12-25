import React, { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";



export default function Login() {
    const [, setLocation] = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const { toast } = useToast();

    // Restore auto-login check
    React.useEffect(() => {
        const user = localStorage.getItem("user");
        if (user) {
            setLocation("/todo");
        }
    }, [setLocation]);

    // Simplified handlers to prevent issues
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSuggestions([]);

        try {
            if (isRegistering) {
                const res = await apiRequest("POST", "/api/register", { username, email: userEmail, password });
                if (!res.ok) {
                    const data = await res.json();
                    if (data.suggestions) {
                        setSuggestions(data.suggestions);
                        throw new Error(data.message || "Username taken");
                    }
                    throw new Error(data.message || "Registration failed");
                }
                const user = await res.json();
                localStorage.setItem("user", JSON.stringify(user));
                localStorage.removeItem("logged_out");
            } else {
                const res = await apiRequest("POST", "/api/login", { username, password });
                const user = await res.json();
                localStorage.setItem("user", JSON.stringify(user));
                localStorage.removeItem("logged_out");
            }

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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-950">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-zinc-950 to-zinc-950" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-orange-500/5 blur-[100px] rounded-full pointer-events-none" />

            <Card className="w-full max-w-md border-orange-500/20 bg-zinc-900/50 backdrop-blur-xl shadow-2xl z-10 text-white">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-24 h-24 bg-transparent flex items-center justify-center mb-4">
                        <img src="/logo.jpg" alt="AssignFlow Logo" className="w-full h-full object-contain" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-200">
                        AssignFlow
                    </CardTitle>
                    <CardDescription className="text-zinc-400 text-base">
                        Welcome back! Please sign in to continue.
                    </CardDescription>
                    <p className="text-xs text-zinc-600 mt-2">v1.0.6</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-zinc-300">Username</Label>
                            <input
                                id="username"
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                required
                                className="flex h-12 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            />
                            {suggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-xs text-zinc-500 w-full">Suggestions:</span>
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => {
                                                setUsername(suggestion);
                                                setSuggestions([]);
                                            }}
                                            className="text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full transition-colors border border-orange-500/20"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {isRegistering && (
                            <div className="space-y-2">
                                <Label htmlFor="userEmail" className="text-zinc-300">Email</Label>
                                <input
                                    id="userEmail"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={userEmail}
                                    onChange={(e) => setUserEmail(e.target.value)}
                                    disabled={isLoading}
                                    required={isRegistering}
                                    className="flex h-12 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-300">Password</Label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    className="flex h-12 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <Button
                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 border-0 shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.02]"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : null}
                            {isRegistering ? "Create Account" : "Sign In"}
                        </Button>
                    </form>

                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-zinc-400 hover:text-white hover:bg-white/5"
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setSuggestions([]);
                        }}
                        disabled={isLoading}
                    >
                    </Button>
                    <div className="absolute top-4 right-4 text-xs text-muted-foreground opacity-50">
                        v1.0.10
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

