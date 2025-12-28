import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface GoalSettingsProps {
    onClose: () => void;
}

export function GoalSettings({ onClose }: GoalSettingsProps) {
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [goalsData, baselineData, statsData, suggestionsData] = await Promise.all([
                    api.getGoals(),
                    api.getBaseline(),
                    api.getUserStats(),
                    api.getAIGoalSuggestions().catch(() => null)
                ]);

                setTargetSleepHours(goalsData.targetSleepHours || 7);
                setTargetWaterLiters(goalsData.targetWaterLiters || 2);
                setTargetExerciseDays(goalsData.targetExerciseDays || 3);
                setBaseline(baselineData);

                // Get current metrics from latest stats
                if (statsData.metrics) {
                    setCurrentMetrics(statsData.metrics);
                }

                // Get AI suggestions
                if (suggestionsData?.hasEnoughData) {
                    setAiSuggestions(suggestionsData);
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
            toast({
                title: '✅ Settings Saved',
                description: 'Your preferences have been updated.'
            });
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

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('focus_stats');
        window.location.href = '/login';
    };

    return (
        <div className="fixed inset-0 bg-background z-50 overflow-auto safe-area-bottom">
            {/* App-Style Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={onClose} className="text-primary font-medium text-sm">
                        Cancel
                    </button>
                    <h1 className="text-lg font-display font-semibold text-white">Settings</h1>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-primary font-semibold text-sm disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="max-w-lg mx-auto px-4 py-6 pb-24">

                    {/* SECTION: Current Status (from AI) */}
                    {currentMetrics && (
                        <div className="mb-8">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                                Current Status
                            </h2>
                            <div className="bg-white/5 rounded-2xl overflow-hidden">
                                <div className="grid grid-cols-2 divide-x divide-white/10">
                                    <div className="px-4 py-4 text-center">
                                        <p className={`text-2xl font-bold ${(currentMetrics.capacity || 0) < 30 ? 'text-destructive' :
                                            (currentMetrics.capacity || 0) < 60 ? 'text-amber-400' : 'text-primary'
                                            }`}>
                                            {currentMetrics.capacity || 0}%
                                        </p>
                                        <p className="text-xs text-muted-foreground">Cognitive Capacity</p>
                                    </div>
                                    <div className="px-4 py-4 text-center">
                                        <p className={`text-2xl font-bold ${(currentMetrics.confidence || 0) < 0.6 ? 'text-amber-400' : 'text-primary'
                                            }`}>
                                            {Math.round((currentMetrics.confidence || 0) * 100)}%
                                        </p>
                                        <p className="text-xs text-muted-foreground">Data Confidence</p>
                                    </div>
                                </div>
                                {/* Debts Row */}
                                <div className="border-t border-white/10 grid grid-cols-3 divide-x divide-white/10">
                                    <div className="px-3 py-3 text-center">
                                        <p className="text-sm font-bold text-white">{currentMetrics.sleepDebt || 0}</p>
                                        <p className="text-[10px] text-muted-foreground">Sleep Debt</p>
                                    </div>
                                    <div className="px-3 py-3 text-center">
                                        <p className="text-sm font-bold text-white">{currentMetrics.hydrationDebt || 0}</p>
                                        <p className="text-[10px] text-muted-foreground">Hydration</p>
                                    </div>
                                    <div className="px-3 py-3 text-center">
                                        <p className="text-sm font-bold text-white">{currentMetrics.mentalDebt || 0}</p>
                                        <p className="text-[10px] text-muted-foreground">Mental</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION: AI Suggestions */}
                    {aiSuggestions?.suggestions && (
                        <div className="mb-8">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2 flex items-center gap-2">
                                <span>🤖</span> AI Goal Suggestions
                            </h2>
                            <div className="bg-gradient-to-r from-cyan-500/10 to-primary/10 border border-cyan-500/20 rounded-2xl p-4">
                                <p className="text-sm text-white/80 mb-4">
                                    {aiSuggestions.suggestions.explanation}
                                </p>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-cyan-400">{aiSuggestions.suggestions.targetSleepHours}h</p>
                                        <p className="text-[10px] text-muted-foreground">Sleep</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-cyan-400">{aiSuggestions.suggestions.targetWaterLiters}L</p>
                                        <p className="text-[10px] text-muted-foreground">Water</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-cyan-400">{aiSuggestions.suggestions.targetExerciseDays}</p>
                                        <p className="text-[10px] text-muted-foreground">Exercise Days</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (aiSuggestions.suggestions) {
                                            setTargetSleepHours(aiSuggestions.suggestions.targetSleepHours);
                                            setTargetWaterLiters(aiSuggestions.suggestions.targetWaterLiters);
                                            setTargetExerciseDays(aiSuggestions.suggestions.targetExerciseDays);
                                            toast({ title: '✨ AI Suggestions Applied', description: 'Save to confirm these goals.' });
                                        }
                                    }}
                                    className="w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-semibold text-sm rounded-xl transition-colors"
                                >
                                    Apply AI Suggestions
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SECTION: Health Goals */}
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                            Health Goals
                        </h2>
                        <div className="bg-white/5 rounded-2xl overflow-hidden divide-y divide-white/10">
                            {/* Sleep */}
                            <div className="px-4 py-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">😴</span>
                                        <span className="text-sm font-medium text-white">Target Sleep</span>
                                    </div>
                                    <span className="text-sm font-bold text-primary">{targetSleepHours} hours</span>
                                </div>
                                <input
                                    type="range"
                                    min="4"
                                    max="12"
                                    value={targetSleepHours}
                                    onChange={(e) => setTargetSleepHours(Number(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            {/* Water */}
                            <div className="px-4 py-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">💧</span>
                                        <span className="text-sm font-medium text-white">Target Water</span>
                                    </div>
                                    <span className="text-sm font-bold text-cyan-400">{targetWaterLiters} liters</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.5"
                                    value={targetWaterLiters}
                                    onChange={(e) => setTargetWaterLiters(Number(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400"
                                />
                            </div>

                            {/* Exercise */}
                            <div className="px-4 py-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">💪</span>
                                        <span className="text-sm font-medium text-white">Exercise Days / Week</span>
                                    </div>
                                    <span className="text-sm font-bold text-amber-400">{targetExerciseDays} days</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="7"
                                    value={targetExerciseDays}
                                    onChange={(e) => setTargetExerciseDays(Number(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION: Personal Baseline */}
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                            Personal Baseline
                        </h2>
                        <div className="bg-white/5 rounded-2xl overflow-hidden">
                            {baseline?.hasBaseline ? (
                                <>
                                    <div className="grid grid-cols-2 divide-x divide-white/10">
                                        <div className="px-4 py-4 text-center">
                                            <p className="text-2xl font-bold text-primary">{baseline.avgCapacity}%</p>
                                            <p className="text-xs text-muted-foreground">Avg Capacity</p>
                                        </div>
                                        <div className="px-4 py-4 text-center">
                                            <p className="text-2xl font-bold text-cyan-400">{Math.round((baseline.avgSleepQuality || 0) * 100)}%</p>
                                            <p className="text-xs text-muted-foreground">Sleep Quality</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Based on {baseline.dataPoints} days
                                        </span>
                                        <button
                                            onClick={handleRecalculateBaseline}
                                            className="text-xs text-primary font-medium"
                                        >
                                            Recalculate
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="px-4 py-8 text-center">
                                    <span className="text-3xl block mb-2">📈</span>
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
                        <div className="bg-white/5 rounded-2xl overflow-hidden">
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
                            >
                                <span className="text-xl">🚪</span>
                                <span className="text-sm font-medium text-destructive">Log Out</span>
                            </button>
                        </div>
                    </div>

                    {/* SECTION: About */}
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                            About
                        </h2>
                        <div className="bg-white/5 rounded-2xl overflow-hidden divide-y divide-white/10">
                            <div className="px-4 py-3 flex items-center justify-between">
                                <span className="text-sm text-white">Version</span>
                                <span className="text-sm text-muted-foreground">1.0.0</span>
                            </div>
                            <div className="px-4 py-3 flex items-center justify-between">
                                <span className="text-sm text-white">Build</span>
                                <span className="text-sm text-muted-foreground">Production</span>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

export default GoalSettings;
