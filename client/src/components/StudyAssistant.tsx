import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Image as ImageIcon, Youtube, BookOpen, Clock, Check, Loader2, ArrowRight, Plus, BrainCircuit, MessageSquare, ChevronLeft, Mic, Send, Download, Sparkles, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, safeParseJson, getApiBaseUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QuizInterface } from "@/components/QuizInterface";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import jsPDF from "jspdf";

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
                description: "Failed to get response",
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
                                <div className="flex justify-start">
                                    <div className="bg-secondary rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                        <span className="text-xs sm:text-sm text-muted-foreground">Thinking...</span>
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

    const features = [
        { id: "solver", label: "Solve Problem", icon: ImageIcon, color: "text-purple-500", bg: "bg-purple-500/10" },
        { id: "notes", label: "Handwritten Notes", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
        { id: "quiz", label: "Take Quiz", icon: BrainCircuit, color: "text-green-500", bg: "bg-green-500/10" },
        { id: "timetable", label: "Plan Schedule", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
        { id: "courses", label: "Find Courses", icon: Youtube, color: "text-red-500", bg: "bg-red-500/10" },
        { id: "attendance", label: "Attendance Calc", icon: Check, color: "text-teal-500", bg: "bg-teal-500/10" },
    ];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleBack = () => {
        setActiveFeature(null);
        setMessages([]);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: inputValue,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);

        try {
            const res = await apiRequest("POST", "/api/ai/generate", { prompt: userMsg.content });
            const data = await safeParseJson(res);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: data.text,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Chat error:", error);
            toast({
                title: "Error",
                description: "Failed to get response. Check your internet or API Key.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const downloadPDF = (content: string) => {
        const doc = new jsPDF();
        const splitText = doc.splitTextToSize(content, 180);
        doc.text(splitText, 10, 10);
        doc.save("study-assistant-response.pdf");
        toast({
            title: "Downloaded",
            description: "Response saved as PDF.",
        });
    };

    return (
        <div className="h-dvh flex flex-col bg-background text-foreground relative md:max-w-4xl md:mx-auto md:border-x md:border-border shadow-sm overflow-hidden">
            {/* Header - Responsive */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-border bg-background/95 backdrop-blur z-10 pt-safe shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    {activeFeature || messages.length > 0 ? (
                        <Button variant="ghost" size="icon" onClick={() => { setActiveFeature(null); setMessages([]); }} className="-ml-1 shrink-0">
                            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Button>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                    )}
                    <span className="font-semibold text-base sm:text-lg truncate">
                        {activeFeature ? features.find(f => f.id === activeFeature)?.label : (messages.length > 0 ? "Chat" : "AI Assistant")}
                    </span>
                </div>
                <div className="flex gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-muted-foreground hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
                        onClick={() => setMessages([])}
                        title="Reset Chat"
                    >
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
                <AnimatePresence mode="wait">
                    {activeFeature ? (
                        <motion.div
                            key="feature"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="min-h-full pb-20"
                        >
                            {activeFeature === "solver" && <SolverTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                            {activeFeature === "notes" && <NotesTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                            {activeFeature === "quiz" && <QuizInterface />}
                            {activeFeature === "timetable" && <TimetableTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                            {activeFeature === "courses" && <CoursesTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                            {activeFeature === "attendance" && <AttendanceTab />}
                        </motion.div>
                    ) : messages.length > 0 ? (
                        <div className="flex flex-col pb-20" ref={scrollRef}>
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3 sm:p-4 ${msg.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-br-none"
                                                : "bg-secondary text-secondary-foreground rounded-bl-none"
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                            {msg.role === "ai" && (
                                                <div className="mt-2 pt-2 border-t border-black/10 flex justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-xs"
                                                        onClick={() => downloadPDF(msg.content)}
                                                    >
                                                        <Download className="w-3 h-3 mr-1" />
                                                        PDF
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-secondary rounded-2xl rounded-bl-none p-3 sm:p-4 flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-sm text-muted-foreground">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="h-full flex flex-col items-center justify-center p-2 sm:p-6 text-center pb-20"
                        >
                            <div className="mb-6 sm:mb-8">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                    <BrainCircuit className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold mb-2">What can I help with?</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-md">
                                {features.map((feature) => (
                                    <button
                                        key={feature.id}
                                        onClick={() => setActiveFeature(feature.id)}
                                        className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border hover:bg-secondary/50 transition-all ${feature.id === 'quiz' ? 'col-span-2' : ''}`}
                                    >
                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${feature.bg} flex items-center justify-center mb-1.5 sm:mb-2`}>
                                            <feature.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${feature.color}`} />
                                        </div>
                                        <span className="font-medium text-xs sm:text-sm">{feature.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Chat Input */}
            {!activeFeature && (
                <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-border bg-background">
                    <div className="relative max-w-md mx-auto">
                        <Input
                            placeholder="Ask anything (e.g., 'What is AI?')..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="pr-24 h-12 rounded-full bg-secondary border-transparent focus:border-primary/50"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-muted-foreground">
                                <Mic className="w-4 h-4" />
                            </Button>
                            <Button
                                size="icon"
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="h-8 w-8 rounded-full bg-primary text-primary-foreground"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
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
                description: "Could not analyze image. Ensure GEMINI_API_KEY is set.",
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

function NotesTab({ isLoading, setIsLoading, toast }: any) {
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setNotes("");
            toast({
                title: "File Uploaded",
                description: "Thank you for uploading! Click 'Generate Notes' to proceed.",
            });
        }
    };

    const downloadPDF = async () => {
        if (!notes) return;
        try {
            const { jsPDF } = await import("jspdf");
            const doc = new jsPDF();

            // Add title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(20);
            doc.text("Study Notes", 20, 20);

            // Add content
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            const splitText = doc.splitTextToSize(notes, 170);
            doc.text(splitText, 20, 40);

            doc.save("study-notes.pdf");

            toast({
                title: "Downloaded",
                description: "Notes saved as PDF.",
            });
        } catch (error) {
            console.error("PDF download failed:", error);
            toast({
                title: "Error",
                description: "Failed to download PDF.",
                variant: "destructive",
            });
        }
    };

    const handleGenerate = async () => {
        if (!file) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`${getApiBaseUrl()}/api/ai/pdf-to-notes`, {
                method: "POST",
                body: formData,
            });

            const data = await safeParseJson(res);
            if (!res.ok) {
                throw new Error(data.message || "Failed to generate notes");
            }
            setNotes(data.notes);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to generate notes.",
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
                        <CardTitle>PDF to Handwritten Notes</CardTitle>
                        <CardDescription>Convert lecture slides or PDFs into study notes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" className="hidden" />
                            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">{file ? file.name : "Click to upload PDF or Image"}</p>
                        </div>

                        {file && (
                            <Button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="w-full mt-4"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
                                Generate Notes
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {notes && (
                    <Card className="bg-[#fff9e6] text-zinc-900 border-zinc-200 shadow-lg rotate-1 transform transition-transform hover:rotate-0">
                        <CardHeader className="border-b border-zinc-200/50 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="font-handwriting text-2xl text-zinc-800">Study Notes</CardTitle>
                            <Button variant="ghost" size="sm" onClick={downloadPDF} className="text-zinc-600 hover:text-zinc-900">
                                <Download className="w-4 h-4 mr-2" />
                                PDF
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="font-handwriting text-lg leading-relaxed whitespace-pre-wrap" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}>
                                {notes}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* AI Chat for follow-up questions */}
            {notes && <FeatureChat featureId="notes" context={notes} />}
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
            const res = await fetch(`${getApiBaseUrl()}/api/ai/attendance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ present, totalConducted, upcoming, required }),
            });

            const data = await safeParseJson(res);
            if (!res.ok) throw new Error(data.message || "Failed to analyze");
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
