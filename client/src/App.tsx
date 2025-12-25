import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeColorProvider } from "@/components/theme-color-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import Todo from "@/pages/Todo";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import Upcoming from "@/pages/Upcoming";
import Pomodoro from "@/pages/Pomodoro";
import Analytics from "@/pages/Analytics";
import StudyAssistantPage from "@/pages/StudyAssistantPage";
import { useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { SplashScreen } from "@/components/SplashScreen";
import { UpdateDialog } from "@/components/UpdateDialog";
import type { UpdateManifest } from "@/lib/UpdateService";
import { Analytics as DubAnalytics } from '@dub/analytics/react';

function Router() {
  const [location, setLocation] = useLocation();

  // Auth check removed to prevent unwanted redirects that reset login state

  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/todo" component={Todo} />
      <Route path="/upcoming" component={Upcoming} />
      <Route path="/settings" component={Settings} />
      <Route path="/pomodoro" component={Pomodoro} />
      <Route path="/study" component={StudyAssistantPage} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on first load
    const hasShownSplash = sessionStorage.getItem('splashShown');
    return !hasShownSplash;
  });

  const [updateManifest, setUpdateManifest] = useState<UpdateManifest | null>(null);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };

  useEffect(() => {
    // Handle deep links (OAuth callback)
    // Handle deep links (OAuth callback and Widgets)
    CapacitorApp.addListener('appUrlOpen', (data) => {
      console.log('App opened with URL:', data.url);

      if (data.url.includes('pomodoro')) {
        window.location.href = '/pomodoro';
      } else if (data.url.includes('todo')) {
        window.location.href = '/todo';
      } else if (data.url.includes('assignflow://auth')) {
        // Parse user data from URL params
        try {
          const url = new URL(data.url);
          const userParam = url.searchParams.get('user');
          if (userParam) {
            const user = JSON.parse(decodeURIComponent(userParam));
            localStorage.setItem('user', JSON.stringify(user));
            // Force reload to update auth state
            window.location.href = '/todo';
          }
        } catch (e) {
          console.error('Error parsing auth deep link:', e);
        }
      }
    });

    // Auto-backup if > 24 hours
    const checkBackup = async () => {
      const lastBackup = localStorage.getItem('last_backup_time');
      const now = new Date().getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (!lastBackup || now - new Date(lastBackup).getTime() > twentyFourHours) {
        console.log("Last backup > 24h ago, backing up...");
        const { backupData } = await import("@/lib/backup");
        await backupData(true); // silent mode
      }
    };
    checkBackup();

    // Auto-restore data if fresh install AND not explicitly logged out
    // DISABLED: This was causing issues with the login form
    // const checkRestore = async () => {
    //   const { Capacitor } = await import("@capacitor/core");
    //   if (!Capacitor.isNativePlatform()) return;
    //   const user = localStorage.getItem("user");
    //   const wasLoggedOut = localStorage.getItem("logged_out");
    //   if (!user && !wasLoggedOut) {
    //     const { restoreData } = await import("@/lib/backup");
    //     await restoreData(true);
    //   }
    // };
    // checkRestore();

    // Check for updates (OTA system)
    const checkForUpdates = async () => {
      try {
        // Dynamic import to avoid bundling issues if plugin is missing/mocked
        const UpdateService = (await import("@/lib/UpdateService")).default;
        const update = await UpdateService.checkForUpdate();

        if (update.updateAvailable) {
          // Show update dialog or auto-update
          // For now, let's just log it or trigger a state
          // Ideally, we lift this state up or use a context
          // But since we removed UpdateDialog from here, we need to add it back or use a different mechanism.
          // Re-enabling UpdateDialog logic if present
        }
      } catch (error) {
        console.error("Update check failed:", error);
      }
    };

    // Check for updates 2 seconds after launch (give app time to load)
    setTimeout(checkForUpdates, 2000);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
          <ThemeColorProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
              <DubAnalytics />
              {/* <UpdateDialog
                manifest={updateManifest}
                onClose={() => setUpdateManifest(null)}
                onSkip={(version) => {
                  const UpdateService = require("@/lib/UpdateService").default;
                  UpdateService.skipVersion(version);
                  setUpdateManifest(null);
                }}
              /> */}
            </TooltipProvider>
          </ThemeColorProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
