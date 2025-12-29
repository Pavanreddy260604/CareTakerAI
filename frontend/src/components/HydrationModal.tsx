import React, { useState, useEffect } from 'react';
import { X, Droplets, Plus, CheckCircle2, Bell, BellOff, Settings } from 'lucide-react';
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-border/10">
                    <div className="flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-cyan-500" />
                        <h2 className="text-lg font-display font-bold text-foreground">Hydration Tracker</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-cyan-500/20 text-cyan-500' : 'hover:bg-muted/20 text-muted-foreground'}`}
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-muted/20 rounded-full transition-colors">
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Settings Panel (Collapsible) */}
                {showSettings && (
                    <div className="px-6 py-4 bg-muted/10 border-b border-border/10 animate-in slide-in-from-top-2 duration-200">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Reminder Settings</h3>

                        {/* Toggle */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {localReminders ? <Bell className="w-4 h-4 text-cyan-500" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                                <span className="text-sm font-medium text-foreground">Smart Reminders</span>
                            </div>
                            <button
                                onClick={() => setLocalReminders(!localReminders)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${localReminders ? 'bg-cyan-500' : 'bg-muted'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${localReminders ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                        </div>

                        {/* Interval */}
                        {localReminders && (
                            <div className="mb-4">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs text-muted-foreground">Remind every</span>
                                    <span className="text-xs font-bold text-cyan-500">{localInterval} min</span>
                                </div>
                                <input
                                    type="range"
                                    min="30"
                                    max="180"
                                    step="15"
                                    value={localInterval}
                                    onChange={(e) => setLocalInterval(Number(e.target.value))}
                                    className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>
                        )}

                        {/* Glass Size */}
                        <div className="mb-4">
                            <span className="text-xs text-muted-foreground block mb-2">Default glass size</span>
                            <div className="flex gap-2">
                                {[100, 250, 500].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setLocalIncrement(amt)}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${localIncrement === amt ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-600' : 'border-border/30 text-muted-foreground hover:bg-muted/50'}`}
                                    >
                                        {amt}ml
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            className="w-full py-2 rounded-xl bg-cyan-500 text-white font-bold text-xs"
                        >
                            Save Settings
                        </button>
                    </div>
                )}

                {/* Main Content */}
                <div className="px-8 py-10 flex flex-col items-center text-center">
                    {/* Large Progress Circle */}
                    <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="96"
                                cy="96"
                                r="88"
                                stroke="currentColor"
                                strokeWidth="10"
                                fill="transparent"
                                className="text-muted/10"
                            />
                            <circle
                                cx="96"
                                cy="96"
                                r="88"
                                stroke="currentColor"
                                strokeWidth="10"
                                fill="transparent"
                                strokeDasharray={553}
                                strokeDashoffset={553 - (progress / 100) * 553}
                                strokeLinecap="round"
                                className={`transition-all duration-1000 ease-out ${isGoalMet ? 'text-primary' : 'text-cyan-500'}`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-display font-bold text-foreground">{Math.round(progress)}%</span>
                            <span className="text-sm text-muted-foreground mt-1">{currentIntake} / {goal}ml</span>
                        </div>
                    </div>

                    {isGoalMet ? (
                        <div className="mb-6 flex items-center gap-2 text-primary font-medium animate-in zoom-in duration-500">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm">Daily Goal Complete! 🎉</span>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground mb-6">
                            {goal - currentIntake}ml left to reach your goal
                        </p>
                    )}

                    {/* Quick Log Buttons */}
                    <div className="grid grid-cols-3 gap-3 w-full mb-6">
                        {[100, 250, 500].map((amt) => (
                            <button
                                key={amt}
                                onClick={() => onLog(amt)}
                                disabled={isGoalMet}
                                className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-muted/20 border border-border/50 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-5 h-5 text-cyan-500 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-bold text-foreground">{amt}ml</span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => onLog(localIncrement)}
                        disabled={isGoalMet}
                        className="w-full py-4 rounded-2xl bg-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 hover:bg-cyan-600 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGoalMet ? 'Goal Complete ✓' : `Log ${localIncrement}ml`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HydrationModal;
