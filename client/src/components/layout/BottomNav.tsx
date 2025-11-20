import React from "react";
import { Link, useLocation } from "wouter";
import { CalendarClock, CheckCircle2, LayoutList, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ onAddClick }: { onAddClick: () => void }) {
  const [location] = useLocation();

  const navItems = [
    { icon: CalendarClock, label: "Upcoming", path: "/" },
    { icon: LayoutList, label: "Quiz", path: "/quiz" },
    { icon: Plus, label: "Add", path: "#", action: onAddClick, highlight: true },
    { icon: CheckCircle2, label: "Completed", path: "/completed" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-background/80 backdrop-blur-xl pb-safe">
      <div className="mx-auto max-w-md flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          if (item.highlight) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center justify-center -mt-6"
                data-testid="nav-add"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground">{item.label}</span>
              </button>
            );
          }

          return (
            <Link key={item.label} href={item.path}>
              <div 
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={cn("h-5 w-5", isActive && "fill-current/20")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
