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

    const { capacity, sleepDebt, hydrationDebt, mentalDebt, prediction, systemMode, recoveryBudget } = metrics;

    const isLocked = systemMode === 'LOCKED_RECOVERY' || systemMode === 'SURVIVAL';

    // Color logic
    const capacityColor = capacity < 30 ? "text-destructive" : capacity < 60 ? "text-yellow-500" : "text-primary";
    const capacityBg = capacity < 30 ? "bg-destructive" : capacity < 60 ? "bg-yellow-500" : "bg-primary";

    const getDebtColor = (debt: number) => debt > 30 ? "text-destructive" : "text-primary";
    const getDebtBg = (debt: number) => debt > 30 ? "bg-destructive" : "bg-primary";

    return (
        <div className={`mb-5 border ${isLocked ? "border-destructive bg-destructive/5" : "border-primary/30 bg-black/40"} backdrop-blur-xl shadow-2xl p-4 sm:p-5 rounded-xl relative overflow-hidden transition-colors duration-500`}>
            {/* Background warning tint if critical */}
            {capacity < 30 && <div className="absolute inset-0 bg-destructive/10 pointer-events-none animate-pulse" />}

            {/* MODE ALERT - OBSERVER */}
            {systemMode === 'OBSERVER' && (
                <div className="flex flex-col items-center justify-center p-4 mb-4 border border-primary/30 bg-primary/5 text-primary text-center space-y-1 rounded-xl">
                    <span className="text-sm font-bold tracking-widest">OBSERVER MODE ACTIVE</span>
                    <span className="text-xs text-muted-foreground/70 tracking-tight">LOCKOUT PROTOCOLS DISABLED</span>
                </div>
            )}

            {/* MODE ALERT - LOCKED */}
            {isLocked && (
                <div className="flex flex-col items-center justify-center p-4 mb-4 border border-destructive bg-black/80 text-destructive text-center space-y-2 rounded-xl scanline">
                    <span className="text-base sm:text-lg font-bold tracking-[0.15em] animate-pulse">
                        ⚠ {systemMode} ENGAGED
                    </span>
                    <span className="text-xs sm:text-sm font-mono text-muted-foreground">
                        BIOLOGICAL DEBT EXCEEDS SAFETY LIMITS
                    </span>
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-white mt-2">
                        {recoveryBudget}H
                        <span className="text-xs sm:text-sm text-muted-foreground block">BUDGET</span>
                    </div>
                </div>
            )}

            {/* Compact Metrics Row: Confidence & Capacity */}
            <div className="flex flex-wrap gap-3 mb-4 relative z-10">
                {/* Data Confidence */}
                <div className="flex-1 min-w-[140px] bg-black/20 border border-border/20 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
                            Data Confidence
                        </span>
                        <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${(metrics.confidence || 1) < 0.8 ? "bg-yellow-500" : "bg-primary"}`}
                                style={{ width: `${Math.round((metrics.confidence || 1) * 100)}%` }}
                            />
                        </div>
                    </div>
                    <span className={`text-lg font-mono font-bold ${(metrics.confidence || 1) < 0.8 ? "text-yellow-500" : "text-primary"}`}>
                        {Math.round((metrics.confidence || 1) * 100)}%
                    </span>
                </div>

                {/* Cognitive Capacity */}
                <div className="flex-1 min-w-[140px] bg-black/20 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
                            Cognitive Capacity
                        </span>
                        <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${capacityBg}`}
                                style={{ width: `${capacity}%` }}
                            />
                        </div>
                    </div>
                    <span className={`text-lg font-mono font-bold ${capacityColor}`}>
                        {capacity}%
                    </span>
                </div>
            </div>

            {/* Debts Grid - Responsive */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs font-mono relative z-10">
                {/* Sleep Debt */}
                <div className="bg-black/20 border border-muted/20 rounded-lg p-3 sm:p-4">
                    <span className="text-muted-foreground text-[9px] sm:text-[10px] uppercase block mb-2">
                        Sleep
                    </span>
                    <div className="flex flex-col gap-2">
                        <div className="w-full h-1.5 bg-muted/20 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all rounded-full ${getDebtBg(sleepDebt)}`}
                                style={{ width: `${Math.min(100, sleepDebt)}%` }}
                            />
                        </div>
                        <span className={`text-sm sm:text-base font-bold ${getDebtColor(sleepDebt)}`}>
                            {sleepDebt}
                        </span>
                    </div>
                </div>

                {/* Hydration Debt */}
                <div className="bg-black/20 border border-muted/20 rounded-lg p-3 sm:p-4">
                    <span className="text-muted-foreground text-[9px] sm:text-[10px] uppercase block mb-2">
                        Hydro
                    </span>
                    <div className="flex flex-col gap-2">
                        <div className="w-full h-1.5 bg-muted/20 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all rounded-full ${getDebtBg(hydrationDebt)}`}
                                style={{ width: `${Math.min(100, hydrationDebt)}%` }}
                            />
                        </div>
                        <span className={`text-sm sm:text-base font-bold ${getDebtColor(hydrationDebt)}`}>
                            {hydrationDebt}
                        </span>
                    </div>
                </div>

                {/* Mental Debt */}
                <div className="bg-black/20 border border-muted/20 rounded-lg p-3 sm:p-4">
                    <span className="text-muted-foreground text-[9px] sm:text-[10px] uppercase block mb-2">
                        Mental
                    </span>
                    <div className="flex flex-col gap-2">
                        <div className="w-full h-1.5 bg-muted/20 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all rounded-full ${getDebtBg(mentalDebt)}`}
                                style={{ width: `${Math.min(100, mentalDebt)}%` }}
                            />
                        </div>
                        <span className={`text-sm sm:text-base font-bold ${getDebtColor(mentalDebt)}`}>
                            {mentalDebt}
                        </span>
                    </div>
                </div>
            </div>

            {/* Prediction Warning */}
            {prediction && (
                <div className="mt-4 pt-3 border-t border-destructive/30 text-xs font-mono text-destructive flex items-start gap-2 animate-pulse relative z-10">
                    <span className="shrink-0">⚠</span>
                    <span>PREDICTION: <strong>{prediction}</strong></span>
                </div>
            )}
        </div>
    );
};
