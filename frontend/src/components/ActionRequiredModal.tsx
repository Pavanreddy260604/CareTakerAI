import React from 'react';

interface ActionRequiredModalProps {
    action: string | null;
    status: "PENDING" | "COMPLETED";
    onConfirm: () => void;
}

export function ActionRequiredModal({ action, status, onConfirm }: ActionRequiredModalProps) {
    // Only show if there is an action and it is PENDING
    if (!action || status !== "PENDING") return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/95 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="max-w-md w-full bg-black/40 border border-primary/30 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col items-center text-center">

                {/* Icon */}
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                    <span className="text-4xl">⚡</span>
                </div>

                {/* Title */}
                <h2 className="text-sm font-mono text-primary uppercase tracking-widest mb-2">
                    Action Required
                </h2>

                {/* Action Text */}
                <h3 className="text-2xl sm:text-3xl font-display font-medium text-white mb-6 leading-tight">
                    {action}
                </h3>

                <p className="text-muted-foreground text-sm mb-8">
                    Please complete this action to continue with your session.
                </p>

                {/* Button */}
                <button
                    onClick={onConfirm}
                    className="w-full btn-primary text-lg py-4 rounded-xl shadow-[0_0_30px_-10px_rgba(var(--primary),0.5)] hover:shadow-[0_0_50px_-10px_rgba(var(--primary),0.8)] transition-all"
                >
                    I've Done This
                </button>
            </div>
        </div>
    );
}
