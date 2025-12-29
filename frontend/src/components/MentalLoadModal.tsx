import React, { useState, useEffect } from 'react';
import { X, Brain, Send, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

interface MentalLoadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (status: 'OK' | 'HIGH' | 'LOW') => void;
}

const MentalLoadModal: React.FC<MentalLoadModalProps> = ({
    isOpen,
    onClose,
    onComplete
}) => {
    const [step, setStep] = useState<'loading' | 'question' | 'analyzing' | 'done'>('loading');
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [status, setStatus] = useState<'OK' | 'HIGH' | 'LOW' | null>(null);

    useEffect(() => {
        if (isOpen && step === 'loading') {
            fetchQuestion();
        }
    }, [isOpen, step]);

    const fetchQuestion = async () => {
        try {
            const data = await api.getMentalLoadQuestion();
            setQuestion(data.question);
            setStep('question');
        } catch (e) {
            setQuestion("How would you describe your mental energy right now?");
            setStep('question');
        }
    };

    const handleSubmit = async () => {
        if (!answer.trim()) return;
        setStep('analyzing');
        try {
            const result = await api.analyzeMentalLoadAnswer(answer);
            setStatus(result.status);
            setStep('done');
            setTimeout(() => {
                onComplete(result.status);
                onClose();
            }, 1500);
        } catch (e) {
            onComplete('OK');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-sm border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-border/10">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-violet-500" />
                        <h2 className="text-sm font-bold text-foreground">Mindful Check-in</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted/20 rounded-full transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-8">
                    {step === 'loading' ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                            <p className="text-xs text-muted-foreground animate-pulse">Personalizing your check-in...</p>
                        </div>
                    ) : step === 'question' ? (
                        <div className="space-y-6">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-4 h-4 text-violet-500" />
                                </div>
                                <div className="bg-muted/20 rounded-2xl rounded-tl-none px-4 py-3 border border-border/50">
                                    <p className="text-sm text-foreground leading-relaxed">{question}</p>
                                </div>
                            </div>

                            <textarea
                                autoFocus
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="Write how you feel..."
                                className="w-full bg-muted/10 border border-border/30 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all resize-none min-h-[120px]"
                            />

                            <button
                                onClick={handleSubmit}
                                disabled={!answer.trim()}
                                className="w-full py-4 rounded-2xl bg-violet-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Send className="w-4 h-4" />
                                Send Assessment
                            </button>
                        </div>
                    ) : step === 'analyzing' ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                            <div className="relative">
                                <Brain className="w-12 h-12 text-violet-500 animate-pulse" />
                                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-500 animate-bounce" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground mb-1">AI Analysis in Progress</p>
                                <p className="text-xs text-muted-foreground">Understanding your mental state...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 gap-4 text-center animate-in zoom-in duration-300">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground mb-1">Assessment Complete</p>
                                <p className="text-xs text-muted-foreground uppercase tracking-tight">Status: <span className="text-violet-500 font-bold">{status}</span></p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentalLoadModal;
