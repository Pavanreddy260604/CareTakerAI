import React from 'react';
import { X, Battery, Moon, Droplets, Brain, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface CapacityExplainerProps {
    isOpen: boolean;
    onClose: () => void;
    currentCapacity?: number;
}

export function CapacityExplainer({ isOpen, onClose, currentCapacity }: CapacityExplainerProps) {
    if (!isOpen) return null;

    const getCapacityColor = (cap: number) => {
        if (cap >= 70) return 'text-emerald-500';
        if (cap >= 45) return 'text-amber-500';
        return 'text-rose-500';
    };

    return (
        <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-xl overflow-auto animate-fade-in">
            <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 sticky top-0 py-4 z-20 bg-background/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <Battery className="w-8 h-8 text-primary" />
                        <h2 className="text-2xl font-display font-medium text-foreground">
                            Understanding Capacity
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Current Capacity */}
                {currentCapacity !== undefined && (
                    <div className="glass-card p-6 mb-6 text-center bg-card border-border">
                        <p className="text-sm text-muted-foreground mb-2">Your Current Capacity</p>
                        <p className={`text-5xl font-bold ${getCapacityColor(currentCapacity)}`}>
                            {currentCapacity}%
                        </p>
                    </div>
                )}

                {/* What is Capacity */}
                <div className="glass-card p-6 mb-4 bg-card border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" />
                        What is Capacity?
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                        <strong>Capacity</strong> measures your cognitive and physical energy level on a scale of 0-100%.
                        Think of it as "how much gas is left in your tank." High capacity means you can perform at your best.
                        Low capacity signals that your body needs rest or recovery.
                    </p>
                </div>

                {/* How it's Calculated */}
                <div className="glass-card p-6 mb-4 bg-card border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        How is it Calculated?
                    </h3>

                    <div className="bg-muted/20 p-4 rounded-xl mb-4">
                        <p className="font-mono text-sm text-center text-foreground">
                            Capacity = 100 - max(Sleep Debt, Hydration Debt, Mental Debt)
                        </p>
                    </div>

                    <p className="text-sm text-foreground/80 mb-4">
                        Your capacity is limited by your <strong>weakest link</strong>. Even if you sleep well,
                        dehydration or high stress can still tank your performance. This is based on
                        <strong> Liebig's Law of the Minimum</strong>.
                    </p>
                </div>

                {/* The Three Debts */}
                <div className="glass-card p-6 mb-4 bg-card border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-4">The Three Biological Debts</h3>

                    {/* Sleep Debt */}
                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 mb-3">
                        <div className="flex items-center gap-3 mb-2">
                            <Moon className="w-6 h-6 text-indigo-500" />
                            <h4 className="font-semibold text-foreground">Sleep Debt</h4>
                        </div>
                        <p className="text-sm text-foreground/70 mb-2">
                            Accumulates when you don't get quality sleep. Poor sleep adds <strong>+20 debt</strong> per day.
                            Good sleep reduces it by <strong>-10 debt</strong>. Optimal sleep resets it to 0.
                        </p>
                        <div className="flex gap-2 mt-2 text-xs">
                            <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-600">LOW → +20</span>
                            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-600">OK → -10</span>
                            <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-600">OPTIMAL → Reset</span>
                        </div>
                    </div>

                    {/* Hydration Debt */}
                    <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 mb-3">
                        <div className="flex items-center gap-3 mb-2">
                            <Droplets className="w-6 h-6 text-cyan-500" />
                            <h4 className="font-semibold text-foreground">Hydration Debt</h4>
                        </div>
                        <p className="text-sm text-foreground/70 mb-2">
                            Builds up when you're not drinking enough water. Low hydration adds <strong>+15 debt</strong> per day.
                            Good hydration reduces it by <strong>-15 debt</strong>.
                        </p>
                        <div className="flex gap-2 mt-2 text-xs">
                            <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-600">LOW → +15</span>
                            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-600">OK → -15</span>
                        </div>
                    </div>

                    {/* Mental Debt */}
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-center gap-3 mb-2">
                            <Brain className="w-6 h-6 text-amber-500" />
                            <h4 className="font-semibold text-foreground">Mental Debt</h4>
                        </div>
                        <p className="text-sm text-foreground/70 mb-2">
                            Increases with high stress or mental load. High stress adds <strong>+15 debt</strong> per day.
                            Low stress reduces it by <strong>-10 debt</strong>.
                        </p>
                        <div className="flex gap-2 mt-2 text-xs">
                            <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-600">HIGH → +15</span>
                            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-600">LOW → -10</span>
                        </div>
                    </div>
                </div>

                {/* System Modes */}
                <div className="glass-card p-6 mb-4 bg-card border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-4">System Modes</h3>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                            <div>
                                <p className="font-semibold text-emerald-600">NORMAL (45%+)</p>
                                <p className="text-sm text-foreground/70">You're functioning well. Keep up the good habits!</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-600">LOCKED RECOVERY (20-45%)</p>
                                <p className="text-sm text-foreground/70">Your body needs recovery. AI will suggest rest actions.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10">
                            <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5" />
                            <div>
                                <p className="font-semibold text-rose-600">SURVIVAL (&lt;20%)</p>
                                <p className="text-sm text-foreground/70">Critical! Burnout risk is high. Prioritize rest immediately.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Window */}
                <div className="glass-card p-6 bg-card border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" />
                        7-Day Rolling Window
                    </h3>
                    <p className="text-sm text-foreground/80">
                        Debts accumulate over the <strong>last 7 days</strong> of check-ins.
                        This means one bad day won't crash your capacity, but consistent poor habits will.
                        Similarly, recovery takes consistent good days to bring capacity back up.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default CapacityExplainer;
