
import React from 'react';

interface BiologicalMetrics {
    sleepDebt: number;
    hydrationDebt: number;
    mentalDebt: number;
    capacity: number;
    prediction?: string | null;
    systemMode?: string;
    recoveryBudget?: number;
    violationPenalty?: number;
    confidence?: number;
}

interface Props {
    metrics?: BiologicalMetrics;
}

export const BiologicalStatus: React.FC<Props> = ({ metrics }) => {
    if (!metrics) return null;

    const { capacity, sleepDebt, hydrationDebt, mentalDebt, prediction, systemMode, recoveryBudget, violationPenalty } = metrics;

    const isLocked = systemMode === 'LOCKED_RECOVERY' || systemMode === 'SURVIVAL';

    // Color logic
    const capacityColor = capacity < 30 ? "text-destructive" : capacity < 60 ? "text-yellow-500" : "text-primary";
    const capacityBg = capacity < 30 ? "bg-destructive" : capacity < 60 ? "bg-yellow-500" : "bg-primary";

    return (
        <div className={`mb-6 border ${isLocked ? "border-destructive bg-destructive/5" : "border-primary/30 bg-black/40"} backdrop-blur-md shadow-2xl p-4 rounded-sm relative overflow-hidden transition-colors duration-500`}>
            {/* Background warning tint if critical */}
            {capacity < 30 && <div className="absolute inset-0 bg-destructive/10 pointer-events-none animate-pulse" />}


            {/* MODE ALERT */}
            {systemMode === 'OBSERVER' && (
                <div className="flex flex-col items-center justify-center p-3 mb-4 border border-primary/30 bg-primary/5 text-primary text-center space-y-1">
                    <span className="text-sm font-bold tracking-widest">OBSERVER MODE ACTIVE</span>
                    <span className="text-sm text-muted-foreground/70 tracking-tight">LOCKOUT PROTOCOLS DISABLED • PATTERN MONITORING ONLY</span>
                </div>
            )}

            {isLocked && (
                <div className="flex flex-col items-center justify-center p-4 mb-4 border border-destructive bg-black/80 text-destructive text-center space-y-2 scanline">
                    <span className="text-lg font-bold tracking-[0.2em] animate-pulse">
                        ⚠ {systemMode} ENGAGED
                    </span>
                    <span className="text-sm font-mono text-muted-foreground">
                        BIOLOGICAL DEBT EXCEEDS SAFETY LIMITS
                    </span>
                    <div className="text-4xl font-mono font-bold text-white mt-2">
                        {recoveryBudget}H <span className="text-sm text-muted-foreground block">BUDGET</span>
                    </div>
                </div>
            )}

            {/* Two Separate Metrics: Capacity & Confidence */}
            <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                {/* Cognitive Capacity Card */}
                <div className="bg-black/30 border border-primary/20 rounded-lg p-4">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Cognitive Capacity</span>
                        <span className={`text-2xl font-mono font-bold ${capacityColor}`}>{capacity}%</span>
                    </div>
                    <div className="w-full h-2 bg-background/50 border border-primary/20 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${capacityBg} transition-all duration-1000 ease-out`}
                            style={{ width: `${capacity}%` }}
                        />
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 mt-2 font-mono">
                        {capacity < 30 ? "⚠ CRITICAL" : capacity < 60 ? "⚡ DEGRADED" : "✓ OPTIMAL"}
                    </p>
                </div>

                {/* Confidence Card */}
                <div className="bg-black/30 border border-border/30 rounded-lg p-4">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Data Confidence</span>
                        <span className={`text-2xl font-mono font-bold ${(metrics.confidence || 1) < 0.8 ? "text-yellow-500" : "text-primary"}`}>
                            {Math.round((metrics.confidence || 1) * 100)}%
                        </span>
                    </div>
                    <div className="w-full h-2 bg-background/50 border border-border/20 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out ${(metrics.confidence || 1) < 0.8 ? "bg-yellow-500" : "bg-primary"}`}
                            style={{ width: `${Math.round((metrics.confidence || 1) * 100)}%` }}
                        />
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 mt-2 font-mono">
                        {(metrics.confidence || 1) < 0.6 ? "⚠ LOW DATA" : (metrics.confidence || 1) < 0.8 ? "⚡ ESTIMATED" : "✓ VERIFIED"}
                    </p>
                </div>
            </div>

            {/* Debts Grid */}
            <div className="grid grid-cols-3 gap-4 text-xs font-mono relative z-10">
                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-[10px] uppercase">Sleep Debt</span>
                    <div className="flex items-center gap-2">
                        <div className="w-full h-1 bg-muted/20">
                            <div className={`h-full transition-all ${sleepDebt > 30 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, sleepDebt)}%` }} />
                        </div>
                        <span className={sleepDebt > 30 ? "text-destructive" : "text-primary"}>{sleepDebt}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-[10px] uppercase">Hydro Debt</span>
                    <div className="flex items-center gap-2">
                        <div className="w-full h-1 bg-muted/20">
                            <div className={`h-full transition-all ${hydrationDebt > 30 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, hydrationDebt)}%` }} />
                        </div>
                        <span className={hydrationDebt > 30 ? "text-destructive" : "text-primary"}>{hydrationDebt}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-[10px] uppercase">Mental Debt</span>
                    <div className="flex items-center gap-2">
                        <div className="w-full h-1 bg-muted/20">
                            <div className={`h-full transition-all ${mentalDebt > 30 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, mentalDebt)}%` }} />
                        </div>
                        <span className={mentalDebt > 30 ? "text-destructive" : "text-primary"}>{mentalDebt}</span>
                    </div>
                </div>
            </div>

            {/* Prediction Warning */}
            {prediction && (
                <div className="mt-4 pt-3 border-t border-destructive/30 text-xs font-mono text-destructive flex items-center gap-2 animate-pulse relative z-10">
                    <span>⚠ PREDICTION:</span>
                    <span className="font-bold">{prediction}</span>
                </div>
            )}
        </div>
    );
};
