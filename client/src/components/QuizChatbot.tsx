import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Loader2, Sparkles, Check, X, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist";
import confetti from "canvas-confetti";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

interface QuizState {
    questions: QuizQuestion[];
    currentIndex: number;
    selectedAnswer: number | null;
    isAnswered: boolean;
    score: number;
}

export function QuizChatbot({ trigger }: { trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [pdfText, setPdfText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [quizState, setQuizState] = useState<QuizState | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [genAI, setGenAI] = useState<GoogleGenerativeAI | null>(null);

    useEffect(() => {
        const apiKey = localStorage.getItem('gemini_api_key') || "AIzaSyDtmaA4fpRwigLfQbjMhb3IX5bVC_gYCTA";
        if (apiKey && apiKey !== 'your_api_key_here') {
            setGenAI(new GoogleGenerativeAI(apiKey));
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [quizState]);

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
                await generateQuiz(text);
            } catch (error) {
                console.error("Error extracting PDF:", error);
                alert("Failed to extract text from PDF");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const generateQuiz = async (text: string) => {
        if (!genAI) return;
        setIsLoading(true);
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Generate 10 multiple-choice quiz questions from this text. Return ONLY a JSON array of objects with: question (string), options (array of 4 strings), correctAnswer (0-3 index), explanation (string). Text: ${text.substring(0, 20000)}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const jsonString = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
            const questions = JSON.parse(jsonString);

            setQuizState({
                questions,
                currentIndex: 0,
                selectedAnswer: null,
                isAnswered: false,
                score: 0
            });
        } catch (error) {
            console.error("Error generating quiz:", error);
            alert("Failed to generate quiz");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerSelect = (index: number) => {
        if (!quizState || quizState.isAnswered) return;
        setQuizState(prev => prev ? { ...prev, selectedAnswer: index } : null);
    };

    const handleSubmitAnswer = () => {
        if (!quizState || quizState.selectedAnswer === null) return;

        const isCorrect = quizState.selectedAnswer === quizState.questions[quizState.currentIndex].correctAnswer;

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
        if (!quizState) return;

        if (quizState.currentIndex < quizState.questions.length - 1) {
            setQuizState(prev => prev ? {
                ...prev,
                currentIndex: prev.currentIndex + 1,
                selectedAnswer: null,
                isAnswered: false
            } : null);
        } else {
            // Quiz complete
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    };

    const resetQuiz = () => {
        setFile(null);
        setPdfText("");
        setQuizState(null);
    };

    const currentQuestion = quizState?.questions[quizState.currentIndex];
    const isQuizComplete = quizState && quizState.currentIndex === quizState.questions.length - 1 && quizState.isAnswered;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md h-[90vh] bg-[#121212] border-zinc-800 text-white flex flex-col p-0 gap-0">
                {!file ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center space-y-6 max-w-sm">
                            <div
                                className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
                                <Upload className="w-16 h-16 text-zinc-500 mb-4" />
                                <p className="font-medium text-xl text-white">Upload PDF</p>
                                <p className="text-sm text-zinc-400 mt-2">
                                    Start your AI quiz journey
                                </p>
                            </div>
                            {isLoading && (
                                <div className="flex items-center justify-center gap-2 text-purple-400">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Generating quiz...</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Progress Bar & Score */}
                        {quizState && (
                            <div className="bg-[#1a1a1a] border-b border-zinc-800">
                                {/* Neon Progress Bar */}
                                <div className="h-1 bg-zinc-900 relative overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((quizState.currentIndex + 1) / quizState.questions.length) * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>

                                {/* Header Info */}
                                <div className="px-6 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-purple-400" />
                                        <span className="text-sm font-medium text-zinc-400">
                                            Question {quizState.currentIndex + 1}/{quizState.questions.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1.5 rounded-full border border-purple-500/30">
                                        <Sparkles className="w-4 h-4 text-purple-400" />
                                        <span className="text-sm font-bold text-purple-300">
                                            Score: {quizState.score}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Area */}
                        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
                            {isQuizComplete ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-12 text-center space-y-6"
                                >
                                    <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center border-4 border-purple-500">
                                        <span className="text-4xl font-bold text-purple-400">
                                            {Math.round((quizState.score / quizState.questions.length) * 100)}%
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
                                        <p className="text-zinc-400">
                                            You scored {quizState.score} out of {quizState.questions.length}
                                        </p>
                                    </div>
                                    <Button onClick={resetQuiz} className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8">
                                        Start New Quiz
                                    </Button>
                                </motion.div>
                            ) : currentQuestion && (
                                <div className="space-y-6">
                                    {/* AI Question Bubble (Left) */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex justify-start"
                                    >
                                        <div className="max-w-[85%] bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 backdrop-blur-xl p-5 rounded-3xl rounded-tl-md border border-zinc-700/50 shadow-2xl">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                                </div>
                                                <span className="text-xs font-medium text-purple-400">AI Quiz</span>
                                            </div>
                                            <p className="text-base leading-relaxed text-white">
                                                {currentQuestion.question}
                                            </p>
                                        </div>
                                    </motion.div>

                                    {/* Answer Feedback (if answered) */}
                                    {quizState.isAnswered && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex justify-start"
                                        >
                                            <div className={`max-w-[85%] p-4 rounded-2xl rounded-tl-md ${quizState.selectedAnswer === currentQuestion.correctAnswer
                                                    ? 'bg-green-500/20 border border-green-500/30'
                                                    : 'bg-red-500/20 border border-red-500/30'
                                                }`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    {quizState.selectedAnswer === currentQuestion.correctAnswer ? (
                                                        <Check className="w-5 h-5 text-green-400" />
                                                    ) : (
                                                        <X className="w-5 h-5 text-red-400" />
                                                    )}
                                                    <span className={`text-sm font-semibold ${quizState.selectedAnswer === currentQuestion.correctAnswer
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                        }`}>
                                                        {quizState.selectedAnswer === currentQuestion.correctAnswer ? 'Correct!' : 'Incorrect'}
                                                    </span>
                                                </div>
                                                {currentQuestion.explanation && (
                                                    <p className="text-sm text-zinc-300">{currentQuestion.explanation}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>

                        {/* Answer Buttons (Bottom) */}
                        {currentQuestion && !isQuizComplete && (
                            <div className="bg-[#1a1a1a] border-t border-zinc-800 p-6 space-y-3">
                                {currentQuestion.options.map((option, index) => {
                                    const isSelected = quizState.selectedAnswer === index;
                                    const isCorrect = index === currentQuestion.correctAnswer;
                                    const showResult = quizState.isAnswered;

                                    return (
                                        <motion.button
                                            key={index}
                                            onClick={() => handleAnswerSelect(index)}
                                            disabled={quizState.isAnswered}
                                            whileHover={{ scale: quizState.isAnswered ? 1 : 1.02 }}
                                            whileTap={{ scale: quizState.isAnswered ? 1 : 0.98 }}
                                            className={`w-full px-6 py-4 rounded-full text-left transition-all flex items-center justify-between ${showResult
                                                    ? isCorrect
                                                        ? 'bg-green-500/20 border-2 border-green-500 text-green-300'
                                                        : isSelected
                                                            ? 'bg-red-500/20 border-2 border-red-500 text-red-300'
                                                            : 'bg-zinc-800/50 border border-zinc-700 text-zinc-400'
                                                    : isSelected
                                                        ? 'bg-purple-600 border-2 border-purple-400 text-white shadow-lg shadow-purple-500/30'
                                                        : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-purple-500/50'
                                                }`}
                                        >
                                            <span className="font-medium">{option}</span>
                                            {showResult && isCorrect && <Check className="w-5 h-5" />}
                                            {showResult && isSelected && !isCorrect && <X className="w-5 h-5" />}
                                        </motion.button>
                                    );
                                })}

                                {/* Submit/Next Button */}
                                <Button
                                    onClick={quizState.isAnswered ? handleNextQuestion : handleSubmitAnswer}
                                    disabled={quizState.selectedAnswer === null}
                                    className="w-full h-14 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-full text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                                >
                                    {quizState.isAnswered ? (
                                        <>
                                            {quizState.currentIndex === quizState.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </>
                                    ) : (
                                        'Submit Answer'
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
