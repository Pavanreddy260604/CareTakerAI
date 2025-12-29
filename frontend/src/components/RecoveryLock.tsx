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
            setTimeout(() => setStep('diagnose'), 2500);
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-1000 bg-black/90 backdrop-blur-3xl"
            style={{ opacity }}
        >
            {/* Red ambient glow for critical failure */}
            <div className="absolute inset-0 bg-gradient-to-b from-destructive/20 via-transparent to-destructive/10 pointer-events-none animate-pulse" />

            <div className="max-w-md w-full flex flex-col items-center text-center animate-fade-in relative z-10">

                {/* STAGE 1: SCANNING */}
                {step === 'scan' && (
                    <div className="space-y-8 flex flex-col items-center">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-t-2 border-l-2 border-destructive animate-spin" />
                            <div className="absolute inset-0 w-32 h-32 rounded-full border-r-2 border-b-2 border-destructive/30 animate-spin-slow" />
                            <div className="absolute inset-4 rounded-full bg-destructive/10 animate-pulse" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-mono text-destructive tracking-[0.2em] animate-pulse">SYSTEM SCANNING</h2>
                            <p className="text-destructive/60 font-mono text-xs">DIAGNOSTIC PROTOCOL: INITIATED</p>
                        </div>

                        <div className="w-full max-w-xs space-y-2 font-mono text-xs text-destructive/80 text-left bg-black/50 p-4 rounded-lg border border-destructive/20">
                            <p className="flex justify-between"><span>&gt; BIOLOGICAL_CLOCK</span> <span className="text-destructive">SYNC...</span></p>
                            <p className="flex justify-between"><span>&gt; HYDRATION_LVL</span> <span className="opacity-50">CHECKING...</span></p>
                            <p className="flex justify-between"><span>&gt; COGNITIVE_LOAD</span> <span className="opacity-50">WAITING...</span></p>
                        </div>
                    </div>
                )}

                {/* STAGE 2: DIAGNOSIS */}
                {(step === 'diagnose' || step === 'ready') && (
                    <div className="w-full bg-black/80 p-8 rounded-[2rem] border border-destructive/50 shadow-[0_0_50px_-10px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-500 relative overflow-hidden">

                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

                        {/* Status Header */}
                        <div className="flex items-center justify-between mb-8 border-b border-destructive/20 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-destructive animate-ping" />
                                <span className="text-xs font-mono text-destructive tracking-[0.2em] font-bold">CRITICAL ALERT</span>
                            </div>
                            <span className="text-[10px] font-mono text-destructive/60">CODE: 0xCRITICAL</span>
                        </div>

                        {/* Primary Error */}
                        <div className="mb-8 text-left">
                            <h2 className="text-4xl font-display font-medium text-white mb-2 leading-tight">{diagnosis}</h2>
                            <p className="text-destructive/80 font-medium">{subtext}</p>
                        </div>

                        {/* Visual Meters */}
                        <div className="space-y-5 mb-8">
                            {[
                                { label: "Sleep Debt", val: metrics?.sleepDebt, critical: isSleepCritical },
                                { label: "Hydration", val: metrics?.hydrationDebt, critical: isWaterCritical },
                                { label: "Mental Load", val: metrics?.mentalDebt, critical: isMentalCritical }
                            ].map((m, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between text-xs uppercase tracking-wider font-medium">
                                        <span className={m.critical ? "text-destructive" : "text-muted-foreground"}>{m.label}</span>
                                        <span className={m.critical ? "text-destructive font-bold" : "text-muted-foreground"}>{m.val || 0}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${m.critical ? "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-white/20"}`}
                                            style={{ width: `${m.val || 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Button */}
                        {step === 'ready' && (
                            <button
                                onClick={handleDismiss}
                                className="w-full py-4 rounded-xl bg-destructive text-destructive-foreground font-bold tracking-widest uppercase hover:bg-destructive/90 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all active:scale-[0.98]"
                            >
                                Acknowledge & Reboot
                            </button>
                        )}
                        {step !== 'ready' && (
                            <div className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-muted-foreground flex items-center justify-center gap-3">
                                <span className="animate-pulse">CALCULATING RECOVERY PATH...</span>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}

export default RecoveryLock;
