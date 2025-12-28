import React, { useState, useRef, useEffect } from "react";

import { Upload, FileText, Check, X, Loader2, BrainCircuit, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Question {
    question: string;
    options: string[];
    correctAnswer: number;
}

export function QuizGenerator({ trigger }: { trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [quiz, setQuiz] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [showScore, setShowScore] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isAnswerChecked, setIsAnswerChecked] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

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



    const generateQuiz = async () => {
        if (!file) return;

        setIsLoading(true);
        try {
            // 1. Extract Text
            const text = await extractTextFromPDF(file);

            if (!text || text.length < 50) {
                throw new Error("Not enough text found in PDF");
            }

            // 2. Call Server API
            const prompt = `
        Generate a quiz with 5 multiple-choice questions based on the following text.
        Return the result ONLY as a JSON array of objects.
        Do not wrap the response in markdown code blocks.
        Each object should have:
        - "question": string
        - "options": array of 4 strings
        - "correctAnswer": integer (index of the correct option, 0-3)

        Text:
        ${text.substring(0, 30000)}
      `;

            const res = await apiRequest("POST", "/api/ai/generate", { prompt });

            // Check if response is valid
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to generate quiz");
            }

            const data = await res.json();

            // Clean up potentially wrapped JSON (just in case the server/AI wraps it despite instructions)
            const cleanText = data.text.replace(/```json/g, "").replace(/```/g, "").trim();

            let generatedQuiz;
            try {
                generatedQuiz = JSON.parse(cleanText);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                console.log("Raw text:", cleanText);
                throw new Error("Failed to parse quiz data from AI response");
            }

            // Validate quiz structure
            if (!Array.isArray(generatedQuiz) || generatedQuiz.length === 0) {
                throw new Error("AI returned invalid quiz format");
            }

            setQuiz(generatedQuiz);
            setCurrentQuestion(0);
            setScore(0);
            setShowScore(false);
            setSelectedAnswer(null);
            setIsAnswerChecked(false);
        } catch (error) {
            console.error("Error generating quiz:", error);
            alert(error instanceof Error ? error.message : "Failed to generate quiz");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerSelect = (index: number) => {
        if (isAnswerChecked) return;
        setSelectedAnswer(index);
    };

    const checkAnswer = () => {
        if (selectedAnswer === null) return;

        setIsAnswerChecked(true);
        if (selectedAnswer === quiz[currentQuestion].correctAnswer) {
            setScore(prev => prev + 1);
            confetti({
                particleCount: 30,
                spread: 50,
                origin: { y: 0.7 },
                colors: ['#4ADE80', '#22C55E']
            });
        }
    };

    const nextQuestion = () => {
        if (currentQuestion < quiz.length - 1) {
            setCurrentQuestion(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswerChecked(false);
        } else {
            setShowScore(true);
            if (score + (selectedAnswer === quiz[currentQuestion].correctAnswer ? 1 : 0) === quiz.length) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }
    };

    const resetQuiz = () => {
        setFile(null);
        setQuiz([]);
        setCurrentQuestion(0);
        setScore(0);
        setShowScore(false);
        setSelectedAnswer(null);
        setIsAnswerChecked(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl bg-secondary border-0 hover:bg-secondary/80 text-primary"
                    >
                        <BrainCircuit className="w-5 h-5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <BrainCircuit className="w-6 h-6 text-primary" />
                        AI Quiz Generator
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    {quiz.length === 0 ? (
                        <div
                            className="space-y-6"
                        >
                            <div
                                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/30 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".pdf"
                                    className="hidden"
                                />
                                {file ? (
                                    <>
                                        <FileText className="w-12 h-12 text-primary mb-4" />
                                        <p className="font-medium text-lg">{file.name}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                                        <p className="font-medium text-lg">Upload PDF</p>
                                        <p className="text-sm text-muted-foreground mt-1">Generate a quiz from your documents</p>
                                    </>
                                )}
                            </div>

                            <Button
                                onClick={generateQuiz}
                                disabled={!file || isLoading}
                                className="w-full h-12 text-lg rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Generating Quiz...
                                    </>
                                ) : (
                                    "Generate Quiz"
                                )}
                            </Button>
                        </div>
                    ) : showScore ? (
                        <div
                            className="flex flex-col items-center justify-center py-8 text-center space-y-6"
                        >
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full border-8 border-secondary flex items-center justify-center">
                                    <span className="text-4xl font-bold">{Math.round((score / quiz.length) * 100)}%</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Quiz Completed!</h3>
                                <p className="text-muted-foreground">You got {score} out of {quiz.length} questions correct.</p>
                            </div>
                            <Button onClick={resetQuiz} className="w-full rounded-xl" variant="outline">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Start New Quiz
                            </Button>
                        </div>
                    ) : (
                        <div
                            key={currentQuestion}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Question {currentQuestion + 1}/{quiz.length}</span>
                                <span>Score: {score}</span>
                            </div>
                            <Progress value={((currentQuestion + 1) / quiz.length) * 100} className="h-2" />

                            <h3 className="text-lg font-semibold leading-relaxed">
                                {quiz[currentQuestion].question}
                            </h3>

                            <div className="space-y-3">
                                {quiz[currentQuestion].options.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswerSelect(index)}
                                        disabled={isAnswerChecked}
                                        className={cn(
                                            "w-full p-4 rounded-xl text-left transition-all border-2",
                                            isAnswerChecked
                                                ? index === quiz[currentQuestion].correctAnswer
                                                    ? "bg-green-500/10 border-green-500 text-green-500"
                                                    : index === selectedAnswer
                                                        ? "bg-red-500/10 border-red-500 text-red-500"
                                                        : "border-border opacity-50"
                                                : selectedAnswer === index
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/50 hover:bg-secondary/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{option}</span>
                                            {isAnswerChecked && index === quiz[currentQuestion].correctAnswer && (
                                                <Check className="w-5 h-5 text-green-500" />
                                            )}
                                            {isAnswerChecked && index === selectedAnswer && index !== quiz[currentQuestion].correctAnswer && (
                                                <X className="w-5 h-5 text-red-500" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <Button
                                onClick={isAnswerChecked ? nextQuestion : checkAnswer}
                                disabled={selectedAnswer === null}
                                className="w-full h-12 rounded-xl text-lg"
                            >
                                {isAnswerChecked ? (currentQuestion === quiz.length - 1 ? "Finish Quiz" : "Next Question") : "Check Answer"}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
