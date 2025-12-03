import React from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Moon, Sun, Monitor, Info, Linkedin, ExternalLink, Bell, BrainCircuit, LogOut, User, MessageSquare, Volume2, Palette, Play, Shield } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useThemeColor, themeColors } from "@/components/theme-color-provider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { alarmSounds, previewAlarm, getSelectedAlarm, setAlarmSound, setSoundsEnabled, areSoundsEnabled } from "@/lib/sounds";
import { backupData, restoreData } from "@/lib/backup";
import { Database, Download, Upload as UploadIcon } from "lucide-react";
import { registerPlugin } from '@capacitor/core';

const UpdatePlugin = registerPlugin<any>('UpdatePlugin');

const colorThemes = [
  { id: "orange", name: "Orange Flame", color: "#ff6b35", description: "Warm and energetic" },
  { id: "purple", name: "Purple Dream", color: "#a855f7", description: "Creative and modern" },
  { id: "blue", name: "Ocean Blue", color: "#3b82f6", description: "Calm and focused" },
  { id: "green", name: "Forest Green", color: "#10b981", description: "Fresh and natural" },
  { id: "rose", name: "Rose Pink", color: "#f43f5e", description: "Vibrant and bold" },
  { id: "teal", name: "Teal Mint", color: "#14b8a6", description: "Cool and balanced" }
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { themeColor, setThemeColor } = useThemeColor();
  const { toast } = useToast();
  const [user, setUser] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (e) {
      return {};
    }
  });
  const [selectedAlarm, setSelectedAlarm] = React.useState(getSelectedAlarm());
  const [soundsEnabled, setSounds] = React.useState(areSoundsEnabled());

  const handleUserChange = (key: string, value: string) => {
    const newUser = { ...user, [key]: value };
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const handleAlarmChange = (alarmId: string) => {
    setAlarmSound(alarmId);
    setSelectedAlarm(alarmId);
  };

  const handleSoundsToggle = (enabled: boolean) => {
    setSoundsEnabled(enabled);
    setSounds(enabled);
    toast({
      title: enabled ? "Sounds Enabled" : "Sounds Disabled",
      description: enabled ? "You'll hear sound effects" : "Sound effects are muted"
    });
  };

  const handleThemeColorChange = (colorId: string) => {
    setThemeColor(colorId as keyof typeof themeColors);
    toast({
      title: "Theme Updated",
      description: `Switched to ${colorThemes.find(t => t.id === colorId)?.name}`
    });
  };

  const checkForUpdates = async () => {
    try {
      const { apiRequest } = await import("@/lib/queryClient");
      const res = await apiRequest("GET", "/api/updates");
      const data = await res.json();

      // Current version code (should match build.gradle)
      const currentVersionCode = 1;

      if (data.versionCode > currentVersionCode) {
        toast({
          title: "Update Available",
          description: `Version ${data.versionName} is available.`,
          action: <Button size="sm" onClick={() => UpdatePlugin.startUpdate({ apkUrl: data.apkUrl })}>Update</Button>
        });
      } else {
        toast({ title: "Up to Date", description: "You are on the latest version." });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to check for updates", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 pt-safe">
        <div className="flex items-center justify-center py-4">
          <div className="rounded-full bg-secondary px-6 py-2">
            <h1 className="text-sm font-bold tracking-wide uppercase">Settings</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-8 px-4 pt-8">
        {/* Theme Color Selection */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Theme Color</h2>
          <Card>
            <CardContent className="p-4">
              <Select value={themeColor} onValueChange={(val) => handleThemeColorChange(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Theme Color" />
                </SelectTrigger>
                <SelectContent>
                  {colorThemes.map((colorTheme) => (
                    <SelectItem key={colorTheme.id} value={colorTheme.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorTheme.color }} />
                        {colorTheme.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Appearance</h2>
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <Moon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Dark Mode</span>
                  <span className="text-xs text-muted-foreground">Easy on the eyes</span>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Sounds</h2>

          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            {/* Sound Effects Toggle */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-500 dark:bg-green-500/20 dark:text-green-400">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Sound Effects</span>
                  <span className="text-xs text-muted-foreground">Enable app sounds</span>
                </div>
              </div>
              <Switch checked={soundsEnabled} onCheckedChange={handleSoundsToggle} />
            </div>

            {/* Alarm Sound Selection */}
            <div className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-500 dark:bg-pink-500/20 dark:text-pink-400">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Alarm Sound</span>
                  <span className="text-xs text-muted-foreground">Choose your wake-up sound</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedAlarm} onValueChange={(val) => handleAlarmChange(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Alarm Sound" />
                  </SelectTrigger>
                  <SelectContent>
                    {alarmSounds.map((alarm) => (
                      <SelectItem key={alarm.id} value={alarm.id}>
                        {alarm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => previewAlarm(selectedAlarm)}
                  title="Preview Sound"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6 pb-24">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-primary/10">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-lg bg-primary/5 text-primary">
                      {user?.displayName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-medium text-lg">{user?.displayName || "User"}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email || "No email"}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary capitalize">
                      {user?.role || "user"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 pt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      defaultValue={user?.displayName}
                      onChange={(e) => handleUserChange("displayName", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="avatar">Avatar URL</Label>
                    <Input
                      id="avatar"
                      defaultValue={user?.avatar}
                      placeholder="https://..."
                      onChange={(e) => handleUserChange("avatar", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Admin Dashboard Link - Only visible to admins */}
          {user?.role === "admin" && (
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Administration</h2>
              <div className="overflow-hidden rounded-3xl border border-border bg-card">
                <a
                  href="/admin"
                  className="flex w-full items-center justify-between p-5 transition-colors hover:bg-secondary/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">Admin Dashboard</span>
                      <span className="text-xs text-muted-foreground">Manage users and view stats</span>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </section>
          )}
        </div>



        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Data Management</h2>
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="flex flex-col gap-4 p-5 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400">
                  <Database className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Backup & Restore</span>
                  <span className="text-xs text-muted-foreground">Save data to device storage</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => backupData()} className="w-full">
                  <UploadIcon className="w-4 h-4 mr-2" />
                  Backup
                </Button>
                <Button variant="outline" onClick={() => restoreData()} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Restore
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Backup saves your data to the Documents folder. Restore loads it back.
              </p>
              {localStorage.getItem('last_backup_time') && (
                <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                  Last backup: {new Date(localStorage.getItem('last_backup_time')!).toLocaleString()}
                </p>
              )}
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

            <div className="p-5 border-b border-border">
              <Button variant="outline" className="w-full" onClick={checkForUpdates}>
                Check for Updates
              </Button>
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

        <div className="pt-4 pb-8">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              localStorage.removeItem("user");
              localStorage.setItem("logged_out", "true");
              window.location.href = "/login";
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
