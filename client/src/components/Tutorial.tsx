import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, ListTodo, BrainCircuit, BarChart2, Bell } from "lucide-react";

export function Tutorial() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const seen = localStorage.getItem("tutorial_seen");
        const user = localStorage.getItem("user");
        if (user && !seen) {
            setOpen(true);
        }
    }, []);

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setOpen(false);
        localStorage.setItem("tutorial_seen", "true");
    };

    const steps = [
        {
            title: "Welcome to AssignFlow!",
            description: "Your ultimate productivity companion. Let's take a quick tour.",
            icon: <CheckCircle className="w-12 h-12 text-primary" />
        },
        {
            title: "Manage Tasks",
            description: "Create, organize, and track your daily tasks in the Todo section.",
            icon: <ListTodo className="w-12 h-12 text-blue-500" />
        },
        {
            title: "AI Study Assistant",
            description: "Get help with homework, generate notes, and solve problems using AI.",
            icon: <BrainCircuit className="w-12 h-12 text-purple-500" />
        },
        {
            title: "Focus & Analytics",
            description: "Use the Pomodoro timer to stay focused and track your progress in Analytics.",
            icon: <BarChart2 className="w-12 h-12 text-green-500" />
        },
        {
            title: "Stay Updated",
            description: "Enable notifications to never miss a deadline or app update.",
            icon: <Bell className="w-12 h-12 text-orange-500" />
        }
    ];

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex justify-center mb-4">
                        {steps[step].icon}
                    </div>
                    <DialogTitle className="text-center text-xl">{steps[step].title}</DialogTitle>
                    <DialogDescription className="text-center text-base mt-2">
                        {steps[step].description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:justify-center gap-2 mt-4">
                    <div className="flex justify-center gap-1 mb-4">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-primary" : "bg-muted"}`}
                            />
                        ))}
                    </div>
                    <Button onClick={handleNext} className="w-full">
                        {step === steps.length - 1 ? "Get Started" : "Next"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
