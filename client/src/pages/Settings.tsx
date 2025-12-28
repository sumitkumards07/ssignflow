import React, { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Moon, Sun, Monitor, Info, Linkedin, ExternalLink, Bell, BrainCircuit, LogOut, User, MessageSquare, Volume2, Palette, Play, Shield, Crown, Flame, ChevronRight, Upload as UploadIcon, Download, Vibrate, Check, X, Camera, Music, Code, Heart, Coffee, RefreshCw } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useThemeColor, themeColors } from "@/components/theme-color-provider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { alarmSounds, getSelectedAlarm, setAlarmSound, setSoundsEnabled, areSoundsEnabled } from "@/lib/sounds";
import { backupData, restoreData } from "@/lib/backup";
import { registerPlugin } from '@capacitor/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

const UpdatePlugin = registerPlugin<any>('UpdatePlugin');

// --- Types & Constants ---
const colorThemes = [
  { id: "orange", name: "Safety Orange", color: "#FF9500", description: "Focus flagship" },
  { id: "blue", name: "System Blue", color: "#007AFF", description: "Analytics professional" },
  { id: "green", name: "Success Green", color: "#34C759", description: "Mission accomplished" },
  { id: "red", name: "Destructive Red", color: "#FF3B30", description: "Stop / Warnings" },
  { id: "indigo", name: "Intel Indigo", color: "#5856D6", description: "Neutral / Settings" },
  { id: "yellow", name: "Warning Gold", color: "#FFCC00", description: "Level Alerts" },
  { id: "purple", name: "Epic Purple", color: "#AF52DE", description: "Elite items" },
  { id: "magenta", name: "Mythic Magenta", color: "#FF2D55", description: "Legendary/Mythic" },
  { id: "mint", name: "Cyber Mint", color: "#00D1FF", description: "Rare tactical" },
  { id: "gray", name: "Obsidian Gray", color: "#1C1C1E", description: "Common neutrality" },
  { id: "teal", name: "Prismatic Teal", color: "#30B0C7", description: "Seasonal milestones" },
  { id: "rose", name: "Lava Rose", color: "#FF5E3A", description: "Hardcore mode" },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { themeColor, setThemeColor } = useThemeColor();
  const { toast } = useToast();

  // State
  const [user, setUser] = React.useState(JSON.parse(localStorage.getItem("user") || "{}"));
  const [selectedAlarm, setSelectedAlarm] = React.useState(getSelectedAlarm());
  const [soundsEnabled, setSounds] = React.useState(areSoundsEnabled());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newName, setNewName] = useState(user.displayName || "");
  const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false);
  const [isAppearanceSheetOpen, setIsAppearanceSheetOpen] = useState(false);
  const [isSoundSheetOpen, setIsSoundSheetOpen] = useState(false);

  // --- Handlers ---

  const handleSaveProfile = async () => {
    if (!newName.trim()) return;

    // Optimistic update
    const updatedUser = { ...user, displayName: newName };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));

    // Sync to server (Fire & Forget)
    try {
      const { apiRequest } = await import("@/lib/queryClient");
      await apiRequest("PATCH", "/api/auth/me", { displayName: newName });
    } catch (e) { console.error(e) }

    setIsEditingProfile(false);
    toast({ title: "Profile Updated", description: "Your name has been changed." });
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
    setIsThemeSheetOpen(false);
  };

  const handleAlarmSelect = (soundId: string) => {
    setAlarmSound(soundId);
    setSelectedAlarm(soundId);

    // Preview
    const audio = new Audio(`/sounds/${soundId}.mp3`);
    audio.play().catch(e => console.error(e));
  };


  const CandyIcon = ({ icon: Icon, bg }: { icon: any, bg: string }) => (
    <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${bg} shadow-sm`}>
      <Icon className={`w-4 h-4 text-white`} />
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider pl-4 mb-2 mt-6">
      {children}
    </h3>
  );

  const SettingsRow = ({
    icon: Icon,
    bg,
    label,
    value,
    onClick,
    isDestructive = false
  }: { icon: any, bg: string, label: string, value?: string | React.ReactNode, onClick?: () => void, isDestructive?: boolean }) => (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4 ${onClick ? 'cursor-pointer active:bg-secondary/50' : ''} transition-colors border-b border-border/40 last:border-0`}
    >
      <div className="flex items-center gap-3">
        <CandyIcon icon={Icon} bg={bg} />
        <span className={`text-[16px] font-medium ${isDestructive ? 'text-red-500' : 'text-foreground'}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {typeof value === 'string' ? (
          <span className="text-[15px] text-muted-foreground">{value}</span>
        ) : value}
        {onClick && <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-[calc(6rem+env(safe-area-inset-bottom))] transition-colors duration-300">

      {/* Header */}
      <header className="pt-14 px-5 pb-4 bg-background/80 backdrop-blur-md sticky top-0 z-10 hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </header>
      {/* Mobile Header (Manual Padding) */}
      <div className="h-14 md:hidden block"></div>
      <header className="px-5 pb-2 md:hidden block">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </header>

      <main className="mx-auto max-w-lg px-5">

        {/* 1. Profile Hero Card */}
        <div
          onClick={() => setIsEditingProfile(true)}
          className="flex items-center gap-4 py-4 mb-6 cursor-pointer active:opacity-70 transition-opacity"
        >
          <Avatar className="w-[70px] h-[70px] border-2 border-border shadow-sm">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="text-2xl bg-secondary text-primary font-bold">
              {user?.displayName?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-[22px] font-semibold text-foreground truncate leading-tight">
              {user?.displayName || "User"}
            </h2>
            <p className="text-[15px] text-muted-foreground truncate mt-0.5">
              {user?.isPro ? "Pro Member" : "Free Plan"} • {user?.email || "No email"}
            </p>
          </div>
          <div className="bg-secondary p-2 rounded-full">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* 2. Pro Banner */}
        {!user?.isPro && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-[1px] shadow-lg mb-8">
            <div className="bg-background rounded-2xl p-4 flex items-center justify-between relative overflow-hidden backdrop-blur-3xl bg-opacity-95">
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-md">
                  <Crown className="w-6 h-6 text-black fill-white" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">AssignFlow <span className="text-amber-500">PRO</span></h3>
                  <p className="text-xs text-muted-foreground">Unlock AI, Stats & Unlimited Habits</p>
                </div>
              </div>
              <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 font-bold rounded-full h-9 px-5">
                Upgrade
              </Button>
            </div>
          </div>
        )}

        {/* 3. Settings Sections */}
        <div className="space-y-6">

          {/* --- GENERAL --- */}
          <section>
            <SectionTitle>General</SectionTitle>
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
              {/* Theme */}
              <SettingsRow
                icon={Palette}
                bg="bg-system-blue"
                label="Appearance"
                value={theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'}
                onClick={() => setIsAppearanceSheetOpen(true)}
              />

              {/* Accent Color */}
              <SettingsRow
                icon={Flame}
                bg="bg-safety-orange"
                label="Accent Color"
                value={
                  <div className="w-5 h-5 rounded-full border border-border/50 shadow-inner" style={{ backgroundColor: colorThemes.find(t => t.id === themeColor)?.color || themeColors[themeColor as keyof typeof themeColors].primary }} />
                }
                onClick={() => setIsThemeSheetOpen(true)}
              />

              {/* Sounds */}
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <CandyIcon icon={Volume2} bg="bg-mythic-magenta" />
                  <span className="text-[16px] font-medium">Sound Effects</span>
                </div>
                <Switch checked={soundsEnabled} onCheckedChange={handleSoundsToggle} />
              </div>

              {/* Alarm Sound */}
              <SettingsRow
                icon={Music}
                bg="bg-intel-indigo"
                label="Alarm Sound"
                value={selectedAlarm.charAt(0).toUpperCase() + selectedAlarm.slice(1)}
                onClick={() => setIsSoundSheetOpen(true)}
              />
            </div>
          </section>

          {/* --- DATA & SECURITY --- */}
          <section>
            <SectionTitle>Data</SectionTitle>
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
              <SettingsRow icon={UploadIcon} bg="bg-cyber-mint" label="Export Data" onClick={() => backupData()} />
              <SettingsRow icon={Download} bg="bg-prismatic-teal" label="Import Data" onClick={() => restoreData()} />
            </div>
          </section>

          {/* --- SUPPORT --- */}
          <section>
            <SectionTitle>Support</SectionTitle>
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
              <SettingsRow icon={MessageSquare} bg="bg-success-green" label="Contact Support" onClick={() => window.open('mailto:support@assignflow.com')} />
              <SettingsRow
                icon={Heart}
                bg="bg-red-500"
                label="Support Development"
                onClick={() => window.open('upi://pay?pa=8950013181@ybl&pn=AssignFlow&cu=INR')}
              />
              <SettingsRow
                icon={Linkedin}
                bg="bg-blue-600"
                label="Developer"
                value="Sumit Kumar"
                onClick={() => window.open('https://www.linkedin.com/in/sumit-kumar-9159a636b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app')}
              />
              <SettingsRow
                icon={RefreshCw}
                bg="bg-cyan-500"
                label="Check for Updates"
                onClick={async () => {
                  toast({ title: "Checking for updates..." });
                  const { updateService } = await import("@/services/UpdateService");
                  try {
                    const info = await updateService.checkForUpdate();
                    if (info?.updateAvailable) {
                      if (confirm(`New version ${info.version} available. Update now?`)) {
                        await updateService.performUpdate(info);
                      }
                    } else {
                      toast({ title: "Up to date", description: "You have the latest version." });
                    }
                  } catch (e) {
                    toast({ title: "Update check failed", variant: "destructive" });
                  }
                }}
              />
              <SettingsRow icon={Info} bg="bg-purple-500" label="Version" value="1.0.30" />
            </div>
          </section>

          {/* --- LOG OUT --- */}
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full h-12 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-200 dark:border-red-900/30 rounded-xl text-[16px]"
              onClick={() => {
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
            >
              Log Out
            </Button>
            <p className="text-center text-muted-foreground/60 text-xs mt-6">
              Made with ❤️ in India
            </p>
          </div>

        </div>
      </main>

      <BottomNav />

      {/* --- DIALOGS & SHEETS --- */}

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your display name visible to others.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name" className="text-right mb-2 block">Display Name</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sound Selection Sheet */}
      <Sheet open={isSoundSheetOpen} onOpenChange={setIsSoundSheetOpen}>
        <SheetContent side="bottom" className="h-[50vh] rounded-t-[2.5rem] border-t border-border/50 pb-safe">
          <SheetHeader className="mb-6">
            <SheetTitle className="apple-header text-xl">Alarm Sound</SheetTitle>
          </SheetHeader>
          <div className="settings-scroll-area space-y-3 pb-8">
            {alarmSounds.map((sound) => (
              <button
                key={sound.id}
                onClick={() => handleAlarmSelect(sound.id)}
                className={`
                            w-full flex items-center justify-between p-4 rounded-2xl border transition-all
                            ${selectedAlarm === sound.id ? 'border-orange-500 bg-orange-500/5' : 'border-border bg-card' /* removed hover to prevent lag */}
                        `}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedAlarm === sound.id ? 'bg-orange-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                    <Play className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-[16px] capitalize text-foreground">{sound.name}</span>
                </div>
                {selectedAlarm === sound.id && <Check className="w-5 h-5 text-orange-500" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Appearance Sheet */}
      <Sheet open={isAppearanceSheetOpen} onOpenChange={setIsAppearanceSheetOpen}>
        <SheetContent side="bottom" className="h-[40vh] rounded-t-[2.5rem] border-t border-border/50 pb-safe">
          <SheetHeader className="mb-6">
            <SheetTitle className="apple-header text-xl">Appearance</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'light', label: 'Light', icon: Sun, bg: 'bg-[#F2F2F7]' },
              { id: 'dark', label: 'Dark', icon: Moon, bg: 'bg-[#1C1C1E]' },
              { id: 'system', label: 'System', icon: Monitor, bg: 'bg-gradient-to-br from-[#F2F2F7] to-[#1C1C1E]' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setTheme(opt.id as any); setIsAppearanceSheetOpen(false); }}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${theme === opt.id ? 'border-orange-500 bg-orange-500/5' : 'border-border bg-card'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${opt.bg} shadow-sm`}>
                  <opt.icon className={`w-6 h-6 ${opt.id === 'light' ? 'text-orange-500' : opt.id === 'dark' ? 'text-white' : 'text-foreground'}`} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">{opt.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Theme Color Selection Sheet */}
      <Sheet open={isThemeSheetOpen} onOpenChange={setIsThemeSheetOpen}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-[2.5rem] border-t border-border/50 pb-safe overflow-y-auto no-scrollbar">
          <SheetHeader className="mb-6">
            <SheetTitle className="apple-header text-xl">Accent Color</SheetTitle>
          </SheetHeader>
          <div className="settings-scroll-area grid grid-cols-2 gap-4 pb-8">
            {colorThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeColorChange(t.id)}
                className={`
                            relative flex flex-col p-5 rounded-[2rem] border-2 transition-all text-left
                            ${themeColor === t.id ? 'border-orange-500 bg-orange-500/5' : 'border-border bg-card'}
                        `}
              >
                <div className="w-10 h-10 rounded-full mb-4 shadow-xl border-4 border-white/20" style={{ backgroundColor: t.color }} />
                <span className="font-black text-xs uppercase tracking-widest text-foreground">{t.name}</span>
                <span className="text-[10px] text-muted-foreground mt-1">{t.description}</span>
                {themeColor === t.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
