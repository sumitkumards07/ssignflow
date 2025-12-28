import { Link, useLocation } from "wouter";
import { ListTodo, Timer, BrainCircuit, Calendar, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export function BottomNav() {
  const [location] = useLocation();

  const handleNavClick = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Ignore haptics error on web
    }
  };

  const navItems = [
    { icon: ListTodo, label: "Todo", path: "/todo" },
    { icon: Timer, label: "Pomodoro", path: "/pomodoro" },
    { icon: Sparkles, label: "AI", path: "/study", highlight: true },
    { icon: Calendar, label: "Analytics", path: "/analytics" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-background/80 dark:bg-zinc-900/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
      <div className="mx-auto max-w-md flex h-[4rem] items-start pt-2 justify-around px-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const isHighlight = item.highlight;

          return (
            <Link key={item.label} href={item.path || "/"}>
              <div
                onClick={handleNavClick}
                onMouseEnter={() => {
                  if (item.path === "/analytics") {
                    import("@/lib/queryClient").then(({ queryClient, apiRequest }) => {
                      queryClient.prefetchQuery({
                        queryKey: ["leaderboard"],
                        queryFn: async () => {
                          const res = await apiRequest("GET", "/api/analytics/leaderboard");
                          return res.json();
                        },
                        staleTime: 1000 * 60 * 5
                      });
                    });
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-w-[48px] cursor-pointer",
                  isActive ? "text-primary dark:text-white" : "text-zinc-500",
                  isHighlight && "relative -top-3"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {isHighlight ? (
                  <div className={cn(
                    "relative p-3 rounded-full",
                    isActive
                      ? "bg-gradient-to-br from-orange-500 to-amber-600 shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                      : "bg-gradient-to-br from-zinc-800 to-zinc-700 border border-white/10"
                  )}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                ) : (
                  <>
                    <div className={cn("relative p-1 rounded-xl", isActive && "bg-primary/10 dark:bg-white/5")}>
                      <Icon className={cn(
                        "h-6 w-6",
                        isActive ? "fill-primary dark:fill-white text-primary dark:text-white" : "stroke-[1.5px]"
                      )} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-primary dark:text-white" : "text-zinc-600 dark:text-zinc-500"
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

