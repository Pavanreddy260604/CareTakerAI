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
            loadDailyQuestion();
        }
    }, [isOpen, step]);

    const loadDailyQuestion = async () => {
        const today = new Date().toDateString();
        const cached = localStorage.getItem('mental_load_question');

        if (cached) {
            try {
                const data = JSON.parse(cached);
                if (data.date === today && data.question) {
                    setQuestion(data.question);
                    setStep('question');
                    return;
                }
            } catch (e) { /* ignore */ }
        }

        try {
            const data = await api.getMentalLoadQuestion();
            setQuestion(data.question);
            localStorage.setItem('mental_load_question', JSON.stringify({
                date: today,
                question: data.question
            }));
            setStep('question');
        } catch (e) {
            setQuestion("In one word, how do you feel right now?");
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

    const getStatusColor = (s: string | null) => {
        switch (s) {
            case 'HIGH': return 'text-red-500 bg-red-500/10';
            case 'LOW': return 'text-amber-500 bg-amber-500/10';
            case 'OK': return 'text-green-500 bg-green-500/10';
            default: return 'text-violet-500 bg-violet-500/10';
        }
    };

    const getStatusMessage = (s: string | null) => {
        switch (s) {
            case 'HIGH': return 'High stress detected. Take a break.';
            case 'LOW': return 'Low energy. Be gentle today.';
            case 'OK': return 'Balanced state. Keep it up!';
            default: return '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background overflow-auto">
            <div className="min-h-screen pb-safe">
                {/* Mobile Header */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/10">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <button
                            onClick={onClose}
                            className="text-primary font-medium text-sm py-2 px-1 -ml-1 active:opacity-60"
                        >
                            Close
                        </button>
                        <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-violet-500" />
                            <h1 className="text-base font-display font-semibold text-foreground">Mind Check</h1>
                        </div>
                        <div className="w-12" /> {/* Spacer */}
                    </div>
                </div>

                <div className="px-4 py-6">
                    {step === 'loading' ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                            </div>
                            <p className="text-sm text-muted-foreground animate-pulse">Preparing your question...</p>
                        </div>
                    ) : step === 'question' ? (
                        <div className="space-y-6">
                            {/* AI Question Card */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/10">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="pt-2">
                                        <p className="text-xs text-violet-500 font-medium uppercase tracking-wider mb-1">Today's Question</p>
                                    </div>
                                </div>
                                <p className="text-lg font-medium text-foreground leading-relaxed">{question}</p>
                            </div>

                            {/* Answer Input */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                                    Your answer (1-3 words)
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="e.g., calm, stressed, tired..."
                                    maxLength={30}
                                    className="w-full bg-card border border-border/50 rounded-xl px-4 py-4 text-lg text-center font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={!answer.trim()}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20 active:opacity-90 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                Analyze
                            </button>

                            {/* Hint */}
                            <p className="text-xs text-center text-muted-foreground">
                                AI will analyze your response to understand your mental state
                            </p>
                        </div>
                    ) : step === 'analyzing' ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center">
                                    <Brain className="w-10 h-10 text-violet-500 animate-pulse" />
                                </div>
                                <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-amber-500 animate-bounce" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-foreground mb-1">Analyzing...</p>
                                <p className="text-sm text-muted-foreground">Understanding your response</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${getStatusColor(status)}`}>
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground mb-2">Assessment Complete</p>
                                <p className={`text-3xl font-display font-bold uppercase ${getStatusColor(status).split(' ')[0]}`}>
                                    {status}
                                </p>
                                <p className="text-sm text-muted-foreground mt-3">{getStatusMessage(status)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentalLoadModal;
