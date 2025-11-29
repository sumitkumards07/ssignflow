import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [showWelcome, setShowWelcome] = useState(false);

    const handleMockLogin = async () => {
        if (!name.trim() || !email.trim()) {
            toast({
                title: "Details required",
                description: "Please enter both your name and email to continue.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            // Simulate Google Login locally for standalone APK
            const mockGoogleUser = {
                id: "mock-user-" + Math.random().toString(36).substr(2, 9),
                googleId: "mock-google-id-" + Math.random().toString(36).substr(2, 9),
                email: email,
                displayName: name,
                photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                role: "user"
            };

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Store user info
            localStorage.setItem("user", JSON.stringify(mockGoogleUser));

            // Show Welcome Animation
            setShowWelcome(true);

            // Redirect after animation
            setTimeout(() => {
                setLocation("/todo");
            }, 2500);

        } catch (error) {
            console.error("Login error:", error);
            toast({
                title: "Error",
                description: "Failed to sign in. Please try again.",
                variant: "destructive",
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            <AnimatePresence>
                {showWelcome && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", damping: 12 }}
                            className="text-center space-y-4"
                        >
                            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">👋</span>
                            </div>
                            <h1 className="text-4xl font-bold text-primary">Welcome, {name}!</h1>
                            <p className="text-xl text-muted-foreground">Getting your workspace ready...</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Card className="w-full max-w-md border-border bg-card relative z-10">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <LogIn className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome to AssignFlow</CardTitle>
                    <CardDescription>Sign in to manage your tasks and quizzes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Name</label>
                            <Input
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-secondary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-secondary/50"
                            />
                        </div>
                    </div>

                    <Button
                        className="w-full h-11 text-base mt-2"
                        onClick={handleMockLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                        )}
                        Sign in with Google
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue as</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            // Mock Admin Login
                            const adminUser = {
                                googleId: "admin-id",
                                email: "admin@assignflow.com",
                                displayName: "Admin User",
                                role: "admin"
                            };
                            localStorage.setItem("user", JSON.stringify(adminUser));
                            setLocation("/admin");
                        }}
                    >
                        Admin (Demo)
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
