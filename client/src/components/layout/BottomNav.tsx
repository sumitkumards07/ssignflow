import React from "react";
import { Link, useLocation } from "wouter";
import { CalendarClock, CheckCircle2, LayoutList, Plus, Settings, ListTodo, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuizGenerator } from "@/components/QuizGenerator";

export function BottomNav({ onAddClick }: { onAddClick: () => void }) {
  const [location] = useLocation();

  const navItems = [
    { icon: CalendarClock, label: "Upcoming", path: "/" },
    { icon: BrainCircuit, label: "AI Quiz", isQuiz: true },
    { icon: Plus, label: "Add", path: "#", action: onAddClick, highlight: true },
    { icon: ListTodo, label: "To-Do", path: "/todo" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl pb-safe">
      <div className="mx-auto max-w-md flex h-20 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center justify-center -mt-7"
                data-testid="nav-add"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95 hover:scale-105">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground">{item.label}</span>
              </button>
            );
          }

          if (item.isQuiz) {
            return (
              <QuizGenerator
                key={item.label}
                trigger={
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 w-20 py-2 transition-colors cursor-pointer text-muted-foreground hover:text-primary/70"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </div>
                }
              />
            );
          }

          return (
            <Link key={item.label} href={item.path}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 w-20 py-2 transition-colors cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={cn("h-6 w-6", isActive && "fill-current/20")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
