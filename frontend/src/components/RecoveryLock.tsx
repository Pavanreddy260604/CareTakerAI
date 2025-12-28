import { useState, useEffect } from 'react';

interface RecoveryLockProps {
    isVisible: boolean;
    capacity: number;
    onAcknowledge: () => void;
}

export function RecoveryLock({ isVisible, capacity, onAcknowledge }: RecoveryLockProps) {
    const [step, setStep] = useState<'breathe' | 'ready'>('breathe');
    const [opacity, setOpacity] = useState(0);

    useEffect(() => {
        if (isVisible) {
            setStep('breathe');
            setTimeout(() => setOpacity(1), 100);

            // Allow exit after 5 seconds of breathing
            const timer = setTimeout(() => {
                setStep('ready');
            }, 5000);
            return () => clearTimeout(timer);
        } else {
            setOpacity(0);
        }
    }, [isVisible]);

    const handleDismiss = () => {
        setOpacity(0);
        setTimeout(onAcknowledge, 500);
    };

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-500 bg-background/90 backdrop-blur-3xl"
            style={{ opacity }}
        >
            <div className="max-w-md w-full flex flex-col items-center text-center space-y-8 animate-fade-in">

                {/* Visual Anchor */}
                <div className="relative">
                    <div className="w-32 h-32 rounded-full border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-md relative z-10 animate-float">
                        <span className="text-4xl">🌿</span>
                    </div>
                    {/* Breathing Rings */}
                    <div className="absolute inset-0 rounded-full border border-primary/20 scale-150 animate-breathe" />
                    <div className="absolute inset-0 rounded-full border border-primary/10 scale-125 animate-breathe delay-150" />
                </div>

                {/* Gentle Message */}
                <div className="space-y-4">
                    <h2 className="text-3xl font-display font-medium text-white/90">
                        Let's Pause.
                    </h2>
                    <p className="text-muted-foreground font-sans leading-relaxed max-w-xs mx-auto">
                        Your energy is low ({capacity}%). <br />
                        Take a deep breath. No pressure to perform right now.
                    </p>
                </div>

                {/* Supportive Actions */}
                <div className={`transition-all duration-1000 ${step === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <button
                        onClick={handleDismiss}
                        className="btn-glass border-primary/30 hover:bg-primary/10 text-primary-foreground/90 w-full max-w-[200px]"
                    >
                        I'm Ready
                    </button>
                    <p className="mt-4 text-xs text-muted-foreground/50">
                        Taking a break is productive.
                    </p>
                </div>

            </div>
        </div>
    );
}

export default RecoveryLock;
