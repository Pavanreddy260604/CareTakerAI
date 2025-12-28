import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface FocusTimerProps {
    onSessionComplete?: (duration: number) => void;
    onClose: () => void;
}

type TimerState = 'idle' | 'focus' | 'break' | 'paused';

const FOCUS_DURATIONS = [
    { label: '25m', value: 25 * 60, desc: 'Pomodoro' },
    { label: '45m', value: 45 * 60, desc: 'Deep Work' },
    { label: '90m', value: 90 * 60, desc: 'Flow State' },
];

const BREAK_DURATION = 5 * 60;

export function FocusTimer({ onSessionComplete, onClose }: FocusTimerProps) {
    const [state, setState] = useState<TimerState>('idle');
    const [selectedDuration, setSelectedDuration] = useState(FOCUS_DURATIONS[0].value);
    const [timeRemaining, setTimeRemaining] = useState(selectedDuration);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [totalFocusTime, setTotalFocusTime] = useState(0);
    const [weeklyStats, setWeeklyStats] = useState<{ totalSessions: number; totalMinutes: number } | null>(null);

    // Refs for interval and state access inside interval
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const sessionsRef = useRef(sessionsCompleted);
    const totalTimeRef = useRef(totalFocusTime);

    const { toast } = useToast();

    // Sync refs with state
    useEffect(() => {
        sessionsRef.current = sessionsCompleted;
        totalTimeRef.current = totalFocusTime;
    }, [sessionsCompleted, totalFocusTime]);

    // Load saved stats
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

        // Fetch weekly stats
        const fetchWeeklyStats = async () => {
            try {
                const stats = await api.getFocusStats();
                setWeeklyStats(stats);
            } catch (e) { }
        };
        fetchWeeklyStats();
    }, []);

    // Save stats
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

    // REAL-TIME COUNTDOWN WITH TARGET TIME LOGIC
    useEffect(() => {
        if (state === 'focus' || state === 'break') {
            const now = Date.now();
            // Calculate absolute target end time
            const targetTime = now + (timeRemaining * 1000);

            intervalRef.current = setInterval(() => {
                const currentTime = Date.now();
                const secondsLeft = Math.ceil((targetTime - currentTime) / 1000);
                const newRemaining = Math.max(0, secondsLeft);

                setTimeRemaining(newRemaining);

                if (newRemaining <= 0) {
                    if (intervalRef.current) clearInterval(intervalRef.current);

                    if (state === 'focus') {
                        // Use refs to get current values without stale closures
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
            }, 100); // Check every 100ms for responsiveness
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [state, selectedDuration]); // Minimal dependencies to ensure stability

    const startFocus = useCallback(() => {
        setTimeRemaining(selectedDuration);
        setState('focus');
        toast({ title: '🧘 Focus Started!', description: `${selectedDuration / 60} min session. Go!` });
    }, [selectedDuration, toast]);

    const pauseResume = useCallback(() => {
        if (state === 'focus') {
            setState('paused');
        } else if (state === 'paused') {
            setState('focus');
        }
    }, [state]);

    const stopTimer = useCallback(() => {
        if ((state === 'focus' || state === 'paused') && selectedDuration - timeRemaining > 60) {
            const elapsed = selectedDuration - timeRemaining;
            setTotalFocusTime(t => t + elapsed);
            saveStats(sessionsCompleted, totalFocusTime + elapsed, elapsed);
            toast({ title: '⏹️ Stopped', description: `${Math.round(elapsed / 60)} min saved` });
        }
        setState('idle');
        setTimeRemaining(selectedDuration);
    }, [state, selectedDuration, timeRemaining, totalFocusTime, sessionsCompleted, saveStats, toast]);

    // UI Helpers
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const total = state === 'break' ? BREAK_DURATION : selectedDuration;
    const progress = ((total - timeRemaining) / total) * 100;
    const circumference = 2 * Math.PI * 120;
    const strokeDashoffset = circumference * (1 - progress / 100);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col safe-area-bottom">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-muted/20">
                <h2 className="text-lg font-mono font-bold text-primary flex items-center gap-2">
                    🧘 Focus Timer
                </h2>
                <button onClick={onClose} className="text-muted-foreground hover:text-white text-2xl p-2">✕</button>
            </div>

            {/* Main */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
                {/* Timer Circle */}
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
                        <circle cx="130" cy="130" r="120" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                        <circle
                            cx="130" cy="130" r="120" fill="none" strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                            className={`transition-all duration-300 ${state === 'break' ? 'stroke-cyan-500' :
                                state === 'focus' ? 'stroke-primary' :
                                    state === 'paused' ? 'stroke-yellow-500' : 'stroke-muted/40'
                                }`}
                        />
                    </svg>

                    {/* Center - LIVE COUNTDOWN */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="flex items-baseline gap-1">
                            <span className={`text-6xl sm:text-7xl font-mono font-bold tabular-nums ${state === 'break' ? 'text-cyan-500' :
                                state === 'focus' ? 'text-primary' :
                                    state === 'paused' ? 'text-yellow-500' : 'text-foreground'
                                }`}>
                                {minutes.toString().padStart(2, '0')}
                            </span>
                            <span className={`text-5xl sm:text-6xl font-mono font-bold ${(state === 'focus' || state === 'break') ? 'animate-pulse' : ''
                                } ${state === 'break' ? 'text-cyan-500' :
                                    state === 'focus' ? 'text-primary' :
                                        state === 'paused' ? 'text-yellow-500' : 'text-foreground'
                                }`}>:</span>
                            <span className={`text-6xl sm:text-7xl font-mono font-bold tabular-nums transition-all duration-100 ${state === 'break' ? 'text-cyan-500' :
                                state === 'focus' ? 'text-primary' :
                                    state === 'paused' ? 'text-yellow-500' : 'text-foreground'
                                }`}>
                                {seconds.toString().padStart(2, '0')}
                            </span>
                        </div>

                        {/* State Badge */}
                        <div className={`mt-3 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${state === 'break' ? 'bg-cyan-500/20 text-cyan-400' :
                            state === 'focus' ? 'bg-primary/20 text-primary' :
                                state === 'paused' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted/20 text-muted-foreground'
                            }`}>
                            {state === 'idle' && '⏸ Ready'}
                            {state === 'focus' && '🔥 Focusing'}
                            {state === 'paused' && '⏸ Paused'}
                            {state === 'break' && '☕ Break Time'}
                        </div>
                    </div>
                </div>

                {/* Duration Selection */}
                {state === 'idle' && (
                    <div className="flex gap-3 mb-6">
                        {FOCUS_DURATIONS.map(d => (
                            <button
                                key={d.value}
                                onClick={() => { setSelectedDuration(d.value); setTimeRemaining(d.value); }}
                                className={`px-4 py-3 rounded-xl font-mono transition-all flex flex-col items-center ${selectedDuration === d.value
                                    ? 'bg-primary text-black font-bold scale-105 shadow-lg'
                                    : 'bg-muted/20 text-muted-foreground hover:text-white'
                                    }`}
                            >
                                <span className="text-lg font-bold">{d.label}</span>
                                <span className="text-[10px] opacity-70">{d.desc}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Controls */}
                <div className="flex gap-3">
                    {state === 'idle' && (
                        <button onClick={startFocus}
                            className="px-10 py-4 bg-primary text-black font-mono font-bold rounded-xl text-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                            ▶ START
                        </button>
                    )}

                    {(state === 'focus' || state === 'paused') && (
                        <>
                            <button onClick={pauseResume}
                                className="px-6 py-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 font-mono font-bold rounded-xl">
                                {state === 'paused' ? '▶ RESUME' : '⏸ PAUSE'}
                            </button>
                            <button onClick={stopTimer}
                                className="px-6 py-3 bg-destructive/20 text-destructive border border-destructive/50 font-mono font-bold rounded-xl">
                                ⏹ STOP
                            </button>
                        </>
                    )}

                    {state === 'break' && (
                        <button onClick={() => { setState('idle'); setTimeRemaining(selectedDuration); }}
                            className="px-6 py-3 bg-cyan-500/20 text-cyan-500 border border-cyan-500/50 font-mono font-bold rounded-xl">
                            ⏭ SKIP BREAK
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Footer */}
            <div className="p-4 border-t border-muted/20 bg-muted/5">
                <div className="grid grid-cols-3 gap-4 text-center max-w-sm mx-auto">
                    <div>
                        <p className="text-2xl font-mono font-bold text-primary">{sessionsCompleted}</p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Today</p>
                    </div>
                    <div className="border-x border-muted/30">
                        <p className="text-2xl font-mono font-bold text-cyan-500">{Math.round(totalFocusTime / 60)}</p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Minutes</p>
                    </div>
                    <div>
                        <p className="text-2xl font-mono font-bold text-yellow-500">{weeklyStats?.totalSessions || 0}</p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Week</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FocusTimer;
