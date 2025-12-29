import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Brain, X, Play, Pause, Square, SkipForward, Clock, History, Calendar, PartyPopper, Sparkles, Zap, Flame } from 'lucide-react';

interface FocusTimerProps {
    onSessionComplete?: (duration: number) => void;
    onClose: () => void;
    capacity: number; // Add capacity prop
}

type TimerState = 'idle' | 'focus' | 'break' | 'paused';

const FOCUS_DURATIONS = [
    { label: '15m', value: 15 * 60, desc: 'Micro-Session', minCapacity: 0 },
    { label: '25m', value: 25 * 60, desc: 'Pomodoro', minCapacity: 30 },
    { label: '45m', value: 45 * 60, desc: 'Deep Work', minCapacity: 60 },
    { label: '90m', value: 90 * 60, desc: 'Flow State', minCapacity: 80 },
];

const BREAK_DURATION = 5 * 60;

export function FocusTimer({ onSessionComplete, onClose, capacity }: FocusTimerProps) {
    const [state, setState] = useState<TimerState>('idle');
    const [selectedDuration, setSelectedDuration] = useState(FOCUS_DURATIONS[0].value);
    const [timeRemaining, setTimeRemaining] = useState(selectedDuration);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [totalFocusTime, setTotalFocusTime] = useState(0);
    const [weeklyStats, setWeeklyStats] = useState<{ totalSessions: number; totalMinutes: number } | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const sessionsRef = useRef(sessionsCompleted);
    const totalTimeRef = useRef(totalFocusTime);

    const { toast } = useToast();

    // Sync refs
    useEffect(() => {
        sessionsRef.current = sessionsCompleted;
        totalTimeRef.current = totalFocusTime;
    }, [sessionsCompleted, totalFocusTime]);

    // Load stats
    useEffect(() => {
        const savedStats = localStorage.getItem('focus_stats');
        if (savedStats) {
            try {
                const stats = JSON.parse(savedStats);
                const today = new Date().toDateString();
                if (stats.date === today) {
                    setSessionsCompleted(stats.sessions || 0);
                    setTotalFocusTime(stats.totalTime || 0);
                }
            } catch (e) { }
        }

        api.getFocusStats().then(setWeeklyStats).catch(() => { });
    }, []);

    const saveStats = useCallback(async (sessions: number, totalTime: number, sessionDuration?: number) => {
        localStorage.setItem('focus_stats', JSON.stringify({
            date: new Date().toDateString(),
            sessions,
            totalTime
        }));

        if (sessionDuration && sessionDuration > 60) {
            try {
                await api.saveFocusSession(sessionDuration);
            } catch (e) { }
        }
    }, []);

    // Timer Logic
    useEffect(() => {
        if (state === 'focus' || state === 'break') {
            const now = Date.now();
            const targetTime = now + (timeRemaining * 1000);

            intervalRef.current = setInterval(() => {
                const currentTime = Date.now();
                const secondsLeft = Math.ceil((targetTime - currentTime) / 1000);
                const newRemaining = Math.max(0, secondsLeft);

                setTimeRemaining(newRemaining);

                if (newRemaining <= 0) {
                    if (intervalRef.current) clearInterval(intervalRef.current);

                    if (state === 'focus') {
                        const newSessions = sessionsRef.current + 1;
                        const newTotal = totalTimeRef.current + selectedDuration;

                        setSessionsCompleted(newSessions);
                        setTotalFocusTime(newTotal);
                        saveStats(newSessions, newTotal, selectedDuration);
                        onSessionComplete?.(selectedDuration);

                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('🎉 Focus Complete!', {
                                body: `${selectedDuration / 60} min done!`,
                                icon: '/favicon.svg'
                            });
                        }

                        // Sound
                        try {
                            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQwwpODx2Y1PCSmo7eDGdDUHM7Tz7bhcFBRU8/r/uFoNCGH4AAD/olg');
                            audio.volume = 0.3;
                            audio.play().catch(() => { });
                        } catch (e) { }

                        toast({ title: '🎉 Focus Complete!', description: 'Time for a break!' });
                        setState('break');
                        setTimeRemaining(BREAK_DURATION);
                    } else {
                        toast({ title: '⏰ Break Over!', description: 'Ready for another?' });
                        setState('idle');
                        setTimeRemaining(selectedDuration);
                    }
                }
            }, 100);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [state, selectedDuration]);

    const startFocus = useCallback(() => {
        setTimeRemaining(selectedDuration);
        setState('focus');
        toast({ title: '🧘 Focus Started!', description: `${selectedDuration / 60} min session. Go!` });
    }, [selectedDuration, toast]);

    const pauseResume = useCallback(() => {
        if (state === 'focus') setState('paused');
        else if (state === 'paused') setState('focus');
    }, [state]);

    const stopTimer = useCallback(() => {
        if ((state === 'focus' || state === 'paused') && selectedDuration - timeRemaining > 60) {
            const elapsed = selectedDuration - timeRemaining;
            setTotalFocusTime(t => t + elapsed);
            saveStats(sessionsCompleted, totalFocusTime + elapsed, elapsed);
        }
        setState('idle');
        setTimeRemaining(selectedDuration);
    }, [state, selectedDuration, timeRemaining, totalFocusTime, sessionsCompleted, saveStats]);

    // UI Calculations
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const total = state === 'break' ? BREAK_DURATION : selectedDuration;
    const progress = ((total - timeRemaining) / total) * 100;
    const circumference = 2 * Math.PI * 120;
    const strokeDashoffset = circumference * (1 - progress / 100);

    // Gradient definitions
    const gradientId = "timerGradient";

    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-3xl z-50 flex flex-col safe-area-bottom animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center p-6 w-full max-w-lg mx-auto">
                <h2 className="text-2xl font-display font-medium text-foreground flex items-center gap-2">
                    <Brain className="w-8 h-8 text-primary" /> Focus Zone
                </h2>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted/20 hover:bg-muted/30 flex items-center justify-center transition-all">
                    <X className="w-6 h-6 text-muted-foreground" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-lg mx-auto">

                {/* Timer Visualization */}
                <div className="relative w-72 h-72 sm:w-80 sm:h-80 mb-10">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
                        <defs>
                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#2dd4bf" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                        {/* Track */}
                        <circle cx="130" cy="130" r="120" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/10" />
                        {/* Progress */}
                        <circle
                            cx="130" cy="130" r="120" fill="none" strokeWidth="12" strokeLinecap="round"
                            stroke={`url(#${gradientId})`}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className={`transition-all duration-300 ${state === 'break' ? 'stroke-amber-400' : ''}`}
                        />
                    </svg>

                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="flex items-baseline gap-1">
                            <span className="text-7xl font-display font-bold tracking-tighter text-foreground tabular-nums">
                                {minutes.toString().padStart(2, '0')}
                            </span>
                            <span className={`text-6xl font-display font-bold text-muted-foreground/50 -translate-y-2 ${state === 'focus' ? 'animate-pulse' : ''}`}>:</span>
                            <span className="text-7xl font-display font-bold tracking-tighter text-foreground tabular-nums">
                                {seconds.toString().padStart(2, '0')}
                            </span>
                        </div>

                        <div className={`mt-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md ${state === 'break' ? 'bg-amber-500/20 text-amber-400' :
                            state === 'focus' ? 'bg-primary/20 text-primary' :
                                'bg-muted/20 text-muted-foreground'
                            }`}>
                            {state === 'idle' ? 'Ready to Focus' : state === 'break' ? 'Recharging' : state === 'focus' ? 'Deep Work' : 'Paused'}
                        </div>
                    </div>
                </div>

                {/* Duration Selector */}
                {state === 'idle' && (
                    <div className="grid grid-cols-3 gap-3 w-full mb-8">
                        {FOCUS_DURATIONS.map(d => (
                            <button
                                key={d.value}
                                onClick={() => { setSelectedDuration(d.value); setTimeRemaining(d.value); }}
                                className={`p-4 rounded-2xl transition-all duration-300 flex flex-col items-center ${selectedDuration === d.value
                                    ? 'bg-primary text-primary-foreground scale-105 shadow-glow'
                                    : 'bg-muted/20 hover:bg-muted/30 text-muted-foreground'
                                    }`}
                            >
                                <span className="text-xl font-bold font-display">{d.label}</span>
                                <span className="text-[10px] uppercase tracking-wide opacity-80">{d.desc}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Controls */}
                <div className="flex gap-4 w-full">
                    {state === 'idle' ? (
                        <button onClick={startFocus} className="btn-primary w-full text-lg shadow-glow flex items-center justify-center gap-2">
                            <Play className="w-5 h-5 fill-current" /> Start Session
                        </button>
                    ) : (
                        <>
                            {state !== 'break' && (
                                <>
                                    <button onClick={pauseResume} className="btn-glass flex-1 border-white/10 text-foreground flex items-center justify-center gap-2">
                                        {state === 'paused' ? <><Play className="w-4 h-4 fill-current" /> Resume</> : <><Pause className="w-4 h-4 fill-current" /> Pause</>}
                                    </button>
                                    <button onClick={stopTimer} className="btn-glass flex-1 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 flex items-center justify-center gap-2">
                                        <Square className="w-4 h-4 fill-current" /> End Session
                                    </button>
                                </>
                            )}
                            {state === 'break' && (
                                <button onClick={() => { setState('idle'); setTimeRemaining(selectedDuration); }} className="btn-secondary w-full flex items-center justify-center gap-2">
                                    <SkipForward className="w-5 h-5" /> Skip Break
                                </button>
                            )}
                        </>
                    )}
                </div>

            </div>

            {/* Footer Stats */}
            <div className="p-6 w-full max-w-lg mx-auto">
                <div className="glass-card p-4 grid grid-cols-3 divide-x divide-border/20">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                            <History className="w-3 h-3" />
                            <span className="text-[10px] uppercase tracking-wider">Sessions</span>
                        </div>
                        <span className="block text-2xl font-bold text-foreground">{sessionsCompleted}</span>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] uppercase tracking-wider">Minutes</span>
                        </div>
                        <span className="block text-2xl font-bold text-primary">{Math.round(totalFocusTime / 60)}</span>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[10px] uppercase tracking-wider">Weekly</span>
                        </div>
                        <span className="block text-2xl font-bold text-amber-500">{weeklyStats?.totalSessions || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default FocusTimer;
