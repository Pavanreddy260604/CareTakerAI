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

    return (
        <div className="fixed inset-0 z-50 bg-background overflow-auto safe-area-bottom">
            {/* App-Style Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/10 shadow-sm">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={onClose} className="text-primary font-medium text-sm hover:opacity-80 transition-opacity">
                        Close
                    </button>
                    <div className="flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-cyan-500" />
                        <h1 className="text-lg font-display font-semibold text-foreground">Hydration</h1>
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`text-sm font-medium transition-colors ${showSettings ? 'text-cyan-500' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Settings
                    </button>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-8 pb-24">
                {/* Hero Progress Section */}
                <div className="flex flex-col items-center text-center mb-10">
                    {/* Large Progress Circle */}
                    <div className="relative w-64 h-64 flex items-center justify-center mb-6">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="128"
                                cy="128"
                                r="116"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                className="text-muted/10"
                            />
                            <circle
                                cx="128"
                                cy="128"
                                r="116"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={729}
                                strokeDashoffset={729 - (progress / 100) * 729}
                                strokeLinecap="round"
                                className={`transition-all duration-1000 ease-out ${isGoalMet ? 'text-primary' : 'text-cyan-500'}`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {isGoalMet ? (
                                <>
                                    <CheckCircle2 className="w-12 h-12 text-primary mb-2" />
                                    <span className="text-lg font-bold text-primary">Goal Complete!</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-5xl font-display font-bold text-foreground">{Math.round(progress)}%</span>
                                    <span className="text-sm text-muted-foreground mt-1">{currentIntake}ml of {goal}ml</span>
                                </>
                            )}
                        </div>
                    </div>

                    {!isGoalMet && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Droplets className="w-4 h-4 text-cyan-500" />
                            <span className="text-sm">{remaining}ml remaining to reach your goal</span>
                        </div>
                    )}
                </div>

                {/* Quick Log Section */}
                <div className="mb-8">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">
                        Quick Log
                    </h2>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {[100, 250, 500].map((amt) => (
                            <button
                                key={amt}
                                onClick={() => onLog(amt)}
                                disabled={isGoalMet}
                                className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-card border border-border/50 hover:bg-cyan-500/5 hover:border-cyan-500/30 transition-all active:scale-95 group disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                                    <Plus className="w-5 h-5 text-cyan-500" />
                                </div>
                                <span className="text-base font-bold text-foreground">{amt}ml</span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => onLog(localIncrement)}
                        disabled={isGoalMet}
                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-base shadow-lg shadow-cyan-500/20 hover:from-cyan-600 hover:to-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Droplets className="w-5 h-5" />
                        {isGoalMet ? 'Goal Complete ✓' : `Log ${localIncrement}ml Glass`}
                    </button>
                </div>

                {/* Settings Section (Collapsible) */}
                <div className="border border-border/50 rounded-2xl overflow-hidden bg-card">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/10 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${localReminders ? 'bg-cyan-500/10' : 'bg-muted/20'}`}>
                                {localReminders ? <Bell className="w-5 h-5 text-cyan-500" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium text-foreground">Smart Reminders</p>
                                <p className="text-xs text-muted-foreground">{localReminders ? `Every ${localInterval} min` : 'Disabled'}</p>
                            </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                    </button>

                    {showSettings && (
                        <div className="px-5 py-4 border-t border-border/10 space-y-5 animate-in slide-in-from-top-2 duration-200">
                            {/* Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Enable Reminders</span>
                                <button
                                    onClick={() => setLocalReminders(!localReminders)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${localReminders ? 'bg-cyan-500' : 'bg-muted'}`}
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
                                <span className="text-sm text-muted-foreground block mb-3">Default glass size</span>
                                <div className="flex gap-2">
                                    {[100, 250, 500].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setLocalIncrement(amt)}
                                            className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${localIncrement === amt ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-600' : 'border-border/30 text-muted-foreground hover:bg-muted/50'}`}
                                        >
                                            {amt}ml
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                className="w-full py-3 rounded-xl bg-cyan-500 text-white font-bold text-sm hover:bg-cyan-600 transition-colors"
                            >
                                Save Settings
                            </button>
                        </div>
                    )}
                </div>

                {/* Motivation */}
                {!isGoalMet && (
                    <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/10">
                        <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-foreground mb-1">Stay hydrated!</p>
                                <p className="text-xs text-muted-foreground">
                                    Drinking enough water improves focus, energy, and overall well-being. You're doing great!
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HydrationModal;
