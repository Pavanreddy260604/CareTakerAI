import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

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

const BREAK_DURATION = 5 * 60; // 5 minutes

export function FocusTimer({ onSessionComplete, onClose }: FocusTimerProps) {
    const [state, setState] = useState<TimerState>('idle');
    const [selectedDuration, setSelectedDuration] = useState(FOCUS_DURATIONS[0].value);
    const [timeRemaining, setTimeRemaining] = useState(selectedDuration);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [totalFocusTime, setTotalFocusTime] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
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
            } catch (e) {
                // Ignore parse errors
            }
        }
    }, []);

    // Save stats to localStorage
    const saveStats = useCallback((sessions: number, totalTime: number) => {
        localStorage.setItem('focus_stats', JSON.stringify({
            date: new Date().toDateString(),
            sessions,
            totalTime
        }));
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

    // Timer tick
    useEffect(() => {
        if (state === 'focus' || state === 'break') {
            intervalRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        // Timer complete
                        if (state === 'focus') {
                            const focusDuration = selectedDuration;
                            const newSessions = sessionsCompleted + 1;
                            const newTotalTime = totalFocusTime + focusDuration;

                            setSessionsCompleted(newSessions);
                            setTotalFocusTime(newTotalTime);
                            saveStats(newSessions, newTotalTime);

                            onSessionComplete?.(focusDuration);

                            // Notify user
                            toast({
                                title: '🎉 Focus Session Complete!',
                                description: `Great work! Take a ${BREAK_DURATION / 60} minute break.`
                            });

                            // Try to send notification
                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification('Focus Session Complete! 🎉', {
                                    body: 'Great work! Time for a short break.',
                                    icon: '/favicon.svg'
                                });
                            }

                            // Switch to break
                            setState('break');
                            return BREAK_DURATION;
                        } else {
                            // Break complete
                            toast({
                                title: '⏰ Break Over',
                                description: 'Ready for another focus session?'
                            });
                            setState('idle');
                            return selectedDuration;
                        }
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [state, selectedDuration, sessionsCompleted, totalFocusTime, onSessionComplete, saveStats, toast]);

    const startFocus = useCallback(() => {
        setTimeRemaining(selectedDuration);
        startTimeRef.current = Date.now();
        setState('focus');

        toast({
            title: '🧘 Focus Mode Active',
            description: `${selectedDuration / 60} minute session started. Stay focused!`
        });
    }, [selectedDuration, toast]);

    const pauseResume = useCallback(() => {
        if (state === 'focus') {
            setState('paused');
        } else if (state === 'paused') {
            setState('focus');
        }
    }, [state]);

    const stopTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Calculate partial focus time if in focus mode
        if (state === 'focus' || state === 'paused') {
            const elapsed = selectedDuration - timeRemaining;
            if (elapsed > 60) { // Only count if more than 1 minute
                const newTotalTime = totalFocusTime + elapsed;
                setTotalFocusTime(newTotalTime);
                saveStats(sessionsCompleted, newTotalTime);
            }
        }

        setState('idle');
        setTimeRemaining(selectedDuration);
    }, [state, selectedDuration, timeRemaining, totalFocusTime, sessionsCompleted, saveStats]);

    const skipBreak = useCallback(() => {
        if (state === 'break') {
            setState('idle');
            setTimeRemaining(selectedDuration);
        }
    }, [state, selectedDuration]);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col safe-area-bottom">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-muted/20">
                <h2 className="text-lg font-mono font-bold text-primary flex items-center gap-2">
                    <span>🧘</span>
                    <span>Focus Mode</span>
                </h2>
                <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-white text-2xl p-2 transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                {/* Timer Display */}
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-8">
                    {/* Progress Ring */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="50%"
                            cy="50%"
                            r="45%"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-muted/20"
                        />
                        <circle
                            cx="50%"
                            cy="50%"
                            r="45%"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - getProgress() / 100)}`}
                            className={`transition-all duration-1000 ${state === 'break' ? 'text-cyan-500' :
                                    state === 'focus' ? 'text-primary' :
                                        'text-muted/50'
                                }`}
                        />
                    </svg>

                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className={`text-5xl sm:text-6xl font-mono font-bold ${state === 'break' ? 'text-cyan-500' :
                                state === 'focus' ? 'text-primary' :
                                    'text-foreground'
                            }`}>
                            {formatTime(timeRemaining)}
                        </p>
                        <p className="text-sm font-mono text-muted-foreground mt-2 uppercase tracking-widest">
                            {state === 'idle' && 'Ready'}
                            {state === 'focus' && 'Focusing'}
                            {state === 'paused' && 'Paused'}
                            {state === 'break' && 'Break Time'}
                        </p>
                    </div>
                </div>

                {/* Duration Selection (only in idle) */}
                {state === 'idle' && (
                    <div className="flex gap-2 mb-8">
                        {FOCUS_DURATIONS.map(d => (
                            <button
                                key={d.value}
                                onClick={() => {
                                    setSelectedDuration(d.value);
                                    setTimeRemaining(d.value);
                                }}
                                className={`px-4 py-2 rounded-xl font-mono text-sm transition-all ${selectedDuration === d.value
                                        ? 'bg-primary text-black font-bold'
                                        : 'bg-muted/20 text-muted-foreground hover:text-white'
                                    }`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Control Buttons */}
                <div className="flex gap-3">
                    {state === 'idle' && (
                        <button
                            onClick={startFocus}
                            className="px-8 py-4 bg-primary text-black font-mono font-bold rounded-xl text-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                        >
                            START FOCUS
                        </button>
                    )}

                    {(state === 'focus' || state === 'paused') && (
                        <>
                            <button
                                onClick={pauseResume}
                                className="px-6 py-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 font-mono rounded-xl hover:bg-yellow-500/30 transition-all"
                            >
                                {state === 'paused' ? 'RESUME' : 'PAUSE'}
                            </button>
                            <button
                                onClick={stopTimer}
                                className="px-6 py-3 bg-destructive/20 text-destructive border border-destructive/50 font-mono rounded-xl hover:bg-destructive/30 transition-all"
                            >
                                STOP
                            </button>
                        </>
                    )}

                    {state === 'break' && (
                        <button
                            onClick={skipBreak}
                            className="px-6 py-3 bg-cyan-500/20 text-cyan-500 border border-cyan-500/50 font-mono rounded-xl hover:bg-cyan-500/30 transition-all"
                        >
                            SKIP BREAK
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Footer */}
            <div className="p-4 border-t border-muted/20">
                <div className="flex justify-center gap-8 text-center">
                    <div>
                        <p className="text-2xl font-mono font-bold text-primary">{sessionsCompleted}</p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Sessions Today</p>
                    </div>
                    <div>
                        <p className="text-2xl font-mono font-bold text-cyan-500">
                            {Math.round(totalFocusTime / 60)}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Minutes Focused</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FocusTimer;
