import React from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Moon, Sun, Monitor, Info, Linkedin, ExternalLink, Bell, BrainCircuit } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Notifications</h2>
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-500 dark:bg-pink-500/20 dark:text-pink-400">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Alarm Sound</span>
                  <span className="text-xs text-muted-foreground">Select notification sound</span>
                </div>
              </div>
              <Select
                defaultValue={localStorage.getItem('alarm_sound') || 'default'}
                onValueChange={(val) => {
                  localStorage.setItem('alarm_sound', val);
                  if (val !== 'default') {
                    const audio = new Audio(`/sounds/${val}.mp3`);
                    audio.play().catch(e => console.error("Error playing sound:", e));
                  }
                }}
              >
                <SelectTrigger className="w-[140px] bg-secondary/50 border-0">
                  <SelectValue placeholder="Select sound" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="chime">Chime</SelectItem>
                  <SelectItem value="melody">Melody</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">AI Configuration</h2>
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="flex flex-col gap-4 p-5 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Gemini API Key</span>
                  <span className="text-xs text-muted-foreground">Required for Quiz Generator</span>
                </div>
              </div>
              <Input
                type="password"
                placeholder="Paste your API Key here"
                defaultValue={localStorage.getItem('gemini_api_key') || "AIzaSyBpZ6OWhP2YLl871NRbx_zfWv5c1I642QQ"}
                onChange={(e) => localStorage.setItem('gemini_api_key', e.target.value)}
                className="bg-secondary/50 border-0"
              />
              <p className="text-[10px] text-muted-foreground">
                Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline text-primary">Google AI Studio</a>
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">About</h2>
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="flex w-full items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <Info className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm">Version</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">v1.0.0</span>
            </div>

            <a
              href="https://www.linkedin.com/in/sumit-kumar-9159a636b"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between p-5 transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  <Linkedin className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Developer</span>
                  <span className="text-xs text-muted-foreground">Sumit Kumar</span>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </section>
      </main>

      <BottomNav onAddClick={() => window.location.href = "/"} />
    </div>
  );
}
