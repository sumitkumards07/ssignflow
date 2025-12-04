import React, { useEffect, useState } from "react";
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
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const { toast } = useToast();
    const [bgImage, setBgImage] = useState("");

    useEffect(() => {
        // Check if already logged in
        const checkAuth = async () => {
            const user = localStorage.getItem("user");
            if (user) {
                setLocation("/todo");
            }
        };
        checkAuth();

        // Set random background image
        const images = [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1519681393798-3828fb4090bb?auto=format&fit=crop&w=1920&q=80"
        ];
        setBgImage(images[Math.floor(Math.random() * images.length)]);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSuggestions([]);

        try {
            if (isRegistering) {
                const res = await apiRequest("POST", "/api/register", { username: email, password });
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
                const res = await apiRequest("POST", "/api/login", { username: email, password });
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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900"
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0" />

            <Card className="w-full max-w-md border-white/10 bg-black/30 backdrop-blur-xl shadow-2xl z-10 text-white">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30 transform rotate-3">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        AssignFlow
                    </CardTitle>
                    <CardDescription className="text-zinc-300 text-base">
                        Welcome back! Please sign in to continue.
                    </CardDescription>
                    <p className="text-xs text-zinc-500 mt-2">v1.0.2 (Build 19)</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-200">Username</Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="Enter username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                            />
                            {suggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-xs text-zinc-400 w-full">Suggestions:</span>
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => {
                                                setEmail(suggestion);
                                                setSuggestions([]);
                                            }}
                                            className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 px-2 py-1 rounded-full transition-colors border border-purple-500/30"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-200">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-purple-500/50 focus:ring-purple-500/20 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <Button
                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : null}
                            {isRegistering ? "Create Account" : "Sign In"}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-transparent px-2 text-zinc-400">
                                Or
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        className="w-full text-zinc-300 hover:text-white hover:bg-white/5"
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setSuggestions([]);
                        }}
                        disabled={isLoading}
                    >
                        {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Register"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

