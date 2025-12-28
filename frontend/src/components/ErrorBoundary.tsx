import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-background text-foreground min-h-screen flex flex-col items-center justify-center text-center font-mono">
                    <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4 text-3xl">
                        ⚠
                    </div>
                    <h1 className="text-xl font-bold text-destructive mb-2">SYSTEM FAILURE</h1>
                    <p className="text-muted-foreground mb-4 text-sm">Reviewing application logs...</p>
                    <pre className="text-[10px] bg-black/40 border border-destructive/20 p-4 rounded-lg overflow-auto max-w-full text-left mb-6 w-full max-h-[300px]">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors"
                        onClick={() => window.location.reload()}
                    >
                        [REBOOT SYSTEM]
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
