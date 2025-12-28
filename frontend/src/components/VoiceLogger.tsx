import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface VoiceLoggerProps {
    onHealthParsed: (health: {
        water?: 'LOW' | 'OK';
        food?: 'LOW' | 'OK';
        sleep?: 'LOW' | 'OK';
        exercise?: 'PENDING' | 'DONE';
        mentalLoad?: 'LOW' | 'OK' | 'HIGH';
    }) => void;
    disabled?: boolean;
}

// Speech Recognition types
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

export function VoiceLogger({ onHealthParsed, disabled }: VoiceLoggerProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [supported, setSupported] = useState(false);
    const recognitionRef = useRef<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        // Check for browser support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            setSupported(true);
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                setTranscript(finalTranscript || interimTranscript);

                if (finalTranscript) {
                    parseAndSubmit(finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    toast({
                        title: 'Microphone Access Denied',
                        description: 'Please allow microphone access to use voice logging.',
                        variant: 'destructive'
                    });
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    // Local fallback: Parse natural language into health data
    const parseHealthFromTextLocal = useCallback((text: string) => {
        const lowerText = text.toLowerCase();
        const health: {
            water?: 'LOW' | 'OK';
            food?: 'LOW' | 'OK';
            sleep?: 'LOW' | 'OK';
            exercise?: 'PENDING' | 'DONE';
            mentalLoad?: 'LOW' | 'OK' | 'HIGH';
        } = {};

        // Water detection
        if (lowerText.includes('water') || lowerText.includes('hydrat') || lowerText.includes('drink') || lowerText.includes('liter') || lowerText.includes('litre')) {
            const waterPatterns = {
                low: ['no water', 'little water', 'forgot to drink', 'dehydrat', 'thirsty', 'less than', '0 liter', 'zero'],
                ok: ['drank', 'water', 'hydrated', '2 liter', '3 liter', 'enough water', 'good hydration', 'plenty']
            };

            if (waterPatterns.low.some(p => lowerText.includes(p))) {
                health.water = 'LOW';
            } else {
                health.water = 'OK';
            }
        }

        // Food detection
        if (lowerText.includes('food') || lowerText.includes('eat') || lowerText.includes('ate') || lowerText.includes('meal') || lowerText.includes('breakfast') || lowerText.includes('lunch') || lowerText.includes('dinner')) {
            const foodPatterns = {
                low: ['no food', 'skip', 'forgot to eat', 'hungry', 'no meal', 'light', 'only snack'],
                ok: ['ate', 'eaten', 'meal', 'breakfast', 'lunch', 'dinner', 'full', '3 meal', '2 meal']
            };

            if (foodPatterns.low.some(p => lowerText.includes(p))) {
                health.food = 'LOW';
            } else {
                health.food = 'OK';
            }
        }

        // Sleep detection
        if (lowerText.includes('sleep') || lowerText.includes('slept') || lowerText.includes('hour') || lowerText.includes('rest') || lowerText.includes('tired')) {
            const hourMatch = lowerText.match(/(\d+)\s*(hour|hr)/);
            if (hourMatch) {
                const hours = parseInt(hourMatch[1]);
                health.sleep = hours < 6 ? 'LOW' : 'OK';
            } else {
                const sleepPatterns = {
                    low: ['bad sleep', 'poor sleep', 'no sleep', 'tired', 'exhausted', 'insomnia', 'couldn\'t sleep', 'little sleep'],
                    ok: ['good sleep', 'slept well', 'rested', '7 hour', '8 hour', 'enough sleep']
                };

                if (sleepPatterns.low.some(p => lowerText.includes(p))) {
                    health.sleep = 'LOW';
                } else if (sleepPatterns.ok.some(p => lowerText.includes(p))) {
                    health.sleep = 'OK';
                }
            }
        }

        // Exercise detection
        if (lowerText.includes('exercise') || lowerText.includes('workout') || lowerText.includes('run') || lowerText.includes('gym') || lowerText.includes('walk') || lowerText.includes('sport') || lowerText.includes('yoga') || lowerText.includes('stretch')) {
            const exercisePatterns = {
                done: ['exercised', 'worked out', 'went to gym', 'ran', 'jogged', 'walked', 'yoga', 'stretched', 'played'],
                pending: ['no exercise', 'skipped workout', 'didn\'t exercise', 'no workout', 'lazy']
            };

            if (exercisePatterns.pending.some(p => lowerText.includes(p))) {
                health.exercise = 'PENDING';
            } else {
                health.exercise = 'DONE';
            }
        }

        // Mental load / Stress detection
        if (lowerText.includes('stress') || lowerText.includes('mental') || lowerText.includes('anxious') || lowerText.includes('overwhelm') || lowerText.includes('calm') || lowerText.includes('relax') || lowerText.includes('worried') || lowerText.includes('pressure')) {
            const mentalPatterns = {
                high: ['stressed', 'anxious', 'overwhelmed', 'worried', 'pressure', 'high stress', 'very stress', 'critical'],
                low: ['calm', 'relaxed', 'peaceful', 'low stress', 'no stress', 'chill'],
                ok: ['moderate', 'okay stress', 'manageable', 'fine', 'normal']
            };

            if (mentalPatterns.high.some(p => lowerText.includes(p))) {
                health.mentalLoad = 'HIGH';
            } else if (mentalPatterns.low.some(p => lowerText.includes(p))) {
                health.mentalLoad = 'LOW';
            } else {
                health.mentalLoad = 'OK';
            }
        }

        return health;
    }, []);

    const parseAndSubmit = useCallback(async (text: string) => {
        setIsProcessing(true);

        try {
            let health: any = {};
            let usedAI = false;

            // Try backend AI parsing first
            try {
                console.log('Voice: Trying AI parsing for:', text);
                const result = await api.parseVoiceText(text);
                if (result.parsed && Object.keys(result.health).length > 0) {
                    health = result.health;
                    usedAI = true;
                    console.log('Voice: AI parsed:', health);
                }
            } catch (e) {
                console.log('Voice: AI parsing failed, using local fallback');
            }

            // Fallback to local parsing if AI didn't work
            if (!usedAI || Object.keys(health).length === 0) {
                health = parseHealthFromTextLocal(text);
                console.log('Voice: Local parsed:', health);
            }

            if (Object.keys(health).length === 0) {
                toast({
                    title: 'Could not parse',
                    description: 'Try saying something like "I slept 6 hours and drank 2 liters of water"',
                    variant: 'destructive'
                });
            } else {
                const parsed = Object.entries(health).map(([k, v]) => `${k}: ${v}`).join(', ');
                toast({
                    title: usedAI ? '🤖 AI Parsed Voice Log' : '✅ Voice Log Parsed',
                    description: parsed
                });
                onHealthParsed(health);
            }
        } finally {
            setIsProcessing(false);
            setTranscript('');
        }
    }, [parseHealthFromTextLocal, onHealthParsed, toast]);

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error('Speech recognition failed to start:', e);
            }
        }
    }, [isListening]);

    if (!supported) {
        return null; // Don't show if not supported
    }

    return (
        <div className="relative">
            {/* Main Voice Button */}
            <button
                onClick={toggleListening}
                disabled={disabled || isProcessing}
                className={`
          w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300
          ${isListening
                        ? 'bg-destructive text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                        : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:scale-105'
                    }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
                title={isListening ? 'Stop listening' : 'Voice log'}
            >
                {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isListening ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                )}
            </button>

            {/* Listening indicator */}
            {isListening && (
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 border border-primary/30 rounded-xl px-4 py-2 text-xs font-mono text-primary animate-fade-in z-10">
                    <div className="flex items-center gap-2">
                        <span className="flex gap-0.5">
                            <span className="w-1 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                            <span className="w-1 h-5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                        </span>
                        <span>{transcript || 'Listening...'}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VoiceLogger;
