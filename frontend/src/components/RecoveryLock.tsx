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
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Critical Warning Header */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🚨</div>
                    <h1 className="text-2xl font-mono font-bold text-destructive mb-2">
                        SURVIVAL MODE ACTIVE
                    </h1>
                    <p className="text-muted-foreground font-mono">
                        Capacity at {capacity}% — Immediate rest required
                    </p>
                </div>

                {/* Recovery Focus Card */}
                <div className="bg-destructive/10 border-2 border-destructive/50 rounded-lg p-6 mb-6">
                    <h2 className="font-mono font-bold text-destructive mb-4">
                        System Override: Recovery Required
                    </h2>
                    <ul className="space-y-2 text-sm font-mono text-muted-foreground">
                        <li>❌ Cancel all non-essential activities</li>
                        <li>❌ Avoid decision-making tasks</li>
                        <li>✓ Hydrate immediately</li>
                        <li>✓ Rest for minimum 2 hours</li>
                        <li>✓ Sleep 8+ hours tonight</li>
                    </ul>
                </div>

                {/* Acknowledgment Gate */}
                <div className="bg-black/50 border border-muted/30 rounded-lg p-4">
                    {!canDismiss ? (
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                                Read the above carefully. Dismiss available in:
                            </p>
                            <p className="text-4xl font-mono font-bold text-destructive">
                                {countdown}s
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-muted-foreground mb-3 text-center">
                                Type "I understand" to acknowledge and dismiss this warning
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                    placeholder="Type 'I understand' here..."
                                    className="flex-1 bg-black border border-muted/50 rounded px-3 py-2 font-mono text-sm focus:border-destructive focus:outline-none"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={inputValue.toLowerCase() !== 'i understand'}
                                    className="px-4 py-2 bg-destructive/20 text-destructive border border-destructive/50 rounded font-mono text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-destructive/30 transition-all"
                                >
                                    Acknowledge
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Warning Penalty Notice */}
                <p className="text-[10px] text-muted-foreground text-center mt-4 font-mono">
                    ⚠️ Dismissing this warning will reduce your Recovery Score by 10 points
                </p>
            </div>
        </div>
    );
}

export default RecoveryLock;
