import React from 'react';
import { X, Droplets, Plus, Minus, CheckCircle2 } from 'lucide-react';

interface HydrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentIntake: number;
    goal: number;
    incrementAmount: number;
    onLog: (amount: number) => void;
}

const HydrationModal: React.FC<HydrationModalProps> = ({
    isOpen,
    onClose,
    currentIntake,
    goal,
    incrementAmount,
    onLog
}) => {
    if (!isOpen) return null;

    const progress = Math.min((currentIntake / goal) * 100, 100);
    const isGoalMet = currentIntake >= goal;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-sm border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-border/10">
                    <div className="flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-cyan-500" />
                        <h2 className="text-sm font-bold text-foreground">Water Intake</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted/20 rounded-full transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 py-10 flex flex-col items-center text-center">
                    {/* Visual Progress */}
                    <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="80"
                                cy="80"
                                r="70"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-muted/10"
                            />
                            <circle
                                cx="80"
                                cy="80"
                                r="70"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={440}
                                strokeDashoffset={440 - (progress / 100) * 440}
                                strokeLinecap="round"
                                className="text-cyan-500 transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-display font-bold text-foreground">{currentIntake}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">ml / {goal}ml</span>
                        </div>
                    </div>

                    {isGoalMet && (
                        <div className="mb-6 flex items-center gap-2 text-primary font-medium animate-in zoom-in duration-500">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm">Daily Goal Reached</span>
                        </div>
                    )}

                    {/* Quick Log Buttons */}
                    <div className="grid grid-cols-3 gap-3 w-full mb-8">
                        {[100, 250, 500].map((amt) => (
                            <button
                                key={amt}
                                onClick={() => onLog(amt)}
                                className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-muted/20 border border-border/50 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all active:scale-95 group"
                            >
                                <Plus className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold text-foreground">{amt}ml</span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => onLog(incrementAmount)}
                        className="w-full py-4 rounded-2xl bg-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 hover:bg-cyan-600 transition-colors active:scale-[0.98]"
                    >
                        Log Quick Glass ({incrementAmount}ml)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HydrationModal;
