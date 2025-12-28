import { Switch, Route, useLocation } from "wouter";
import { MotionConfig } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeColorProvider } from "@/components/theme-color-provider";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
// Lazy load heavy pages to speed up initial load
import { lazy, Suspense } from "react";
const Todo = lazy(() => import("@/pages/Todo"));
const Settings = lazy(() => import("@/pages/Settings"));
const Pomodoro = lazy(() => import("@/pages/Pomodoro"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const StudyAssistantPage = lazy(() => import("@/pages/StudyAssistantPage"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Upcoming = lazy(() => import("@/pages/Upcoming"));
const Chat = lazy(() => import("@/pages/Chat"));
// StudyAssistantPage moved to lazy import above
import { useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { SplashScreen as CapacitorSplashScreen } from "@capacitor/splash-screen";
import { SplashScreen } from "@/components/SplashScreen";
import { Analytics as DubAnalytics } from '@dub/analytics/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Chat moved to lazy import above
import { OfflineIndicator } from "@/components/OfflineIndicator";


// Minimal loading fallback for Suspense
const PageLoader = () => (
  <div className="h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Standard routing with lazy loading - much faster cold start
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/todo" component={Todo} />
        <Route path="/pomodoro" component={Pomodoro} />
        <Route path="/study" component={StudyAssistantPage} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
        <Route path="/upcoming" component={Upcoming} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/chat/:chatId" component={Chat} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

import { ErrorBoundary } from "@/components/ErrorBoundary";

// ... existing imports

function Router() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ version: string, notes: string, url: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  // Error state for debugging
  const [errorDetails, setErrorDetails] = useState<{ title: string, message: string } | null>(null);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };

  useEffect(() => {
    // Hide splash screen immediately on mount for "instant" feel
    // We don't need to wait for anything here.
    const hideSplash = async () => {
      try {
        await CapacitorSplashScreen.hide();
      } catch (e) {
        console.warn("Error hiding splash screen", e);
      }
    };
    hideSplash();
  }, []);

  const handleUpdateNow = async () => {
    if (!updateInfo) return;

    setIsUpdating(true);
    try {
      const { toast } = await import("@/hooks/use-toast");
      const { updateService } = await import("@/services/UpdateService");

      toast({
        title: "🔄 Downloading Update",
        description: `Installing v${updateInfo.version}...`,
        duration: 10000,
      });

      // Delegate all logic to the service
      await updateService.performUpdate({
        updateAvailable: true,
        version: updateInfo.version,
        url: updateInfo.url,
        releaseNotes: updateInfo.notes
      });

      toast({
        title: "✅ Update Ready!",
        description: "Restarting app...",
        duration: 2000,
      });

    } catch (error: any) {
      console.error("Update failed:", error);
      setIsUpdating(false);

      // SHOW ERROR DIALOG INSTEAD OF TOAST for detailed debugging
      setErrorDetails({
        title: "Update Failed",
        message: error.message + "\n\nURL: " + (updateInfo?.url || "unknown")
      });
    }
  };

  useEffect(() => {
    // Handle deep links (OAuth callback and Widgets)
    CapacitorApp.addListener('appUrlOpen', (data) => {
      console.log('App opened with URL:', data.url);

      if (data.url.includes('pomodoro')) {
        window.location.href = '/pomodoro';
      } else if (data.url.includes('todo')) {
        window.location.href = '/todo';
      } else if (data.url.includes('assignflow://auth')) {
        try {
          const url = new URL(data.url);
          const userParam = url.searchParams.get('user');
          if (userParam) {
            const user = JSON.parse(decodeURIComponent(userParam));
            localStorage.setItem('user', JSON.stringify(user));
            window.location.href = '/todo';
          }
        } catch (e) {
          console.error('Error parsing auth deep link:', e);
        }
      }
    });

    // DEFERRED: Auto-backup - delay 10s to prioritize UI
    setTimeout(() => {
      const checkBackup = async () => {
        try {
          const lastBackup = localStorage.getItem('last_backup_time');
          const now = new Date().getTime();
          const twentyFourHours = 24 * 60 * 60 * 1000;

          if (!lastBackup || now - new Date(lastBackup).getTime() > twentyFourHours) {
            const { backupData } = await import("@/lib/backup");
            await backupData(true);
          }
        } catch (e) {
          console.error("Backup check failed:", e);
        }
      };
      checkBackup();
    }, 10000);

    // DEFERRED: Update Service - delay 15s to prioritize app usage
    setTimeout(() => {
      const initUpdates = async () => {
        try {
          const { updateService } = await import("@/services/UpdateService");
          await updateService.init();
          const info = await updateService.checkForUpdate();
          if (info) {
            setUpdateInfo({
              version: info.version,
              notes: info.releaseNotes || "A new version is available!",
              url: info.url
            });
          }
        } catch (e) {
          console.error("Failed to init update service:", e);
        }
      };
      initUpdates();
    }, 15000);

    // Prefetch disabled - it was blocking startup on slow networks
    // Data will be fetched on-demand when screens are visited

    // Back Button Handling for Android
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const isLoginOrRoot = window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/todo';

      if (!canGoBack || isLoginOrRoot) {
        CapacitorApp.exitApp();
      } else {
        window.history.back();
      }
    });

  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Error Debug Dialog */}
      <AlertDialog open={!!errorDetails}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{errorDetails?.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded">
              {errorDetails?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setErrorDetails(null)}>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setErrorDetails(null);
              handleUpdateNow();
            }}>Retry</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* OTA Update Alert Dialog */}
      <AlertDialog open={!!updateInfo && !isUpdating && !errorDetails}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              🎉 Update Available!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="text-base">
                <strong>Version {updateInfo?.version}</strong> is ready to install.
              </div>
              {updateInfo?.notes && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-medium mb-1">What's New:</p>
                  <p>{updateInfo.notes}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                The app will restart automatically after updating.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleUpdateNow}
              className="w-full"
            >
              Update Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: createSyncStoragePersister({
            storage: window.localStorage,
          }),
        }}
        onSuccess={() => {
          console.log("Query cache restored!");
        }}
      >
        <MotionConfig reducedMotion="always">
          <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
            <ThemeColorProvider>
              <TooltipProvider>
                <Router />
                <OfflineIndicator />
                <Toaster />
                <DubAnalytics />
              </TooltipProvider>
            </ThemeColorProvider>
          </ThemeProvider>
        </MotionConfig>
      </PersistQueryClientProvider>
    </>
  );
}

export default App;
