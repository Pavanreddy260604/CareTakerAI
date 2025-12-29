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

    // Check for cached daily question
    useEffect(() => {
        if (isOpen && step === 'loading') {
            loadDailyQuestion();
        }
    }, [isOpen, step]);

    const loadDailyQuestion = async () => {
        // Check localStorage for today's question
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
            } catch (e) { /* ignore parse errors */ }
        }

        // Fetch new question from API
        try {
            const data = await api.getMentalLoadQuestion();
            setQuestion(data.question);
            // Cache for today
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
            case 'HIGH': return 'High stress detected. Consider a break.';
            case 'LOW': return 'Low energy. Be gentle with yourself.';
            case 'OK': return 'Balanced state. Keep it up!';
            default: return '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-border/10">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-violet-500" />
                        <h2 className="text-lg font-display font-bold text-foreground">Daily Mind Check</h2>
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
                            <p className="text-xs text-muted-foreground animate-pulse">Preparing your daily question...</p>
                        </div>
                    ) : step === 'question' ? (
                        <div className="space-y-6">
                            {/* AI Question Bubble */}
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div className="bg-muted/20 rounded-2xl rounded-tl-none px-5 py-4 border border-border/50 flex-1">
                                    <p className="text-base text-foreground leading-relaxed font-medium">{question}</p>
                                </div>
                            </div>

                            {/* Short Answer Input */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Your answer (1-3 words)</p>
                                <input
                                    type="text"
                                    autoFocus
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="e.g., calm, exhausted, focused..."
                                    maxLength={30}
                                    className="w-full bg-muted/10 border border-border/30 rounded-2xl px-4 py-4 text-lg text-center font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!answer.trim()}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20 hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Send className="w-4 h-4" />
                                Analyze
                            </button>
                        </div>
                    ) : step === 'analyzing' ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                            <div className="relative">
                                <Brain className="w-16 h-16 text-violet-500 animate-pulse" />
                                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-500 animate-bounce" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-foreground mb-1">AI Analysis in Progress</p>
                                <p className="text-sm text-muted-foreground">Understanding your response...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 gap-4 text-center animate-in zoom-in duration-300">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 ${getStatusColor(status)}`}>
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground mb-1">Assessment Complete</p>
                                <p className={`text-2xl font-display font-bold uppercase tracking-wider ${getStatusColor(status).split(' ')[0]}`}>
                                    {status}
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">{getStatusMessage(status)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentalLoadModal;
