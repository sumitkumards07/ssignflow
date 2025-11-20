import React from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Moon, Sun, Monitor, Info } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-center py-4">
          <div className="rounded-full bg-secondary px-6 py-2">
            <h1 className="text-sm font-bold tracking-wide uppercase">Settings</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-8 px-4 pt-8">
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Appearance</h2>
          
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            {/* Light Mode */}
            <div 
              className="flex items-center justify-between border-b border-border p-5 transition-colors hover:bg-secondary/30 cursor-pointer"
              onClick={() => setTheme('light')}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400">
                  <Sun className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Light Mode</span>
                  <span className="text-xs text-muted-foreground">Clean and bright</span>
                </div>
              </div>
              <div className="pointer-events-none">
                <Switch checked={theme === 'light'} />
              </div>
            </div>

            {/* Dark Mode */}
            <div 
              className="flex items-center justify-between border-b border-border p-5 transition-colors hover:bg-secondary/30 cursor-pointer"
              onClick={() => setTheme('dark')}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <Moon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Dark Mode</span>
                  <span className="text-xs text-muted-foreground">Easy on the eyes</span>
                </div>
              </div>
               <div className="pointer-events-none">
                <Switch checked={theme === 'dark'} />
              </div>
            </div>
            
            {/* System */}
            <div 
              className="flex items-center justify-between p-5 transition-colors hover:bg-secondary/30 cursor-pointer"
              onClick={() => setTheme('system')}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400">
                  <Monitor className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">System</span>
                  <span className="text-xs text-muted-foreground">Follow device settings</span>
                </div>
              </div>
               <div className="pointer-events-none">
                <Switch checked={theme === 'system'} />
              </div>
            </div>
          </div>
        </section>
        
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">About</h2>
           <div className="overflow-hidden rounded-3xl border border-border bg-card">
             <div className="flex w-full items-center justify-between p-5">
               <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                    <Info className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-sm">Version</span>
               </div>
               <span className="text-sm font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">v1.0.0</span>
             </div>
           </div>
        </section>
      </main>

      <BottomNav onAddClick={() => window.location.href = "/"} />
    </div>
  );
}
