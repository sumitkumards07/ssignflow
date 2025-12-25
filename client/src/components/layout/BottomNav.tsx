import { Link, useLocation } from "wouter";
import { ListTodo, Timer, BrainCircuit, Calendar, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { icon: ListTodo, label: "Todo", path: "/todo" },
    { icon: Timer, label: "Pomodoro", path: "/pomodoro" },
    { icon: Sparkles, label: "AI", path: "/study", highlight: true },
    { icon: Calendar, label: "Analytics", path: "/analytics" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
      <div className="mx-auto max-w-md flex h-20 items-center justify-around px-0.5">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const isHighlight = item.highlight;

          return (
            <Link key={item.label} href={item.path || "/"}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-w-[46px] py-2 transition-all cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70",
                  isHighlight && !isActive && "relative"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {isHighlight ? (
                  <div className={cn(
                    "relative p-2 rounded-xl transition-all",
                    isActive
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                      : "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
                  )}>
                    <Icon className="h-6 w-6" />
                    {!isActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
                    )}
                  </div>
                ) : (
                  <Icon className={cn("h-7 w-7", isActive && "fill-current/20")} />
                )}
                <span className={cn(
                  "text-[8px] font-medium",
                  isHighlight && isActive && "text-purple-500 font-bold"
                )}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
