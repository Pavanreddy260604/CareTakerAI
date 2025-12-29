import React, { useState, useEffect } from 'react';
import { X, Droplets, Plus, CheckCircle2, Bell, BellOff, ChevronDown, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface HydrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentIntake: number;
    goal: number;
    incrementAmount: number;
    remindersEnabled: boolean;
    reminderInterval: number;
    onLog: (amount: number) => void;
    onSettingsChange: (settings: { remindersEnabled?: boolean; reminderInterval?: number; incrementAmount?: number }) => void;
}

const HydrationModal: React.FC<HydrationModalProps> = ({
    isOpen,
    onClose,
    currentIntake,
    goal,
    incrementAmount,
    remindersEnabled,
    reminderInterval,
    onLog,
    onSettingsChange
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [localReminders, setLocalReminders] = useState(remindersEnabled);
    const [localInterval, setLocalInterval] = useState(reminderInterval);
    const [localIncrement, setLocalIncrement] = useState(incrementAmount);

    useEffect(() => {
        setLocalReminders(remindersEnabled);
        setLocalInterval(reminderInterval);
        setLocalIncrement(incrementAmount);
    }, [remindersEnabled, reminderInterval, incrementAmount]);

    if (!isOpen) return null;

    const progress = Math.min((currentIntake / goal) * 100, 100);
    const isGoalMet = currentIntake >= goal;
    const remaining = Math.max(0, goal - currentIntake);

    const handleSaveSettings = async () => {
        try {
            await api.updateHydrationSettings({
                remindersEnabled: localReminders,
                reminderInterval: localInterval,
                incrementAmount: localIncrement
            });
            onSettingsChange({
                remindersEnabled: localReminders,
                reminderInterval: localInterval,
                incrementAmount: localIncrement
            });
            setShowSettings(false);
        } catch (e) {
            console.error('Failed to save settings');
        }
    };

    // SVG circle calculations for responsive sizing
    const circleSize = 200; // viewBox size
    const strokeWidth = 10;
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="fixed inset-0 z-50 bg-background overflow-auto">
            {/* Safe area padding for mobile notches */}
            <div className="min-h-screen pb-safe">
                {/* App-Style Header - Mobile optimized */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/10">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <button
                            onClick={onClose}
                            className="text-primary font-medium text-sm py-2 px-1 -ml-1 active:opacity-60"
                        >
                            Close
                        </button>
                        <div className="flex items-center gap-2">
                            <Droplets className="w-5 h-5 text-cyan-500" />
                            <h1 className="text-base font-display font-semibold text-foreground">Hydration</h1>
                        </div>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`text-sm font-medium py-2 px-1 -mr-1 active:opacity-60 ${showSettings ? 'text-cyan-500' : 'text-muted-foreground'}`}
                        >
                            Settings
                        </button>
                    </div>
                </div>

                <div className="px-4 py-6">
                    {/* Hero Progress Section - Responsive circle */}
                    <div className="flex flex-col items-center text-center mb-8">
                        {/* Responsive Progress Circle using viewBox */}
                        <div className="relative w-full max-w-[220px] aspect-square flex items-center justify-center mb-4">
                            <svg viewBox={`0 0 ${circleSize} ${circleSize}`} className="w-full h-full transform -rotate-90">
                                <circle
                                    cx={circleSize / 2}
                                    cy={circleSize / 2}
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                    className="text-muted/10"
                                />
                                <circle
                                    cx={circleSize / 2}
                                    cy={circleSize / 2}
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={circumference - (progress / 100) * circumference}
                                    strokeLinecap="round"
                                    className={`transition-all duration-1000 ease-out ${isGoalMet ? 'text-primary' : 'text-cyan-500'}`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                {isGoalMet ? (
                                    <>
                                        <CheckCircle2 className="w-10 h-10 text-primary mb-1" />
                                        <span className="text-base font-bold text-primary">Goal Complete!</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-4xl font-display font-bold text-foreground">{Math.round(progress)}%</span>
                                        <span className="text-xs text-muted-foreground mt-1">{currentIntake} / {goal}ml</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {!isGoalMet && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Droplets className="w-4 h-4 text-cyan-500" />
                                <span className="text-sm">{remaining}ml remaining</span>
                            </div>
                        )}
                    </div>

                    {/* Quick Log Section - Touch optimized */}
                    <div className="mb-6">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                            Quick Log
                        </h2>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {[100, 250, 500].map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => onLog(amt)}
                                    disabled={isGoalMet}
                                    className="flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl bg-card border border-border/50 active:bg-cyan-500/10 active:border-cyan-500/30 transition-all disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-cyan-500" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">{amt}ml</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => onLog(localIncrement)}
                            disabled={isGoalMet}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 active:opacity-90 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                            <Droplets className="w-5 h-5" />
                            {isGoalMet ? 'Goal Complete ✓' : `Log ${localIncrement}ml`}
                        </button>
                    </div>

                    {/* Settings Section - Collapsible */}
                    <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="w-full px-4 py-3 flex items-center justify-between active:bg-muted/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${localReminders ? 'bg-cyan-500/10' : 'bg-muted/20'}`}>
                                    {localReminders ? <Bell className="w-4 h-4 text-cyan-500" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-foreground">Smart Reminders</p>
                                    <p className="text-xs text-muted-foreground">{localReminders ? `Every ${localInterval} min` : 'Disabled'}</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                        </button>

                        {showSettings && (
                            <div className="px-4 py-4 border-t border-border/10 space-y-4">
                                {/* Toggle */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground">Enable Reminders</span>
                                    <button
                                        onClick={() => setLocalReminders(!localReminders)}
                                        className={`w-11 h-6 rounded-full transition-colors relative ${localReminders ? 'bg-cyan-500' : 'bg-muted'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${localReminders ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Interval */}
                                {localReminders && (
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-muted-foreground">Remind every</span>
                                            <span className="text-sm font-bold text-cyan-500">{localInterval} min</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="30"
                                            max="180"
                                            step="15"
                                            value={localInterval}
                                            onChange={(e) => setLocalInterval(Number(e.target.value))}
                                            className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-cyan-500"
                                        />
                                    </div>
                                )}

                                {/* Glass Size */}
                                <div>
                                    <span className="text-sm text-muted-foreground block mb-2">Default glass size</span>
                                    <div className="flex gap-2">
                                        {[100, 250, 500].map(amt => (
                                            <button
                                                key={amt}
                                                onClick={() => setLocalIncrement(amt)}
                                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${localIncrement === amt ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-600' : 'border-border/30 text-muted-foreground active:bg-muted/50'}`}
                                            >
                                                {amt}ml
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveSettings}
                                    className="w-full py-3 rounded-lg bg-cyan-500 text-white font-bold text-sm active:bg-cyan-600"
                                >
                                    Save Settings
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Motivation Tip */}
                    {!isGoalMet && (
                        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/10">
                            <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    <span className="font-medium text-foreground">Stay hydrated!</span> Drinking water improves focus and energy.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HydrationModal;
