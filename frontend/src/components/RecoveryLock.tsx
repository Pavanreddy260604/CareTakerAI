import { useState, useEffect } from 'react';

interface RecoveryLockProps {
    isVisible: boolean;
    capacity: number;
    onAcknowledge: () => void;
}

export function RecoveryLock({ isVisible, capacity, onAcknowledge }: RecoveryLockProps) {
    const [inputValue, setInputValue] = useState('');
    const [countdown, setCountdown] = useState(30);
    const [canDismiss, setCanDismiss] = useState(false);

    // 30-second countdown before dismiss is possible
    useEffect(() => {
        if (!isVisible) return;
        setCountdown(30);
        setCanDismiss(false);

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    setCanDismiss(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isVisible]);

    const handleSubmit = () => {
        if (inputValue.toLowerCase() === 'i understand' && canDismiss) {
            setInputValue('');
            onAcknowledge();
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 safe-area-bottom">
            <div className="max-w-md w-full animate-slide-up">
                {/* Critical Warning Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center animate-pulse">
                        <span className="text-4xl sm:text-5xl">🚨</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-mono font-bold text-destructive mb-2">
                        SURVIVAL MODE ACTIVE
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground font-mono">
                        Capacity at <span className="text-destructive font-bold">{capacity}%</span>
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                        Immediate rest required
                    </p>
                </div>

                {/* Recovery Focus Card */}
                <div className="bg-destructive/10 border-2 border-destructive/50 rounded-xl p-4 sm:p-6 mb-5">
                    <h2 className="font-mono font-bold text-destructive mb-4 text-sm sm:text-base">
                        System Override: Recovery Required
                    </h2>
                    <ul className="space-y-3 text-sm font-mono text-muted-foreground">
                        <li className="flex items-start gap-3">
                            <span className="text-destructive shrink-0">❌</span>
                            <span>Cancel all non-essential activities</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-destructive shrink-0">❌</span>
                            <span>Avoid decision-making tasks</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-primary shrink-0">✓</span>
                            <span>Hydrate immediately</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-primary shrink-0">✓</span>
                            <span>Rest for minimum 2 hours</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-primary shrink-0">✓</span>
                            <span>Sleep 8+ hours tonight</span>
                        </li>
                    </ul>
                </div>

                {/* Acknowledgment Gate */}
                <div className="bg-black/50 border border-muted/30 rounded-xl p-4 sm:p-5">
                    {!canDismiss ? (
                        <div className="text-center">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                                Read the above carefully. Dismiss available in:
                            </p>
                            <div className="relative w-20 h-20 mx-auto">
                                {/* Circular progress */}
                                <svg className="w-full h-full -rotate-90">
                                    <circle
                                        cx="40"
                                        cy="40"
                                        r="36"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        className="text-muted/20"
                                    />
                                    <circle
                                        cx="40"
                                        cy="40"
                                        r="36"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        strokeDasharray={`${(countdown / 30) * 226} 226`}
                                        strokeLinecap="round"
                                        className="text-destructive transition-all duration-1000"
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-mono font-bold text-destructive">
                                    {countdown}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-muted-foreground mb-3 text-center">
                                Type "<span className="text-foreground">I understand</span>" to dismiss
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                    placeholder="Type 'I understand' here..."
                                    className="flex-1 bg-black border border-muted/50 rounded-xl px-4 py-3 font-mono text-sm focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive/30"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={inputValue.toLowerCase() !== 'i understand'}
                                    className="px-5 py-3 bg-destructive/20 text-destructive border border-destructive/50 rounded-xl font-mono text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-destructive/30 active:scale-[0.98] transition-all"
                                >
                                    Acknowledge
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Warning Penalty Notice */}
                <p className="text-[10px] text-muted-foreground text-center mt-4 font-mono flex items-center justify-center gap-1">
                    <span>⚠️</span>
                    <span>Dismissing reduces Recovery Score by 10 points</span>
                </p>
            </div>
        </div>
    );
}

export default RecoveryLock;
