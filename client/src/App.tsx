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
import AiQuiz from "@/pages/AiQuiz";
import Upcoming from "@/pages/Upcoming";
import Pomodoro from "@/pages/Pomodoro";
import Analytics from "@/pages/Analytics";
import { useEffect } from "react";
import { App as AppPlugin } from "@capacitor/app";

function Router() {
  const [location, setLocation] = useLocation();

  // Check auth on route change
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user && location !== "/login") {
      setLocation("/login");
    }
  }, [location, setLocation]);

  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/todo" component={Todo} />
      <Route path="/upcoming" component={Upcoming} />
      <Route path="/ai-quiz" component={AiQuiz} />
      <Route path="/settings" component={Settings} />
      <Route path="/pomodoro" component={Pomodoro} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Handle deep links (OAuth callback)
    AppPlugin.addListener('appUrlOpen', (data) => {
      if (data.url.includes('assignflow://auth')) {
        // Parse user data from URL params
        // Format: assignflow://auth?user={...json...}
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
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
        <ThemeColorProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </ThemeColorProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
