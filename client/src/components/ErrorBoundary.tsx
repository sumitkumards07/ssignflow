import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black italic tracking-tight mb-2">System Failure</h2>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                        A critical rendering error occurred. We've managed to contain the breach.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all active:scale-95"
                    >
                        Reboot System
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
