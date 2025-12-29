import { useState, useEffect } from 'react';

interface RecoveryLockProps {
    isVisible: boolean;
    capacity: number;
    metrics?: {
        sleepDebt: number;
        hydrationDebt: number;
        mentalDebt: number;
    };
    onAcknowledge: () => void;
}

export function RecoveryLock({ isVisible, capacity, metrics, onAcknowledge }: RecoveryLockProps) {
    const [step, setStep] = useState<'scan' | 'diagnose' | 'ready'>('scan');
    const [opacity, setOpacity] = useState(0);

    useEffect(() => {
        if (isVisible) {
            setStep('scan');
            setTimeout(() => setOpacity(1), 100);

            // Simulation of System Diagnostic Sequence
            setTimeout(() => setStep('diagnose'), 2000);
            setTimeout(() => setStep('ready'), 5000);
        } else {
            setOpacity(0);
        }
    }, [isVisible]);

    const handleDismiss = () => {
        setOpacity(0);
        setTimeout(onAcknowledge, 500);
    };

    if (!isVisible) return null;

    // Identify the primary stressor
    const isSleepCritical = (metrics?.sleepDebt || 0) > 30;
    const isWaterCritical = (metrics?.hydrationDebt || 0) > 30;
    const isMentalCritical = (metrics?.mentalDebt || 0) > 30;

    let diagnosis = "System Failure";
    let subtext = "Multiple critical failures detected.";

    if (isMentalCritical) {
        diagnosis = "Cognitive Overload";
        subtext = "Mental strain exceeding safe operating limits.";
    } else if (isSleepCritical) {
        diagnosis = "Sleep Deprivation";
        subtext = "Biological recovery time insufficient.";
    } else if (isWaterCritical) {
        diagnosis = "Hydration Critical";
        subtext = "Cellular performance compromised.";
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-500 bg-background/95 backdrop-blur-2xl"
            style={{ opacity }}
        >
            <div className="max-w-md w-full flex flex-col items-center text-center animate-fade-in relative">

                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

                {/* STAGE 1: SCANNING */}
                {step === 'scan' && (
                    <div className="space-y-6">
                        <div className="w-24 h-24 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto" />
                        <h2 className="text-xl font-mono text-primary animate-pulse">RUNNING DIAGNOSTICS...</h2>
                        <div className="space-y-1 font-mono text-xs text-muted-foreground w-64 mx-auto text-left">
                            <p>&gt; Checking sleep cycles... <span className="text-primary float-right">DONE</span></p>
                            <p>&gt; Analyzing hydration levels... <span className="text-primary float-right">DONE</span></p>
                            <p>&gt; Measuring cognitive load... <span className="text-primary float-right">Wait...</span></p>
                        </div>
                    </div>
                )}

                {/* STAGE 2: DIAGNOSIS */}
                {(step === 'diagnose' || step === 'ready') && (
                    <div className="w-full glass p-8 rounded-3xl border-l-4 border-l-destructive shadow-2xl animate-in zoom-in-95 duration-500">
                        {/* Status Header */}
                        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                                <span className="text-sm font-mono text-destructive tracking-widest">SYSTEM LOCKED</span>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">ERR_BIO_001</span>
                        </div>

                        {/* Primary Error */}
                        <div className="mb-8 text-left">
                            <h2 className="text-3xl font-display font-bold text-white mb-2">{diagnosis}</h2>
                            <p className="text-muted-foreground">{subtext}</p>
                        </div>

                        {/* Detailed Metrics */}
                        <div className="space-y-4 mb-8">
                            {/* Sleep Meter */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Sleep Debt</span>
                                    <span className={isSleepCritical ? "text-destructive font-bold" : "text-primary"}>
                                        {metrics?.sleepDebt || 0}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${isSleepCritical ? "bg-destructive" : "bg-primary"}`}
                                        style={{ width: `${metrics?.sleepDebt || 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Hydration Meter */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Hydration Deficit</span>
                                    <span className={isWaterCritical ? "text-destructive font-bold" : "text-primary"}>
                                        {metrics?.hydrationDebt || 0}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${isWaterCritical ? "bg-destructive" : "bg-cyan-400"}`}
                                        style={{ width: `${metrics?.hydrationDebt || 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Mental Meter */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Cognitive Load</span>
                                    <span className={isMentalCritical ? "text-destructive font-bold" : "text-primary"}>
                                        {metrics?.mentalDebt || 0}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${isMentalCritical ? "bg-destructive" : "bg-purple-500"}`}
                                        style={{ width: `${metrics?.mentalDebt || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        {step === 'ready' && (
                            <button
                                onClick={handleDismiss}
                                className="w-full py-4 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 text-destructive font-medium transition-all group"
                            >
                                <span className="group-hover:mr-2 transition-all">Acknowledge Failure</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-all">&rarr;</span>
                            </button>
                        )}
                        {step !== 'ready' && (
                            <div className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-muted-foreground flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span>Calculating Recovery...</span>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}

export default RecoveryLock;
