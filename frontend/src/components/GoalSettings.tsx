import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import NotificationControl from './NotificationControl';
import { useTheme } from "./ThemeProvider";
import {
    X,
    Moon,
    Sun,
    Bed,
    Droplets,
    Brain,
    Target, // Using Target instead of Flame for exercise or Dumbbell
    RefreshCw,
    LogOut,
    Activity, // For Baseline
    Sparkles,
    TrendingUp,
    Dumbbell,
    Bell
} from "lucide-react";

interface GoalSettingsProps {
    onClose: () => void;
    onGoalChange?: (goals: { targetWaterLiters: number }) => void;
}

export function GoalSettings({ onClose, onGoalChange }: GoalSettingsProps) {
    const { theme, setTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // Goals
    const [targetSleepHours, setTargetSleepHours] = useState(7);
    const [targetWaterLiters, setTargetWaterLiters] = useState(2);
    const [targetExerciseDays, setTargetExerciseDays] = useState(3);

    // Baseline
    const [baseline, setBaseline] = useState<{
        hasBaseline: boolean;
        avgCapacity?: number;
        avgSleepQuality?: number;
        avgHydration?: number;
        avgExercise?: number;
        dataPoints?: number;
    } | null>(null);

    // Current Metrics (from AI)
    const [currentMetrics, setCurrentMetrics] = useState<{
        capacity?: number;
        confidence?: number;
        sleepDebt?: number;
        hydrationDebt?: number;
        mentalDebt?: number;
    } | null>(null);

    // AI Goal Suggestions
    const [aiSuggestions, setAiSuggestions] = useState<{
        suggestions?: { targetSleepHours: number; targetWaterLiters: number; targetExerciseDays: number; explanation: string };
        currentStats?: { sleepRate: number; waterRate: number; exerciseRate: number };
    } | null>(null);

    // Hydration Settings
    const [remindersEnabled, setRemindersEnabled] = useState(false);
    const [reminderInterval, setReminderInterval] = useState(60);
    const [incrementAmount, setIncrementAmount] = useState(250);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [goalsData, baselineData, statsData] = await Promise.all([
                    api.getGoals(),
                    api.getBaseline(),
                    api.getUserStats()
                ]);

                setTargetSleepHours(goalsData.targetSleepHours || 7);
                setTargetWaterLiters(goalsData.targetWaterLiters || 2);
                setTargetExerciseDays(goalsData.targetExerciseDays || 3);
                setBaseline(baselineData);

                // Get current metrics from latest stats
                if (statsData.metrics) {
                    setCurrentMetrics(statsData.metrics);
                }

                // Load hydration settings from User Stats (if included) or fetch
                if (statsData.latestLog?.userHydration) { // Assuming we add this to stats
                    const h = statsData.latestLog.userHydration;
                    setRemindersEnabled(h.remindersEnabled);
                    setReminderInterval(h.reminderInterval);
                    setIncrementAmount(h.incrementAmount);
                } else {
                    // Fetch directly if not in stats
                    const stats: any = await api.getUserStats();
                    if (stats.hydration) {
                        setRemindersEnabled(stats.hydration.remindersEnabled);
                        setReminderInterval(stats.hydration.reminderInterval);
                        setIncrementAmount(stats.hydration.incrementAmount);
                    }
                }
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateGoals({
                targetSleepHours,
                targetWaterLiters,
                targetExerciseDays
            });

            await api.updateHydrationSettings({
                remindersEnabled,
                reminderInterval,
                incrementAmount
            });

            toast({
                title: '✅ Settings Saved',
                description: 'Your preferences have been updated.'
            });

            // Notify parent of goal change
            if (onGoalChange) {
                onGoalChange({ targetWaterLiters });
            }

            onClose();
        } catch (e) {
            console.error('Failed to save:', e);
            toast({
                title: 'Error',
                description: 'Failed to save settings',
                variant: 'destructive'
            });
        }
        setSaving(false);
    };

    const handleRecalculateBaseline = async () => {
        try {
            const result = await api.recalculateBaseline();
            if (result.success) {
                setBaseline({ hasBaseline: true, ...result.baseline });
                toast({
                    title: '📊 Baseline Updated',
                    description: 'Your personal baseline has been recalculated.'
                });
            } else {
                toast({
                    title: 'Not enough data',
                    description: result.message || 'Need at least 7 days of data',
                    variant: 'destructive'
                });
            }
        } catch (e) {
            console.error('Failed to recalculate:', e);
        }
    };

    // End of GoalSettings component logic before return
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('focus_stats');
        window.location.href = '/login';
    };

    return (
        <div className="fixed inset-0 bg-background z-50 overflow-auto safe-area-bottom">
            {/* App-Style Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/10 shadow-sm">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={onClose} className="text-primary font-medium text-sm hover:opacity-80 transition-opacity">
                        Close
                    </button>
                    <h1 className="text-lg font-display font-semibold text-foreground">Settings</h1>
                    <div className="w-10"></div> {/* Spacer for center alignment */}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="max-w-lg mx-auto px-4 py-6 pb-24">

                    {/* SECTION: Appearance */}
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                            Appearance
                        </h2>
                        <div className="border border-border/50 bg-card p-4 rounded-xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center shrink-0">
                                    {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-amber-500" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {theme === 'dark' ? 'Easy on the eyes' : 'Maximum visibility'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg text-xs font-bold transition-all"
                            >
                                TOGGLE
                            </button>
                        </div>
                    </div>

                    {/* SECTION: Notifications */}
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                            Notifications
                        </h2>
                        <NotificationControl />
                    </div>

                    {/* SECTION: Current Status (from AI) */}
                    {currentMetrics && (
                        <div className="mb-8">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                                Current Status
                            </h2>
                            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                                <div className="grid grid-cols-2 divide-x divide-border/10">
                                    <div className="px-4 py-4 text-center">
                                        <p className={`text-2xl font-bold ${(currentMetrics.capacity || 0) < 30 ? 'text-destructive' :
                                            (currentMetrics.capacity || 0) < 60 ? 'text-amber-500' : 'text-primary'
                                            }`}>
                                            {currentMetrics.capacity || 0}%
                                        </p>
                                        <p className="text-xs text-muted-foreground">Cognitive Capacity</p>
                                    </div>
                                    <div className="px-4 py-4 text-center">
                                        <p className={`text-2xl font-bold ${(currentMetrics.confidence || 0) < 0.6 ? 'text-amber-500' : 'text-primary'
                                            }`}>
                                            {Math.round((currentMetrics.confidence || 0) * 100)}%
                                        </p>
                                        <p className="text-xs text-muted-foreground">Data Confidence</p>
                                    </div>
                                </div>
                                {/* Debts Row */}
                                <div className="border-t border-border/10 grid grid-cols-3 divide-x divide-border/10">
                                    <div className="px-3 py-3 text-center">
                                        <p className="text-sm font-bold text-foreground">{currentMetrics.sleepDebt || 0}</p>
                                        <p className="text-[10px] text-muted-foreground">Sleep Debt</p>
                                    </div>
                                    <div className="px-3 py-3 text-center">
                                        <p className="text-sm font-bold text-foreground">{currentMetrics.hydrationDebt || 0}</p>
                                        <p className="text-[10px] text-muted-foreground">Hydration</p>
                                    </div>
                                    <div className="px-3 py-3 text-center">
                                        <p className="text-sm font-bold text-foreground">{currentMetrics.mentalDebt || 0}</p>
                                        <p className="text-[10px] text-muted-foreground">Mental</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION: AI Suggestions */}
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2 flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-primary" /> AI Goal Suggestions
                        </h2>

                        {!aiSuggestions ? (
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const data = await api.getAIGoalSuggestions();
                                        if (data?.hasEnoughData) setAiSuggestions(data);
                                        else toast({ title: "Not enough data", description: "Need more check-ins first." });
                                    } catch (e) { toast({ title: "Error", description: "Could not get suggestions", variant: "destructive" }); }
                                    setLoading(false);
                                }}
                                className="w-full py-4 border border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/10 hover:text-primary transition-colors"
                            >
                                <Sparkles className="w-4 h-4" />
                                Get Personalized Suggestions
                            </button>
                        ) : (
                            <div className="bg-gradient-to-r from-cyan-500/10 to-primary/10 border border-cyan-500/20 rounded-2xl p-4 shadow-sm">
                                <p className="text-sm text-foreground/80 mb-4">
                                    {aiSuggestions.suggestions?.explanation}
                                </p>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-cyan-500">{aiSuggestions.suggestions?.targetSleepHours}h</p>
                                        <p className="text-[10px] text-muted-foreground">Sleep</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-cyan-500">{aiSuggestions.suggestions?.targetWaterLiters}L</p>
                                        <p className="text-[10px] text-muted-foreground">Water</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-cyan-500">{aiSuggestions.suggestions?.targetExerciseDays}</p>
                                        <p className="text-[10px] text-muted-foreground">Exercise Days</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (aiSuggestions.suggestions) {
                                            setTargetSleepHours(aiSuggestions.suggestions?.targetSleepHours);
                                            setTargetWaterLiters(aiSuggestions.suggestions?.targetWaterLiters);
                                            setTargetExerciseDays(aiSuggestions.suggestions?.targetExerciseDays);
                                            toast({ title: '✨ AI Suggestions Applied', description: 'Save to confirm these goals.' });
                                        }
                                    }}
                                    className="w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-semibold text-sm rounded-xl transition-colors"
                                >
                                    Apply AI Suggestions
                                </button>
                            </div>
                        )}
                    </div>

                    {/* SECTION: Health Goals */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between px-4 mb-2">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Health Goals
                            </h2>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Goals"}
                            </button>
                        </div>
                        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/10 shadow-sm">
                            {/* Sleep */}
                            <div className="px-4 py-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Bed className="w-5 h-5 text-primary" />
                                        <span className="text-sm font-medium text-foreground">Target Sleep</span>
                                    </div>
                                    <span className="text-sm font-bold text-primary">{targetSleepHours} hours</span>
                                </div>
                                <input
                                    type="range"
                                    min="4"
                                    max="12"
                                    value={targetSleepHours}
                                    onChange={(e) => setTargetSleepHours(Number(e.target.value))}
                                    className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            {/* Water */}
                            <div className="px-4 py-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Droplets className="w-5 h-5 text-cyan-500" />
                                        <span className="text-sm font-medium text-foreground">Target Water</span>
                                    </div>
                                    <span className="text-sm font-bold text-cyan-500">{targetWaterLiters} liters</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.5"
                                    value={targetWaterLiters}
                                    onChange={(e) => setTargetWaterLiters(Number(e.target.value))}
                                    className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>

                            {/* Exercise */}
                            <div className="px-4 py-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Dumbbell className="w-5 h-5 text-amber-500" />
                                        <span className="text-sm font-medium text-foreground">Exercise Days / Week</span>
                                    </div>
                                    <span className="text-sm font-bold text-amber-500">{targetExerciseDays} days</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="7"
                                    value={targetExerciseDays}
                                    onChange={(e) => setTargetExerciseDays(Number(e.target.value))}
                                    className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-amber-500"
                                />
                            </div>
                        </div>
                    </div>



                    {/* SECTION: Personal Baseline */}
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                            Personal Baseline
                        </h2>
                        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                            {baseline?.hasBaseline ? (
                                <>
                                    <div className="grid grid-cols-2 divide-x divide-border/10">
                                        <div className="px-4 py-4 text-center">
                                            <p className="text-2xl font-bold text-primary">{baseline.avgCapacity}%</p>
                                            <p className="text-xs text-muted-foreground">Avg Capacity</p>
                                        </div>
                                        <div className="px-4 py-4 text-center">
                                            <p className="text-2xl font-bold text-cyan-500">{Math.round((baseline.avgSleepQuality || 0) * 100)}%</p>
                                            <p className="text-xs text-muted-foreground">Sleep Quality</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-border/10 px-4 py-3 flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Based on {baseline.dataPoints} days
                                        </span>
                                        <button
                                            onClick={handleRecalculateBaseline}
                                            className="text-xs text-primary font-medium flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Recalculate
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="px-4 py-8 text-center">
                                    <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">Not enough data yet</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">Need at least 7 days of check-ins</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION: Account */}
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                            Account
                        </h2>
                        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-4 flex items-center gap-3 hover:bg-muted/10 transition-colors"
                            >
                                <LogOut className="w-5 h-5 text-destructive" />
                                <span className="text-sm font-medium text-destructive">Log Out</span>
                            </button>
                        </div>
                    </div>

                    {/* SECTION: About */}
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                            About
                        </h2>
                        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/10 shadow-sm">
                            <div className="px-4 py-3 flex items-center justify-between">
                                <span className="text-sm text-foreground">Version</span>
                                <span className="text-sm text-muted-foreground">1.0.0</span>
                            </div>
                            <div className="px-4 py-3 flex items-center justify-between">
                                <span className="text-sm text-foreground">Build</span>
                                <span className="text-sm text-muted-foreground">Production</span>
                            </div>
                        </div>
                    </div>

                </div>
            )
            }
        </div >
    );
}

export default GoalSettings;
