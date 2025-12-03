import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Image as ImageIcon, Youtube, BookOpen, Clock, Check, Loader2, ArrowRight, Plus, BrainCircuit, MessageSquare, ChevronLeft, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QuizInterface } from "@/components/QuizInterface";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function StudyAssistant() {
    const { toast } = useToast();
    const [activeFeature, setActiveFeature] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const features = [
        { id: "solver", label: "Solve Problem", icon: ImageIcon, color: "text-purple-500", bg: "bg-purple-500/10" },
        { id: "notes", label: "Handwritten Notes", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
        { id: "quiz", label: "Take Quiz", icon: BrainCircuit, color: "text-green-500", bg: "bg-green-500/10" },
        { id: "timetable", label: "Plan Schedule", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
        { id: "courses", label: "Find Courses", icon: Youtube, color: "text-red-500", bg: "bg-red-500/10" },
    ];

    const handleBack = () => {
        setActiveFeature(null);
    };

    return (
        <div className="h-full flex flex-col bg-background text-foreground relative">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur z-10 pt-safe">
                <div className="flex items-center gap-3">
                    {activeFeature ? (
                        <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2">
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <BrainCircuit className="w-5 h-5 text-primary" />
                        </div>
                    )}
                    <span className="font-semibold text-lg">
                        {activeFeature ? features.find(f => f.id === activeFeature)?.label : "Study Assistant"}
                    </span>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <MessageSquare className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {!activeFeature ? (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="h-full flex flex-col items-center justify-center p-6 text-center"
                        >
                            <div className="mb-8">
                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <BrainCircuit className="w-10 h-10 text-primary" />
                                </div>
                                <h2 className="text-3xl font-bold mb-2">What can I help with?</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                                {features.map((feature) => (
                                    <button
                                        key={feature.id}
                                        onClick={() => setActiveFeature(feature.id)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border border-border hover:bg-secondary/50 transition-all ${feature.id === 'quiz' ? 'col-span-2' : ''}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full ${feature.bg} flex items-center justify-center mb-2`}>
                                            <feature.icon className={`w-5 h-5 ${feature.color}`} />
                                        </div>
                                        <span className="font-medium text-sm">{feature.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="feature"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full"
                        >
                            {activeFeature === "solver" && <SolverTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                            {activeFeature === "notes" && <NotesTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                            {activeFeature === "quiz" && <QuizInterface />}
                            {activeFeature === "timetable" && <TimetableTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                            {activeFeature === "courses" && <CoursesTab isLoading={isLoading} setIsLoading={setIsLoading} toast={toast} />}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Chat Input (Visual Only for Home) */}
            {!activeFeature && (
                <div className="p-4 border-t border-border bg-background">
                    <div className="relative max-w-md mx-auto">
                        <Input
                            placeholder="Message Study Assistant..."
                            className="pr-24 h-12 rounded-full bg-secondary border-transparent focus:border-primary/50"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-muted-foreground">
                                <Mic className="w-4 h-4" />
                            </Button>
                            <Button size="icon" className="h-8 w-8 rounded-full bg-primary text-primary-foreground">
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ... (Rest of the components: SolverTab, NotesTab, TimetableTab, CoursesTab)
// I need to make sure I include them in the replacement content or they will be lost if I replace the whole file.
// The tool `replace_file_content` replaces a range. If I use StartLine: 1 and EndLine: 451, I must provide ALL content.
// I will copy the existing components and adapt their styling.

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
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("image", image);

            const res = await fetch("/api/ai/analyze-image", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Failed to analyze image");

            const data = await res.json();
            setSolution(data.text);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to analyze image. Please try again.",
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
        }
    };

    const handleGenerate = async () => {
        if (!file) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("pdf", file);

            const res = await fetch("/api/ai/pdf-to-notes", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Failed to generate notes");

            const data = await res.json();
            setNotes(data.notes);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate notes.",
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
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
                            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">{file ? file.name : "Click to upload PDF"}</p>
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
                        <CardHeader className="border-b border-zinc-200/50 pb-4">
                            <CardTitle className="font-handwriting text-2xl text-zinc-800">Study Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="font-handwriting text-lg leading-relaxed whitespace-pre-wrap" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}>
                                {notes}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </ScrollArea>
    );
}

function TimetableTab({ isLoading, setIsLoading, toast }: any) {
    const [file, setFile] = useState<File | null>(null);
    const [timetable, setTimetable] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setTimetable([]);
        }
    };

    const handleGenerate = async () => {
        if (!file) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("pdf", file);

            const res = await fetch("/api/ai/pdf-to-timetable", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Failed to generate timetable");

            const data = await res.json();
            setTimetable(Array.isArray(data) ? data : []);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate timetable.",
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
                        <CardTitle>PDF to Timetable</CardTitle>
                        <CardDescription>Extract schedule from course documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
                            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">{file ? file.name : "Click to upload PDF"}</p>
                        </div>

                        {file && (
                            <Button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="w-full mt-4"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                                Extract Timetable
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
                                    <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
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
            const data = await res.json();
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

    return (
        <ScrollArea className="h-full p-4">
            <div className="space-y-6 max-w-md mx-auto">
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle>YouTube Course Scheduler</CardTitle>
                        <CardDescription>Turn a playlist into a daily study plan</CardDescription>
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
                                        <Label>Study Time</Label>
                                        <Input
                                            type="time"
                                            value={scheduleConfig.time}
                                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, time: e.target.value })}
                                            className="bg-secondary border-border"
                                        />
                                    </div>
                                </div>

                                <Button className="w-full bg-green-600 hover:bg-green-700">
                                    Create Study Schedule
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

import { Sparkles } from "lucide-react";
