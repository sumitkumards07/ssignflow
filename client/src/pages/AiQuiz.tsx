import React, { useState, useEffect, useRef } from "react";

import { Upload, FileText, Loader2, Sparkles, Check, X, ArrowRight, Menu, User, Plus as PlusIcon, Mic, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/layout/BottomNav";
import { apiRequest } from "@/lib/queryClient";
import * as pdfjsLib from "pdfjs-dist";
import confetti from "canvas-confetti";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

interface Message {
    role: "user" | "assistant";
    content: string;
    questions?: QuizQuestion[];
}

interface QuizState {
    currentIndex: number;
    selectedAnswer: number | null;
    isAnswered: boolean;
    score: number;
}

export default function AiQuizPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pdfText, setPdfText] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [quizState, setQuizState] = useState<QuizState | null>(null);
    const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const extractTextFromPDF = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + " ";
        }
        return fullText;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setIsLoading(true);
            try {
                const text = await extractTextFromPDF(selectedFile);
                setPdfText(text);

                const welcomeMessage: Message = {
                    role: "assistant",
                    content: `👋 Great! I've analyzed "${selectedFile.name}". I can help you:\n\n• Generate quiz questions\n• Create flashcards\n• Explain concepts\n• Test your knowledge\n\nWhat would you like to do?`
                };
                setMessages([welcomeMessage]);
            } catch (error) {
                console.error("Error extracting PDF:", error);
                alert("Failed to extract text from PDF");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || !pdfText) return;

        const userMessage: Message = {
            role: "user",
            content: userInput
        };
        setMessages(prev => [...prev, userMessage]);
        setUserInput("");
        setIsLoading(true);

        try {
            const prompt = `You are an expert AI tutor. Your goal is to help the user understand the content of the provided PDF.
Context from PDF:
"${pdfText.substring(0, 50000)}"

User Query: "${userInput}"

Instructions:
1. If the user asks for a quiz, test, or practice questions, generate a JSON response with quiz questions in the specified format.
2. If the user asks a question about the PDF content, answer it comprehensively using ONLY the information from the PDF. If the answer is not in the PDF, state that clearly.
3. If the user engages in general conversation (greeting, etc.), respond politely.

If generating a quiz, use this JSON format:
{
  "message": "Brief friendly response",
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct"
    }
  ]
}

Otherwise, for general questions or conversation, use this JSON format:
{
  "message": "Your helpful response based on the PDF content"
}`;

            const res = await apiRequest("POST", "/api/ai/generate", { prompt });
            const data = await res.json();
            const jsonString = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
            const aiResponse = JSON.parse(jsonString);

            const assistantMessage: Message = {
                role: "assistant",
                content: aiResponse.message,
                questions: aiResponse.questions || undefined
            };
            setMessages(prev => [...prev, assistantMessage]);

            // If questions were generated, set them as active
            if (aiResponse.questions && aiResponse.questions.length > 0) {
                setActiveQuestions(aiResponse.questions);
                setQuizState({
                    currentIndex: 0,
                    selectedAnswer: null,
                    isAnswered: false,
                    score: 0
                });
            }
        } catch (error) {
            console.error("Error:", error);
            const errorMessage: Message = {
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again!"
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerSelect = (index: number) => {
        if (!quizState || quizState.isAnswered) return;
        setQuizState(prev => prev ? { ...prev, selectedAnswer: index } : null);
    };

    const handleSubmitAnswer = () => {
        if (!quizState || quizState.selectedAnswer === null || !activeQuestions.length) return;

        const isCorrect = quizState.selectedAnswer === activeQuestions[quizState.currentIndex].correctAnswer;

        setQuizState(prev => prev ? {
            ...prev,
            isAnswered: true,
            score: isCorrect ? prev.score + 1 : prev.score
        } : null);

        if (isCorrect) {
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#a855f7', '#8b5cf6', '#7c3aed']
            });
        }
    };

    const handleNextQuestion = () => {
        if (!quizState || !activeQuestions.length) return;

        if (quizState.currentIndex < activeQuestions.length - 1) {
            setQuizState(prev => prev ? {
                ...prev,
                currentIndex: prev.currentIndex + 1,
                selectedAnswer: null,
                isAnswered: false
            } : null);
        } else {
            // Quiz complete
            const finalScore = quizState.score + (quizState.selectedAnswer === activeQuestions[quizState.currentIndex].correctAnswer ? 1 : 0);
            const completionMessage: Message = {
                role: "assistant",
                content: `🎉 Quiz complete! You scored ${finalScore}/${activeQuestions.length} (${Math.round((finalScore / activeQuestions.length) * 100)}%).\n\nWould you like to try a different topic or difficulty level?`
            };
            setMessages(prev => [...prev, completionMessage]);
            setQuizState(null);
            setActiveQuestions([]);

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    };

    const resetChat = () => {
        setFile(null);
        setPdfText("");
        setMessages([]);
        setQuizState(null);
        setActiveQuestions([]);
    };

    const quickPrompts = [
        "Generate 5 quiz questions",
        "Create easy questions",
        "Make it harder",
        "Explain key concepts"
    ];

    const currentQuestion = quizState && activeQuestions.length > 0 ? activeQuestions[quizState.currentIndex] : null;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 pt-safe border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-secondary rounded-full">
                        <span className="text-sm font-medium">AI Quiz Chat</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {file && (
                        <button onClick={resetChat} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    )}
                    <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                        <User className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {!file ? (
                    <div className="flex-1 flex flex-col items-center justify-center px-6">
                        <h1 className="text-3xl font-medium mb-4">What can I help with?</h1>
                        <p className="text-muted-foreground text-center mb-12">Upload a PDF to start learning with AI</p>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 rounded-full text-sm font-medium transition-colors shadow-lg text-white"
                            style={{ backgroundColor: 'var(--theme-primary)', boxShadow: '0 10px 15px -3px rgba(var(--theme-primary-rgb), 0.2)' }}
                        >
                            Upload PDF to Start
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />

                        {isLoading && (
                            <div className="flex items-center justify-center gap-2 mt-6" style={{ color: 'var(--theme-primary)' }}>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Analyzing PDF...</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Progress Indicator */}
                        {quizState && activeQuestions.length > 0 && (
                            <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between sticky top-[73px] z-10">
                                <span className="text-sm text-muted-foreground">
                                    Question {quizState.currentIndex + 1}/{activeQuestions.length}
                                </span>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full border" style={{ backgroundColor: 'rgba(var(--theme-primary-rgb), 0.1)', borderColor: 'rgba(var(--theme-primary-rgb), 0.2)' }}>
                                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
                                    <span className="text-sm font-bold" style={{ color: 'var(--theme-primary)' }}>
                                        {quizState.score}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto px-6 py-6" ref={scrollRef}>
                            <div className="max-w-2xl mx-auto space-y-4">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-3xl p-5 ${message.role === "user" ? "rounded-br-md text-white" : "bg-secondary rounded-bl-md"}`}
                                            style={message.role === "user" ? { backgroundColor: 'var(--theme-primary)' } : {}}
                                        >
                                            {message.role === "assistant" && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sparkles className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                                                    <span className="text-xs font-medium" style={{ color: 'var(--theme-primary)' }}>AI Tutor</span>
                                                </div>
                                            )}
                                            <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                        </div>
                                    </div>
                                ))}

                                {/* Active Quiz Question */}
                                {currentQuestion && quizState && (
                                    <div
                                        className="space-y-4 pt-4"
                                    >
                                        {/* Question */}
                                        <div className="bg-secondary p-5 rounded-2xl">
                                            <p className="text-lg font-medium">{currentQuestion.question}</p>
                                        </div>

                                        {/* Answer Options */}
                                        <div className="space-y-3">
                                            {currentQuestion.options.map((option, index) => {
                                                const isSelected = quizState.selectedAnswer === index;
                                                const isCorrect = index === currentQuestion.correctAnswer;
                                                const showResult = quizState.isAnswered;

                                                let buttonClass = "bg-secondary border border-border text-muted-foreground hover:border-primary/50";
                                                let buttonStyle = {};

                                                if (showResult) {
                                                    if (isCorrect) {
                                                        buttonClass = "bg-green-500/20 border-2 border-green-500 text-green-600 dark:text-green-300";
                                                    } else if (isSelected) {
                                                        buttonClass = "bg-red-500/20 border-2 border-red-500 text-red-600 dark:text-red-300";
                                                    }
                                                } else if (isSelected) {
                                                    buttonClass = "text-white shadow-lg";
                                                    buttonStyle = { backgroundColor: 'var(--theme-primary)', borderColor: 'var(--theme-primary)' };
                                                }

                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleAnswerSelect(index)}
                                                        disabled={quizState.isAnswered}
                                                        className={`w-full px-6 py-4 rounded-full text-left transition-all flex items-center justify-between ${buttonClass}`}
                                                        style={buttonStyle}
                                                    >
                                                        <span className="font-medium">{option}</span>
                                                        {showResult && isCorrect && <Check className="w-5 h-5" />}
                                                        {showResult && isSelected && !isCorrect && <X className="w-5 h-5" />}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation */}
                                        {quizState.isAnswered && currentQuestion.explanation && (
                                            <div
                                                className="bg-secondary/50 p-4 rounded-xl border border-border"
                                            >
                                                <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                                            </div>
                                        )}

                                        {/* Submit/Next Button */}
                                        <Button
                                            onClick={quizState.isAnswered ? handleNextQuestion : handleSubmitAnswer}
                                            disabled={quizState.selectedAnswer === null}
                                            className="w-full h-14 text-white rounded-full text-base font-semibold disabled:opacity-50 shadow-lg"
                                            style={{ backgroundColor: 'var(--theme-primary)' }}
                                        >
                                            {quizState.isAnswered ? (
                                                <>
                                                    {quizState.currentIndex === activeQuestions.length - 1 ? 'Finish' : 'Next Question'}
                                                    <ArrowRight className="w-5 h-5 ml-2" />
                                                </>
                                            ) : (
                                                'Check Answer'
                                            )}
                                        </Button>
                                    </div>
                                )}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-secondary rounded-3xl p-5 rounded-bl-md">
                                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--theme-primary)' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {messages.length === 1 && !quizState && (
                            <div className="px-6 pb-3">
                                <div className="max-w-2xl mx-auto grid grid-cols-2 gap-2">
                                    {quickPrompts.map((prompt, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setUserInput(prompt);
                                                setTimeout(() => handleSendMessage(), 100);
                                            }}
                                            className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-full text-sm transition-colors"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input Bar */}
                        {!quizState && (
                            <div className="px-4 pb-6">
                                <div className="max-w-2xl mx-auto bg-secondary rounded-full flex items-center px-4 py-3 gap-3">
                                    <button className="flex-shrink-0">
                                        <PlusIcon className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                    <Input
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                        placeholder="Ask me anything about the PDF..."
                                        className="flex-1 bg-transparent border-0 placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                                        disabled={isLoading}
                                    />
                                    <button className="flex-shrink-0">
                                        <Mic className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!userInput.trim() || isLoading}
                                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: 'var(--theme-primary)' }}
                                    >
                                        <Send className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
