import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface FocusTimerProps {
    onSessionComplete?: (duration: number) => void;
    onClose: () => void;
}

type TimerState = 'idle' | 'focus' | 'break' | 'paused';

const FOCUS_DURATIONS = [
    { label: '25 min', value: 25 * 60 },
    { label: '45 min', value: 45 * 60 },
    { label: '90 min', value: 90 * 60 },
];

const BREAK_DURATION = 5 * 60;

export function FocusTimer({ onSessionComplete, onClose }: FocusTimerProps) {
    const [state, setState] = useState<TimerState>('idle');
    const [selectedDuration, setSelectedDuration] = useState(FOCUS_DURATIONS[0].value);
    const [timeRemaining, setTimeRemaining] = useState(selectedDuration);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [totalFocusTime, setTotalFocusTime] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();

    // Load saved stats from localStorage
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
    }, []);

    // Save stats locally and to backend
    const saveStats = useCallback(async (sessions: number, totalTime: number, sessionDuration?: number) => {
        // Save locally
        localStorage.setItem('focus_stats', JSON.stringify({
            date: new Date().toDateString(),
            sessions,
            totalTime
        }));

        // Save to backend if session completed
        if (sessionDuration && sessionDuration > 60) {
            try {
                await api.saveFocusSession(sessionDuration);
            } catch (e) {
                console.error('Failed to save focus session to backend:', e);
            }
        }
    }, []);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress percentage
    const getProgress = () => {
        const total = state === 'break' ? BREAK_DURATION : selectedDuration;
        return ((total - timeRemaining) / total) * 100;
    };

    // Get color based on state
    const getColor = () => {
        if (state === 'break') return 'cyan';
        if (state === 'focus') return 'primary';
        if (state === 'paused') return 'yellow';
        return 'muted';
    };

    // Timer tick
    useEffect(() => {
        if (state === 'focus' || state === 'break') {
            intervalRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        if (state === 'focus') {
                            const focusDuration = selectedDuration;
                            const newSessions = sessionsCompleted + 1;
                            const newTotalTime = totalFocusTime + focusDuration;

                            setSessionsCompleted(newSessions);
                            setTotalFocusTime(newTotalTime);
                            saveStats(newSessions, newTotalTime, focusDuration);
                            onSessionComplete?.(focusDuration);

                            toast({
                                title: '🎉 Focus Session Complete!',
                                description: `${focusDuration / 60} min of deep work! Take a break.`
                            });

                            // Notification
                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification('Focus Complete! 🎉', { body: 'Time for a break!', icon: '/favicon.svg' });
                            }

                            setState('break');
                            return BREAK_DURATION;
                        } else {
                            toast({ title: '⏰ Break Over', description: 'Ready for another round?' });
                            setState('idle');
                            return selectedDuration;
                        }
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
    }, [state, selectedDuration, sessionsCompleted, totalFocusTime, onSessionComplete, saveStats, toast]);

    const startFocus = useCallback(() => {
        setTimeRemaining(selectedDuration);
        setState('focus');
        toast({
            title: '🧘 Focus Mode Started',
            description: `${selectedDuration / 60} min session. Stay focused!`
        });
    }, [selectedDuration, toast]);

    const pauseResume = useCallback(() => {
        if (state === 'focus') {
            setState('paused');
            toast({ title: '⏸️ Paused', description: 'Timer paused' });
        } else if (state === 'paused') {
            setState('focus');
            toast({ title: '▶️ Resumed', description: 'Back to focus!' });
        }
    }, [state, toast]);

    const stopTimer = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        if (state === 'focus' || state === 'paused') {
            const elapsed = selectedDuration - timeRemaining;
            if (elapsed > 60) {
                const newTotalTime = totalFocusTime + elapsed;
                setTotalFocusTime(newTotalTime);
                saveStats(sessionsCompleted, newTotalTime, elapsed);
                toast({ title: '⏹️ Session Stopped', description: `${Math.round(elapsed / 60)} min saved.` });
            }
        }

        setState('idle');
        setTimeRemaining(selectedDuration);
    }, [state, selectedDuration, timeRemaining, totalFocusTime, sessionsCompleted, saveStats, toast]);

    const skipBreak = useCallback(() => {
        if (state === 'break') {
            setState('idle');
            setTimeRemaining(selectedDuration);
        }
    }, [state, selectedDuration]);

    // Calculate stroke dasharray for circle
    const circumference = 2 * Math.PI * 120; // radius = 120
    const strokeDashoffset = circumference * (1 - getProgress() / 100);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col safe-area-bottom">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-muted/20">
                <h2 className="text-lg font-mono font-bold text-primary flex items-center gap-2">
                    <span>🧘</span>
                    <span>Focus Timer</span>
                </h2>
                <button onClick={onClose} className="text-muted-foreground hover:text-white text-2xl p-2 transition-colors">
                    ✕
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                {/* Big Countdown Timer */}
                <div className="relative w-72 h-72 sm:w-80 sm:h-80 mb-6">
                    {/* Background Circle */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
                        <circle
                            cx="130"
                            cy="130"
                            r="120"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-muted/20"
                        />
                        {/* Progress Circle */}
                        <circle
                            cx="130"
                            cy="130"
                            r="120"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className={`transition-all duration-500 ease-out ${state === 'break' ? 'text-cyan-500' :
                                    state === 'focus' ? 'text-primary' :
                                        state === 'paused' ? 'text-yellow-500' :
                                            'text-muted/40'
                                }`}
                        />
                    </svg>

                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {/* Big Timer Display */}
                        <p className={`text-6xl sm:text-7xl font-mono font-bold tracking-tight ${state === 'break' ? 'text-cyan-500' :
                                state === 'focus' ? 'text-primary' :
                                    state === 'paused' ? 'text-yellow-500' :
                                        'text-foreground'
                            }`}>
                            {formatTime(timeRemaining)}
                        </p>

                        {/* State Label */}
                        <div className={`mt-2 px-4 py-1 rounded-full text-sm font-mono font-bold uppercase tracking-wider ${state === 'break' ? 'bg-cyan-500/20 text-cyan-400' :
                                state === 'focus' ? 'bg-primary/20 text-primary animate-pulse' :
                                    state === 'paused' ? 'bg-yellow-500/20 text-yellow-500' :
                                        'bg-muted/20 text-muted-foreground'
                            }`}>
                            {state === 'idle' && '⏸ Ready'}
                            {state === 'focus' && '🔥 Focusing'}
                            {state === 'paused' && '⏸ Paused'}
                            {state === 'break' && '☕ Break'}
                        </div>
                    </div>
                </div>

                {/* Duration Selection (only in idle) */}
                {state === 'idle' && (
                    <div className="flex gap-3 mb-6">
                        {FOCUS_DURATIONS.map(d => (
                            <button
                                key={d.value}
                                onClick={() => {
                                    setSelectedDuration(d.value);
                                    setTimeRemaining(d.value);
                                }}
                                className={`px-5 py-3 rounded-xl font-mono text-sm transition-all ${selectedDuration === d.value
                                        ? 'bg-primary text-black font-bold scale-105'
                                        : 'bg-muted/20 text-muted-foreground hover:text-white hover:bg-muted/30'
                                    }`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Control Buttons */}
                <div className="flex gap-4">
                    {state === 'idle' && (
                        <button
                            onClick={startFocus}
                            className="px-10 py-4 bg-primary text-black font-mono font-bold rounded-xl text-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                        >
                            ▶ START FOCUS
                        </button>
                    )}

                    {(state === 'focus' || state === 'paused') && (
                        <>
                            <button
                                onClick={pauseResume}
                                className="px-6 py-3 bg-yellow-500/20 text-yellow-500 border-2 border-yellow-500/50 font-mono font-bold rounded-xl hover:bg-yellow-500/30 transition-all"
                            >
                                {state === 'paused' ? '▶ RESUME' : '⏸ PAUSE'}
                            </button>
                            <button
                                onClick={stopTimer}
                                className="px-6 py-3 bg-destructive/20 text-destructive border-2 border-destructive/50 font-mono font-bold rounded-xl hover:bg-destructive/30 transition-all"
                            >
                                ⏹ STOP
                            </button>
                        </>
                    )}

                    {state === 'break' && (
                        <button
                            onClick={skipBreak}
                            className="px-6 py-3 bg-cyan-500/20 text-cyan-500 border-2 border-cyan-500/50 font-mono font-bold rounded-xl hover:bg-cyan-500/30 transition-all"
                        >
                            ⏭ SKIP BREAK
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Footer */}
            <div className="p-4 border-t border-muted/20 bg-muted/5">
                <div className="flex justify-center gap-12 text-center">
                    <div>
                        <p className="text-3xl font-mono font-bold text-primary">{sessionsCompleted}</p>
                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Sessions</p>
                    </div>
                    <div className="w-px bg-muted/30" />
                    <div>
                        <p className="text-3xl font-mono font-bold text-cyan-500">{Math.round(totalFocusTime / 60)}</p>
                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Minutes</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FocusTimer;
