import React from "react";
import { Link, useLocation } from "wouter";
import { ListTodo, Timer, BrainCircuit, Plus, CalendarClock, Calendar, Settings, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { icon: ListTodo, label: "Todo", path: "/todo" },
    { icon: Timer, label: "Pomodoro", path: "/pomodoro" },
    { icon: BookOpen, label: "Study", path: "/study" },
    { icon: Calendar, label: "Analytics", path: "/analytics" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
      <div className="mx-auto max-w-md flex h-20 items-center justify-around px-0.5">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;



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
                <Icon className={cn("h-7 w-7", isActive && "fill-current/20")} />
                <span className="text-[8px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

