import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface VoiceLoggerProps {
    onUpdate: (data: any) => void;
}

export function VoiceLogger({ onUpdate }: VoiceLoggerProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onstart = () => setIsListening(true);
            recognitionRef.current.onend = () => setIsListening(false);

            recognitionRef.current.onresult = async (event: any) => {
                const text = event.results[0][0].transcript;
                processVoice(text);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
                toast({ title: 'Voice Error', description: 'Could not categorize speech.', variant: 'destructive' });
            };
        }
    }, [toast]);

    const processVoice = async (text: string) => {
        setIsProcessing(true);
        try {
            toast({ title: 'Processing...', description: `Analyzing: "${text}"` });
            const response = await api.parseVoiceText(text);

            if (response.success && response.health) {
                // The AI returns structured data like { sleep: { status: 'LOW' } }
                // We need to flatten this or pass it as is depending on what onUpdate expects.
                // Assuming onUpdate expects the full health object or specific fields.
                // Let's pass the raw AI health object which matches the schema.
                onUpdate(response.health);
                toast({ title: 'Logged via AI', description: 'Health metrics updated naturally.' });
            } else {
                toast({ title: 'AI Uncertain', description: 'Could not extract clear health data.' });
            }
        } catch (error) {
            console.error('Voice processing failed', error);
            toast({ title: 'Error', description: 'Failed to process voice command.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast({ title: 'Not Supported', description: 'Voice missing in this browser', variant: 'destructive' });
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    return (
        <button
            onClick={toggleListening}
            disabled={isProcessing}
            className={`bento-card relative overflow-hidden group p-4 flex flex-col items-center justify-center transition-all duration-300 ${isListening ? 'bg-red-500/10 border-red-500/50' : 'bg-primary/5 border-primary/20 hover:border-primary/50'
                }`}
        >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 transition-all duration-300 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' :
                isProcessing ? 'bg-yellow-500 text-black animate-spin' :
                    'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black'
                }`}>
                {isProcessing ? '⚡' : isListening ? '🎙️' : '🎤'}
            </div>

            <p className="text-sm font-display font-medium text-muted-foreground group-hover:text-white transition-colors">
                {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Voice Log'}
            </p>

            {isListening && (
                <div className="absolute inset-0 border-2 border-red-500 rounded-3xl animate-ping opacity-20" />
            )}
        </button>
    );
}

export default VoiceLogger;
