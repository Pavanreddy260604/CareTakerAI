import React from 'react';
import { cn } from "@/lib/utils";

interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
}

export function BentoCard({ children, className, noPadding = false, ...props }: BentoCardProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300 group",
                "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]",
                "hover:border-white/10 hover:bg-black/50 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]",
                noPadding ? "" : "p-5 sm:p-6",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
