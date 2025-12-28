import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
    onRetry?: () => void;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

/**
 * Dedicated ErrorBoundary for ClashChat - prevents crashes from bubbling up
 * and shows a user-friendly recovery UI instead of crashing the entire app.
 */
export class ChatErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        errorMessage: ""
    };

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            errorMessage: error.message || "Unknown error occurred"
        };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[ClashChat Crash Caught]:", error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, errorMessage: "" });
        this.props.onRetry?.();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col h-[60vh] md:h-[500px] w-full bg-background border border-border rounded-3xl shadow-2xl overflow-hidden items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Chat Temporarily Unavailable</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                        Something went wrong loading the chat. This won't affect the rest of your app.
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
