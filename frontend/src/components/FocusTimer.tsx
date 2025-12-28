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
    const [expanded, setExpanded] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const { toast } = useToast();

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

    // REAL-TIME LIVE COUNTDOWN - Updates every second precisely
    useEffect(() => {
        if (state === 'focus' || state === 'break') {
            startTimeRef.current = Date.now();
            const targetDuration = state === 'break' ? BREAK_DURATION : selectedDuration;

            // Initial remaining time
            const initialRemaining = timeRemaining;

            intervalRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                const newRemaining = Math.max(0, initialRemaining - elapsed);

                setTimeRemaining(newRemaining);

                if (newRemaining <= 0) {
                    if (intervalRef.current) clearInterval(intervalRef.current);

                    if (state === 'focus') {
                        const focusDuration = selectedDuration;
                        const newSessions = sessionsCompleted + 1;
                        const newTotalTime = totalFocusTime + focusDuration;

                        setSessionsCompleted(newSessions);
                        setTotalFocusTime(newTotalTime);
                        saveStats(newSessions, newTotalTime, focusDuration);
                        onSessionComplete?.(focusDuration);

                        // Notification
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('🎉 Focus Complete!', {
                                body: `${focusDuration / 60} min done! Take a break.`,
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
            }, 100); // Update every 100ms for smooth countdown

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
    }, [state, selectedDuration, sessionsCompleted, totalFocusTime, onSessionComplete, saveStats, toast]);

    const startFocus = useCallback(() => {
        setTimeRemaining(selectedDuration);
        setState('focus');
        toast({ title: '🧘 Focus Started!', description: `${selectedDuration / 60} min session. Go!` });
    }, [selectedDuration, toast]);

    const pauseResume = useCallback(() => {
        if (state === 'focus') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setState('paused');
        } else if (state === 'paused') {
            setState('focus');
        }
    }, [state]);

    const stopTimer = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if ((state === 'focus' || state === 'paused') && selectedDuration - timeRemaining > 60) {
            const elapsed = selectedDuration - timeRemaining;
            setTotalFocusTime(t => t + elapsed);
            saveStats(sessionsCompleted, totalFocusTime + elapsed, elapsed);
            toast({ title: '⏹️ Stopped', description: `${Math.round(elapsed / 60)} min saved` });
        }
        setState('idle');
        setTimeRemaining(selectedDuration);
    }, [state, selectedDuration, timeRemaining, totalFocusTime, sessionsCompleted, saveStats, toast]);

    // Format time with live seconds
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    // Progress percentage
    const total = state === 'break' ? BREAK_DURATION : selectedDuration;
    const progress = ((total - timeRemaining) / total) * 100;

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${expanded ? 'pb-safe' : ''
            }`}>
            {/* Snackbar Container */}
            <div className={`mx-2 sm:mx-4 mb-2 sm:mb-4 bg-[#0a0a0a] border rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${state === 'focus' ? 'border-primary/50 shadow-primary/20' :
                    state === 'break' ? 'border-cyan-500/50 shadow-cyan-500/20' :
                        state === 'paused' ? 'border-yellow-500/50 shadow-yellow-500/20' :
                            'border-muted/30'
                }`}>
                {/* Progress Bar */}
                {(state === 'focus' || state === 'break') && (
                    <div className="h-1 bg-muted/20">
                        <div
                            className={`h-full transition-all duration-100 ${state === 'break' ? 'bg-cyan-500' : 'bg-primary'
                                }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Main Content */}
                <div className="p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                        {/* Left: Timer Display */}
                        <div className="flex items-center gap-3">
                            {/* Live Countdown */}
                            <div className={`font-mono font-bold text-2xl sm:text-3xl tabular-nums ${state === 'focus' ? 'text-primary' :
                                    state === 'break' ? 'text-cyan-500' :
                                        state === 'paused' ? 'text-yellow-500' :
                                            'text-foreground'
                                }`}>
                                <span>{minutes.toString().padStart(2, '0')}</span>
                                <span className={state === 'focus' || state === 'break' ? 'animate-pulse' : ''}>:</span>
                                <span className={state === 'focus' || state === 'break' ? 'transition-all duration-100' : ''}>
                                    {seconds.toString().padStart(2, '0')}
                                </span>
                            </div>

                            {/* State Badge */}
                            <span className={`hidden sm:inline-flex px-2 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${state === 'focus' ? 'bg-primary/20 text-primary' :
                                    state === 'break' ? 'bg-cyan-500/20 text-cyan-500' :
                                        state === 'paused' ? 'bg-yellow-500/20 text-yellow-500' :
                                            'bg-muted/20 text-muted-foreground'
                                }`}>
                                {state === 'idle' && '⏸ Ready'}
                                {state === 'focus' && '🔥 Focus'}
                                {state === 'paused' && '⏸ Paused'}
                                {state === 'break' && '☕ Break'}
                            </span>
                        </div>

                        {/* Right: Controls */}
                        <div className="flex items-center gap-2">
                            {state === 'idle' && (
                                <>
                                    {/* Duration Pills */}
                                    <div className="hidden sm:flex gap-1">
                                        {FOCUS_DURATIONS.map(d => (
                                            <button
                                                key={d.value}
                                                onClick={() => { setSelectedDuration(d.value); setTimeRemaining(d.value); }}
                                                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${selectedDuration === d.value
                                                        ? 'bg-primary text-black font-bold'
                                                        : 'bg-muted/20 text-muted-foreground hover:text-white'
                                                    }`}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={startFocus}
                                        className="px-4 py-2 bg-primary text-black font-mono font-bold rounded-xl text-sm hover:bg-primary/90 transition-all"
                                    >
                                        ▶ Start
                                    </button>
                                </>
                            )}

                            {(state === 'focus' || state === 'paused') && (
                                <>
                                    <button
                                        onClick={pauseResume}
                                        className="px-3 py-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 font-mono font-bold rounded-lg text-sm"
                                    >
                                        {state === 'paused' ? '▶' : '⏸'}
                                    </button>
                                    <button
                                        onClick={stopTimer}
                                        className="px-3 py-2 bg-destructive/20 text-destructive border border-destructive/50 font-mono font-bold rounded-lg text-sm"
                                    >
                                        ⏹
                                    </button>
                                </>
                            )}

                            {state === 'break' && (
                                <button
                                    onClick={() => { setState('idle'); setTimeRemaining(selectedDuration); }}
                                    className="px-3 py-2 bg-cyan-500/20 text-cyan-500 border border-cyan-500/50 font-mono font-bold rounded-lg text-sm"
                                >
                                    Skip
                                </button>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="p-2 text-muted-foreground hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Expanded Stats */}
                    {expanded && state === 'idle' && (
                        <div className="mt-3 pt-3 border-t border-muted/20">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-4 text-xs font-mono">
                                    <span className="text-muted-foreground">
                                        Today: <span className="text-primary font-bold">{sessionsCompleted}</span> sessions
                                    </span>
                                    <span className="text-muted-foreground">
                                        <span className="text-cyan-500 font-bold">{Math.round(totalFocusTime / 60)}</span> min focused
                                    </span>
                                </div>

                                {/* Mobile Duration Selection */}
                                <div className="flex sm:hidden gap-1">
                                    {FOCUS_DURATIONS.map(d => (
                                        <button
                                            key={d.value}
                                            onClick={() => { setSelectedDuration(d.value); setTimeRemaining(d.value); }}
                                            className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${selectedDuration === d.value
                                                    ? 'bg-primary text-black font-bold'
                                                    : 'bg-muted/20 text-muted-foreground'
                                                }`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FocusTimer;
