import React from "react";
import { Link, useLocation } from "wouter";
import { ListTodo, Timer, BrainCircuit, Plus, CalendarClock, Calendar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ onAddClick }: { onAddClick?: () => void }) {
  const [location] = useLocation();

  const navItems = [
    { icon: ListTodo, label: "Todo", path: "/todo" },
    { icon: Timer, label: "Pomodoro", path: "/pomodoro" },
    { icon: BrainCircuit, label: "AI Quiz", path: "/ai-quiz" },
    { icon: Plus, label: "Add", path: "#", action: onAddClick, highlight: true },
    { icon: CalendarClock, label: "Assignment", path: "/upcoming" },
    { icon: Calendar, label: "Analytics", path: "/analytics" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl pb-safe">
      <div className="mx-auto max-w-md flex h-20 items-center justify-around px-0.5">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;

          // Smaller Elevated Add Button
          if (item.highlight) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center justify-center -mt-4 px-2"
                data-testid="nav-add"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95 hover:scale-105">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="mt-0.5 text-[8px] font-medium text-muted-foreground">{item.label}</span>
              </button>
            );
          }

          // Regular nav items
          return (
            <Link key={item.label} href={item.path || "/"}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-w-[46px] py-2 transition-colors cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={cn("h-4.5 w-4.5", isActive && "fill-current/20")} />
                <span className="text-[8px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

