import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function MeshBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, -30, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_50%)]"
            />
            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    x: [0, -50, 0],
                    y: [0, 30, 0],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-20%] right-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.15),transparent_50%)]"
            />
        </div>
    );
}
import { Upload, FileText, Image as ImageIcon, Youtube, BookOpen, Clock, Check, Loader2, ArrowRight, Plus, BrainCircuit, MessageSquare, ChevronLeft, Mic, Send, Download, Sparkles, Calendar, X, MoreHorizontal, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, safeParseJson, getApiBaseUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QuizInterface } from "@/components/QuizInterface";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import jsPDF from "jspdf";
import { useUser } from "@/hooks/use-user";
import { ProUpgradeModal } from "./ProUpgradeModal";

declare global {
    interface Window {
        Capacitor?: any;
    }
}

interface Message {
    id: string;
    role: "user" | "ai";
    content: string;
    timestamp: number;
}

interface FeatureChatMessage {
    role: "user" | "ai";
    content: string;
}

// Reusable chat component for feature tabs
function FeatureChat({ featureId, context }: { featureId: string; context?: string }) {
    const [messages, setMessages] = useState<FeatureChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Load chat history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`ai_chat_${featureId}`);
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load chat history:", e);
            }
        }
    }, [featureId]);

    // Save chat history to localStorage
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(`ai_chat_${featureId}`, JSON.stringify(messages));
        }
    }, [messages, featureId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: FeatureChatMessage = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Build context-aware prompt
            const prompt = context
                ? `Context: ${context}\n\nUser question: ${input}\n\nProvide a helpful response based on the context above.`
                : input;

            const res = await apiRequest("POST", "/api/ai/generate", { prompt });
            const data = await safeParseJson(res);

            const aiMessage: FeatureChatMessage = { role: "ai", content: data.text };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to get response",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
        localStorage.removeItem(`ai_chat_${featureId}`);
    };

    // Inline chat card that scrolls with page
    return (
        <div className="mt-3 sm:mt-4 mb-16 sm:mb-20 mx-auto max-w-md px-2 sm:px-0">
            <div className="bg-card border border-border rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
                {/* Header */}
                <div
                    className="flex items-center justify-between p-2.5 sm:p-3 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10 cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                        <span className="font-semibold text-xs sm:text-sm">AI Assistant</span>
                        {messages.length > 0 && (
                            <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {messages.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {messages.length > 0 && isOpen && (
                            <button onClick={(e) => { e.stopPropagation(); clearChat(); }} className="p-1 sm:p-1.5 hover:bg-secondary rounded-lg text-muted-foreground text-[10px] sm:text-xs">
                                Clear
                            </button>
                        )}
                        <ChevronLeft className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${isOpen ? '-rotate-90' : 'rotate-0'}`} />
                    </div>
                </div>

                {/* Collapsible Content */}
                {isOpen && (
                    <>
                        {/* Messages */}
                        <div ref={scrollRef} className="p-2.5 sm:p-3 space-y-2.5 sm:space-y-3 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
                            {messages.length === 0 ? (
                                <div className="text-center text-muted-foreground text-xs sm:text-sm py-4">
                                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 opacity-50" />
                                    <p className="text-[10px] sm:text-xs">Ask follow-up questions about this result</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[90%] sm:max-w-[85%] rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                                            : 'bg-secondary text-foreground'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isLoading && (
                                <div className="flex justify-start w-full">
                                    <div className="bg-secondary/50 rounded-lg sm:rounded-xl px-3 py-3 space-y-2 min-w-[120px] max-w-[85%]">
                                        <div className="h-2.5 bg-foreground/10 rounded-full w-3/4" />
                                        <div className="h-2.5 bg-foreground/10 rounded-full w-1/2" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-2.5 sm:p-3 border-t border-border">
                            <div className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder="Ask a follow-up..."
                                    className="flex-1 h-8 sm:h-9 text-xs sm:text-sm rounded-full bg-secondary border-transparent"
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"
                                >
                                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export function StudyAssistant() {
    const { toast } = useToast();
    const [activeFeature, setActiveFeature] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const { user } = useUser();
    const [showProModal, setShowProModal] = useState(false);

    // Lock logic
    const isFeatureLocked = (id: string) => {
        if (!user?.isPro && (id === 'solver' || id === 'quiz' || id === 'attendance')) return true;
        return false;
    };

    const features = [
        { id: "solver", label: "Solve Problem", icon: ImageIcon, color: "text-purple-500", bg: "bg-purple-500/10" },
        { id: "attendance", label: "Attendance Calc", icon: Check, color: "text-teal-500", bg: "bg-teal-500/10" },
        { id: "quiz", label: "Take Quiz", icon: BrainCircuit, color: "text-green-500", bg: "bg-green-500/10" },
        { id: "timetable", label: "Plan Schedule", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
        { id: "courses", label: "Find Courses", icon: Youtube, color: "text-red-500", bg: "bg-red-500/10" },
    ];

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;
        const userMsg: Message = { id: Date.now().toString(), role: "user", content: inputValue, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);

        try {
            const res = await apiRequest("POST", "/api/ai/generate", { prompt: userMsg.content });
            const data = await safeParseJson(res);
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "ai", content: data.text, timestamp: Date.now() };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Chat error:", error);
            toast({ title: "Error", description: "Failed to get response.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const downloadPDF = async (content: string, filename: string = "study-assistant-response.pdf") => {
        const doc = new jsPDF();
        const splitText = doc.splitTextToSize(content, 180);
        doc.text(splitText, 10, 10);
        const isMobile = window.Capacitor?.isNativePlatform();

        if (isMobile) {
            try {
                const { Filesystem, Directory } = await import("@capacitor/filesystem");
                const { Share } = await import("@capacitor/share");
                const base64Data = doc.output('datauristring').split(',')[1];
                const savedFile = await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Documents, recursive: true });
                await Share.share({ title: 'PDF', url: savedFile.uri });
            } catch (e) { toast({ title: "Error", description: "Failed to save PDF", variant: "destructive" }); }
        } else {
            doc.save(filename);
            toast({ title: "Downloaded", description: "Response saved as PDF." });
        }
    };

    const onFeatureClick = (id: string) => {
        if (isFeatureLocked(id)) { setShowProModal(true); return; }
        setActiveFeature(id);
    };

    // --- Persistence Logic ---
    useEffect(() => {
        // Load messages if saved < 5 mins ago
        const saved = localStorage.getItem("ai_chat_main");
        const timestamp = localStorage.getItem("ai_chat_main_ts");
        if (saved && timestamp) {
            const age = Date.now() - parseInt(timestamp, 10);
            if (age < 5 * 60 * 1000) { // 5 minutes
                try {
                    setMessages(JSON.parse(saved));
                } catch (e) { console.error(e); }
            } else {
                // Expired
                localStorage.removeItem("ai_chat_main");
                localStorage.removeItem("ai_chat_main_ts");
            }
        }
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem("ai_chat_main", JSON.stringify(messages));
            localStorage.setItem("ai_chat_main_ts", Date.now().toString());
        }
    }, [messages]);

    return (
        <div className="h-dvh flex flex-col bg-background text-foreground relative md:max-w-4xl md:mx-auto md:border-x md:border-border shadow-sm overflow-hidden">
            <ProUpgradeModal open={showProModal} onOpenChange={setShowProModal} />

            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-2 bg-background z-10 shrink-0 border-b border-border`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {activeFeature && (
                        <Button variant="ghost" size="icon" onClick={() => setActiveFeature(null)} className="-ml-2 shrink-0 rounded-full">
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                    )}

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <BrainCircuit className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-lg tracking-tight">Flow AI</span>
                    </div>

                    {activeFeature && (
                        <span className="font-semibold text-lg truncate animate-in fade-in slide-in-from-left-2 ml-2">
                            / {features.find(f => f.id === activeFeature)?.label}
                        </span>
                    )}
                </div>

                <div className="flex gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-muted-foreground hover:bg-secondary"
                        onClick={() => { setMessages([]); localStorage.removeItem("ai_chat_main"); }}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Main Content Area - ZERO SCROLL (Empty state until chat) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 scroll-smooth pb-[180px]" ref={scrollRef}>
                {activeFeature ? (
                    <div className="h-full">
                        {/* Inject Tabs here */}
                        {activeFeature === "solver" && <SolverTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                        {activeFeature === "quiz" && <QuizInterface />}
                        {activeFeature === "timetable" && <TimetableTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                        {activeFeature === "courses" && <CoursesTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                        {activeFeature === "attendance" && <AttendanceTab />}
                        {activeFeature === "chat" && (
                            <div className="space-y-6">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center pt-20 text-center space-y-4">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center backdrop-blur-3xl shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                                            <Sparkles className="w-10 h-10 text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-medium text-white/90">How can I help you learn?</h3>
                                    </div>
                                )}
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                            : 'bg-secondary border border-border text-secondary-foreground rounded-tl-sm'
                                            }`}>
                                            <div className="prose prose-invert text-sm leading-normal">
                                                {msg.content}
                                            </div>
                                            {/* Parsing PDF download link for AI responses */}
                                            {msg.role === 'ai' && msg.content.includes("Download PDF") && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => downloadPDF(msg.content)}
                                                    className="mt-3 gap-2 border-primary/20 hover:bg-primary/10"
                                                >
                                                    <Download className="w-4 h-4" /> Save as PDF
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-secondary/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl rounded-tl-sm flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" />
                                            <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce delay-75" />
                                            <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce delay-150" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    // MESH GRADIENT & ZERO SCROLL INITIAL STATE
                    <div className="h-full flex flex-col justify-end pb-32 relative overflow-hidden">
                        <MeshBackground />

                        <div className="px-6 space-y-6 relative z-10">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2"
                            >
                                <h2 className="text-4xl font-black tracking-tighter text-white">
                                    Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Flow?</span>
                                </h2>
                                <p className="text-zinc-400 text-sm font-medium">I can help you solve problems, plan schedules, or explain complex concepts.</p>
                            </motion.div>

                            {/* Staggered Suggestion Chips */}
                            {!inputValue && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-4"
                                >
                                    <h3 className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] ml-1">Quick Actions</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: "solver", label: "Solve Problem", icon: ImageIcon, color: "text-purple-400", bg: "bg-purple-500/10" },
                                            { id: "quiz", label: "Take Quiz", icon: BrainCircuit, color: "text-green-400", bg: "bg-green-500/10" },
                                            { id: "attendance", label: "Attendance", icon: Calculator, color: "text-teal-400", bg: "bg-teal-500/10" },
                                            { id: "timetable", label: "Study Plan", icon: Clock, color: "text-orange-400", bg: "bg-orange-500/10" },
                                            { id: "explain", label: "Explain Concept", icon: Sparkles, color: "text-blue-400", bg: "bg-blue-500/10" },
                                        ].map((chip, i) => (
                                            <motion.button
                                                key={chip.id}
                                                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                onClick={() => onFeatureClick(chip.id)}
                                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 backdrop-blur-xl transition-all active:scale-95`}
                                            >
                                                <chip.icon className={`w-4 h-4 ${chip.color}`} />
                                                <span className="text-sm font-bold text-zinc-200">{chip.label}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Pinned Bottom Input Area */}
            <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom)+70px)] pt-2 bg-gradient-to-t from-background via-background/95 to-transparent relative z-30">
                <AnimatePresence>
                    {inputValue && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex gap-2 mb-3 overflow-x-auto no-scrollbar"
                        >
                            {["Summarize this", "Explain like I'm 5", "Create examples"].map((action) => (
                                <button
                                    key={action}
                                    onClick={() => setInputValue(action)}
                                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary transition-colors"
                                >
                                    {action}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-20 transition-opacity duration-500" />
                    <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[1.8rem] p-1.5 shadow-xl dark:shadow-2xl flex items-center ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
                        {!activeFeature && (
                            <div className="pl-2 pr-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400"
                                >
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </div>
                        )}
                        <div className="flex-1 px-2 py-2">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={activeFeature ? "Ask follow up..." : "Ask Flow AI anything..."}
                                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-[15px] font-medium placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 resize-none h-6 flex items-center"
                                style={{ minHeight: '24px' }}
                            />
                        </div>
                        <Button
                            size="icon"
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            className={`h-10 w-10 shrink-0 rounded-full transition-all duration-300 ${inputValue.trim() ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 rotate-0' : 'bg-transparent text-zinc-500 -rotate-90'}`}
                        >
                            {inputValue.trim() ? <ArrowRight className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SolverTab({ isLoading, setIsLoading, toast }: any) {
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [solution, setSolution] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
            setSolution("");
            toast({
                title: "File Uploaded",
                description: "Thank you for uploading! Click 'Solve with AI' to proceed.",
            });
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", image);

            const res = await fetch(`${getApiBaseUrl()}/api/ai/analyze-image`, {
                method: "POST",
                body: formData,
            });

            const data = await safeParseJson(res);
            if (!res.ok) throw new Error(data.message || "Failed to analyze image");
            setSolution(data.text);
        } catch (error) {
            console.error("Analysis error:", error);
            toast({
                title: "Analysis Failed",
                description: "Could not analyze image. Please try again or check your internet.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollArea className="h-full p-4">
            <div className="space-y-6 max-w-md mx-auto">
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle>AI Problem Solver</CardTitle>
                        <CardDescription>Upload a photo of a math problem or question</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                            {preview ? (
                                <img src={preview} alt="Preview" className="max-h-64 rounded-lg object-contain" />
                            ) : (
                                <>
                                    <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Click to upload image</p>
                                </>
                            )}
                        </div>

                        {image && (
                            <Button
                                onClick={handleAnalyze}
                                disabled={isLoading}
                                className="w-full mt-4"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Solve with AI
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {solution && (
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle>Solution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-invert max-w-none">
                                <pre className="whitespace-pre-wrap font-sans text-foreground">{solution}</pre>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* AI Chat for follow-up questions */}
            {solution && <FeatureChat featureId="solver" context={solution} />}
        </ScrollArea>
    );
}

function TimetableTab({ isLoading, setIsLoading, toast }: any) {
    const [file, setFile] = useState<File | null>(null);
    const [timetable, setTimetable] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [syllabusMode, setSyllabusMode] = useState(false);
    const [topicsPerDay, setTopicsPerDay] = useState("2");
    const [studyTime, setStudyTime] = useState("10:00");
    const [daysToAdd, setDaysToAdd] = useState("7");
    const [showDaysDialog, setShowDaysDialog] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setTimetable([]);
            setSyllabusMode(false);
            toast({
                title: "File Uploaded",
                description: "Click 'Extract Timetable' to proceed.",
            });
        }
    };

    const handleGenerate = async () => {
        if (!file) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            if (syllabusMode) {
                formData.append("mode", "syllabus");
                formData.append("topicsPerDay", topicsPerDay);
                formData.append("studyTime", studyTime);
            }

            const res = await fetch(`${getApiBaseUrl()}/api/ai/pdf-to-timetable`, {
                method: "POST",
                body: formData,
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse JSON response:", text);
                throw new Error(`Server Error: ${text.substring(0, 100)}...`);
            }

            if (!res.ok) {
                if (res.status === 422 && data.mode === "syllabus_required") {
                    setSyllabusMode(true);
                    toast({
                        title: "Syllabus Detected",
                        description: "No schedule found. Please configure study plan settings.",
                    });
                    return;
                }
                throw new Error(data.message || "Failed to generate timetable");
            }
            setTimetable(Array.isArray(data) ? data : []);
            setSyllabusMode(false);

            toast({
                title: "Success",
                description: "Timetable generated successfully.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to generate timetable.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTask = async (item: any, dayOffset: number = 0) => {
        try {
            const { apiRequest } = await import("@/lib/queryClient");

            console.log("Adding task from item:", item, "dayOffset:", dayOffset);

            // Parse time to get a deadline
            // Handle formats like "10:00", "10:00 AM", "10:00-11:00", "10am"
            const timeStr = item.time || "12:00 PM";
            const timeParts = timeStr.match(/(\d{1,2})[:.]?(\d{2})?\s*(AM|PM)?/i);

            let deadline = new Date();
            deadline.setDate(deadline.getDate() + dayOffset); // Add day offset

            if (timeParts) {
                let hours = parseInt(timeParts[1]);
                const minutes = parseInt(timeParts[2] || "0");
                const period = timeParts[3];

                if (period) {
                    if (period.toUpperCase() === "PM" && hours < 12) hours += 12;
                    if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
                }

                deadline.setHours(hours, minutes, 0, 0);
                // If time passed today, assume tomorrow
                if (deadline < new Date()) {
                    deadline.setDate(deadline.getDate() + 1);
                }
            } else {
                // Fallback: Set to end of today if parsing fails
                deadline.setHours(23, 59, 0, 0);
            }

            // Helper to get local ISO string (without Z)
            const toLocalISOString = (date: Date) => {
                const offset = date.getTimezoneOffset() * 60000;
                return new Date(date.getTime() - offset).toISOString().slice(0, -1);
            };

            await apiRequest("POST", "/api/tasks", {
                title: `${item.task || "Study Task"} (${item.subject} - ${item.time})`, // Append details to title since description col missing
                deadline: toLocalISOString(deadline), // Send local time
                type: "assignment",
                courseCode: (item.subject || "General").substring(0, 10),
                sectionId: "self-study",
                completed: false,
            });

            toast({
                title: "Task Added",
                description: `Added "${item.task}" to your todo list.`,
            });
        } catch (error: any) {
            console.error("Failed to add task:", error);
            // Extract detailed error message if available
            let errorMsg = error.message;
            if (errorMsg.includes("400")) errorMsg = "Validation Error: Check inputs";

            toast({
                title: "Error",
                description: "Failed to add task: " + errorMsg,
                variant: "destructive",
            });
        }
    };

    return (
        <ScrollArea className="h-full p-4">
            <div className="space-y-6 max-w-md mx-auto">
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle>PDF to Timetable</CardTitle>
                        <CardDescription>Extract schedule or create plan from syllabus</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" className="hidden" />
                            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">{file ? file.name : "Click to upload PDF or Image"}</p>
                        </div>

                        {syllabusMode && (
                            <div className="mt-4 space-y-4 p-4 bg-secondary/30 rounded-lg border border-border">
                                <p className="text-sm font-medium">Configure Study Plan</p>
                                <div className="space-y-2">
                                    <Label>Topics per Day</Label>
                                    <Input
                                        type="number"
                                        value={topicsPerDay}
                                        onChange={(e) => setTopicsPerDay(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Study Time</Label>
                                    <Input
                                        type="time"
                                        value={studyTime}
                                        onChange={(e) => setStudyTime(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>
                            </div>
                        )}

                        {file && (
                            <Button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="w-full mt-4"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                                {syllabusMode ? "Generate Study Plan" : "Extract Timetable"}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {timetable.length > 0 && (
                    <div className="space-y-4">
                        {timetable.map((item, index) => (
                            <Card key={index} className="bg-card border-border">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-primary">{item.day}</p>
                                        <p className="text-sm text-muted-foreground">{item.time}</p>
                                        <p className="text-foreground mt-1">{item.subject}</p>
                                        <p className="text-sm text-muted-foreground">{item.task}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                        onClick={() => handleAddTask(item)}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Add All Button */}
                        <Button
                            onClick={() => setShowDaysDialog(true)}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Add All to Tasks
                        </Button>
                    </div>
                )}

                {/* Days Selection Dialog */}
                {showDaysDialog && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
                        <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border">
                            <h3 className="text-lg font-semibold mb-4">Schedule Duration</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Add these {timetable.length} items to your todo list for how many days?
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <Label>Number of Days</Label>
                                    <Input
                                        type="number"
                                        value={daysToAdd}
                                        onChange={(e) => setDaysToAdd(e.target.value)}
                                        min="1"
                                        max="30"
                                        className="bg-background mt-2"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={async () => {
                                            const days = parseInt(daysToAdd) || 7;
                                            for (let d = 0; d < days; d++) {
                                                for (const item of timetable) {
                                                    const modifiedItem = { ...item };
                                                    // Add day offset to the date
                                                    const today = new Date();
                                                    today.setDate(today.getDate() + d);
                                                    modifiedItem.dayOffset = d;
                                                    await handleAddTask(modifiedItem, d);
                                                }
                                            }
                                            setShowDaysDialog(false);
                                            toast({
                                                title: "Tasks Added",
                                                description: `Added ${timetable.length * days} tasks for ${days} days!`,
                                            });
                                        }}
                                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                    >
                                        Add for {daysToAdd} Days
                                    </Button>
                                    <Button
                                        onClick={() => setShowDaysDialog(false)}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Chat for follow-up questions */}
            {timetable.length > 0 && <FeatureChat featureId="timetable" context={JSON.stringify(timetable)} />}
        </ScrollArea>
    );
}

function CoursesTab({ isLoading, setIsLoading, toast }: any) {
    const [playlistId, setPlaylistId] = useState("");
    const [videos, setVideos] = useState<any[]>([]);
    const [scheduleConfig, setScheduleConfig] = useState({ videosPerDay: 1, time: "10:00" });

    const handleFetch = async () => {
        if (!playlistId) return;
        setIsLoading(true);
        try {
            // Extract ID if full URL is pasted
            let id = playlistId;
            const urlMatch = playlistId.match(/[?&]list=([^&]+)/);
            if (urlMatch) id = urlMatch[1];

            const res = await apiRequest("GET", `/api/youtube/playlist?listId=${id}`);
            const data = await safeParseJson(res);
            setVideos(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch playlist. Check the ID/URL.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const [isCreating, setIsCreating] = useState(false);

    const parseDuration = (duration: string) => {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        const hours = parseInt(match[1] || '0', 10);
        const minutes = parseInt(match[2] || '0', 10);
        const seconds = parseInt(match[3] || '0', 10);
        return hours * 60 + minutes + Math.round(seconds / 60); // Return total minutes, rounding seconds
    };

    const handleCreateSchedule = async () => {
        setIsCreating(true);
        try {
            const { apiRequest } = await import("@/lib/queryClient");

            const [startHours, startMinutes] = scheduleConfig.time.split(":").map(Number);
            let currentDate = new Date();
            currentDate.setHours(startHours, startMinutes, 0, 0);

            // Ensure we are working with local time, but ISO string converts to UTC.
            // To preserve the "10:00 AM" visual in the database/UI if it expects UTC,
            // we might need to adjust. However, the best practice is to store UTC and display Local.
            // If the UI is showing the UTC hour (e.g. 4 for 10 AM IST), it means the UI is reading raw ISO.
            // We will force the deadline to be set correctly.

            // Actually, if the user says "showing 4", and they are in IST, 10 AM IST is 4:30 AM UTC.
            // If they see "4", they are seeing the UTC hour.
            // The fix is to ensure the UI displays it in local time.
            // But here, let's make sure we are setting the time correctly in the first place.

            // No change needed to this logic if the client handles timezone.
            // But to be safe, let's log it.
            console.log("Scheduling for:", currentDate.toString());

            // If the time has already passed today, start from tomorrow
            if (currentDate < new Date()) {
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Helper to get local ISO string (without Z)
            const toLocalISOString = (date: Date) => {
                const offset = date.getTimezoneOffset() * 60000;
                return new Date(date.getTime() - offset).toISOString().slice(0, -1);
            };

            let videosScheduledToday = 0;

            for (const video of videos) {
                // Server returns simplified object: { id, title, duration, ... }
                // Client was expecting raw YouTube API format: { snippet: { title }, contentDetails: { duration } }

                const durationStr = video.duration || video.contentDetails?.duration || "PT30M";
                const titleStr = video.title || video.snippet?.title || "Untitled Video";

                const durationMinutes = parseDuration(durationStr) || 30;
                const endTime = new Date(currentDate.getTime() + durationMinutes * 60000);

                await apiRequest("POST", "/api/tasks", {
                    title: `Watch: ${titleStr} (${durationMinutes}m)`,
                    deadline: toLocalISOString(endTime), // Send local time
                    type: "assignment", // Default type
                    courseCode: "YOUTUBE", // Placeholder
                    sectionId: "self-study", // Placeholder
                    completed: false,
                });

                // Move to next day if we've reached the limit
                videosScheduledToday++;
                if (videosScheduledToday >= scheduleConfig.videosPerDay) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    currentDate.setHours(startHours, startMinutes, 0, 0);
                    videosScheduledToday = 0;
                } else {
                    // Add buffer time (e.g., 10 mins) between videos if multiple per day
                    currentDate = new Date(endTime.getTime() + 10 * 60000);
                }
            }

            toast({
                title: "Schedule Added!",
                description: `Successfully scheduled ${videos.length} study sessions.`,
            });
        } catch (error) {
            console.error("Failed to create schedule:", error);
            toast({
                title: "Error",
                description: "Failed to create study schedule.",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <ScrollArea className="h-full p-4">
            <div className="space-y-6 max-w-md mx-auto">
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle>YouTube Course Scheduler</CardTitle>
                        <CardDescription>Turn playlists into a daily study plan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Paste YouTube Playlist URL or ID"
                                value={playlistId}
                                onChange={(e) => setPlaylistId(e.target.value)}
                                className="bg-secondary border-border"
                            />
                            <Button onClick={handleFetch} disabled={isLoading} className="bg-primary hover:bg-primary/90">
                                Fetch
                            </Button>
                        </div>

                        {videos.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-border">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Videos per day</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={scheduleConfig.videosPerDay}
                                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, videosPerDay: parseInt(e.target.value) })}
                                            className="bg-secondary border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Start Time</Label>
                                        <Input
                                            type="time"
                                            value={scheduleConfig.time}
                                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, time: e.target.value })}
                                            className="bg-secondary border-border"
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleCreateSchedule}
                                    disabled={isLoading || isCreating}
                                    className="w-full bg-green-600 hover:bg-green-700 relative overflow-hidden"
                                >
                                    {isCreating ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Hold on creating...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Calendar className="w-4 h-4 mr-2" />
                                            Create Study Schedule
                                        </>
                                    )}
                                </Button>

                                <div className="space-y-2 mt-4">
                                    <p className="text-sm text-muted-foreground">{videos.length} videos found</p>
                                    {videos.slice(0, 5).map((video) => (
                                        <div key={video.id} className="flex gap-3 items-center bg-secondary/50 p-2 rounded-lg">
                                            <img src={video.thumbnail} alt="" className="w-20 h-12 object-cover rounded" />
                                            <p className="text-sm line-clamp-2">{video.title}</p>
                                        </div>
                                    ))}
                                    {videos.length > 5 && <p className="text-xs text-center text-muted-foreground">and {videos.length - 5} more...</p>}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}

function AttendanceTab() {
    const [present, setPresent] = useState("");
    const [totalConducted, setTotalConducted] = useState("");
    const [upcoming, setUpcoming] = useState("");
    const [required, setRequired] = useState("75");
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const calculate = async () => {
        if (!present || !totalConducted || !upcoming || !required) {
            setResult("Please fill all fields!");
            return;
        }

        setLoading(true);
        try {
            const res = await apiRequest("POST", "/api/ai/attendance", { present, totalConducted, upcoming, required });
            const data = await safeParseJson(res);
            setResult(data.analysis);
        } catch (error) {
            // Fallback logic if AI fails
            const p = parseInt(present);
            const t = parseInt(totalConducted);
            const u = parseInt(upcoming);
            const r = parseInt(required);

            if (!isNaN(p) && !isNaN(t) && !isNaN(u) && !isNaN(r)) {
                const totalClasses = t + u;
                const requiredClasses = Math.ceil((totalClasses * r) / 100);
                const deficit = requiredClasses - p;
                const mustAttend = Math.max(0, deficit);
                const canBunk = Math.max(0, u - mustAttend);

                if (mustAttend > u) {
                    setResult(`Impossible! Max possible is ${(((p + u) / totalClasses) * 100).toFixed(1)}%.`);
                } else if (mustAttend > 0) {
                    setResult(`Attend ${mustAttend} more classes. You can bunk ${canBunk}.`);
                } else {
                    setResult(`Safe! You can bunk ${canBunk} classes.`);
                }
            } else {
                setResult("Calculation failed. Check inputs.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollArea className="h-full p-4">
            <div className="space-y-6 max-w-md mx-auto">
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle>Attendance Calculator</CardTitle>
                        <CardDescription>AI-Powered Bunk Manager</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Classes Attended So Far</Label>
                            <Input
                                type="number"
                                value={present}
                                onChange={(e) => setPresent(e.target.value)}
                                className="bg-secondary border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Total Classes Conducted</Label>
                            <Input
                                type="number"
                                value={totalConducted}
                                onChange={(e) => setTotalConducted(e.target.value)}
                                className="bg-secondary border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Upcoming Classes (Future)</Label>
                            <Input
                                type="number"
                                value={upcoming}
                                onChange={(e) => setUpcoming(e.target.value)}
                                className="bg-secondary border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Required Percentage (%)</Label>
                            <Input
                                type="number"
                                value={required}
                                onChange={(e) => setRequired(e.target.value)}
                                className="bg-secondary border-border"
                            />
                        </div>
                        <Button onClick={calculate} className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
                            Analyze
                        </Button>

                        {result && (
                            <div className="p-4 bg-secondary/50 rounded-lg text-center font-medium mt-4 animate-in fade-in slide-in-from-bottom-2">
                                {result}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
