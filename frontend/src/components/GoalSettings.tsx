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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [goalsData, baselineData] = await Promise.all([
                    api.getGoals(),
                    api.getBaseline()
                ]);

                setTargetSleepHours(goalsData.targetSleepHours || 7);
                setTargetWaterLiters(goalsData.targetWaterLiters || 2);
                setTargetExerciseDays(goalsData.targetExerciseDays || 3);
                setBaseline(baselineData);
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
                title: '✅ Goals Saved',
                description: 'Your health targets have been updated.'
            });
            onClose();
        } catch (e) {
            console.error('Failed to save goals:', e);
            toast({
                title: 'Error',
                description: 'Failed to save goals',
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

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 overflow-auto">
            <div className="max-w-lg mx-auto px-4 py-6 pb-24 sm:pb-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-mono font-bold text-primary flex items-center gap-2">
                        <span>🎯</span>
                        <span>Goals & Settings</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-white text-2xl p-2"
                    >
                        ✕
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-primary font-mono text-sm">Loading...</p>
                    </div>
                ) : (
                    <>
                        {/* Health Goals */}
                        <div className="bg-[#0a0a0a] border border-primary/30 rounded-2xl p-5 mb-5">
                            <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-4">
                                🎯 Daily Health Goals
                            </p>

                            {/* Sleep Goal */}
                            <div className="mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-mono text-foreground flex items-center gap-2">
                                        <span>😴</span> Target Sleep
                                    </label>
                                    <span className="text-lg font-mono font-bold text-primary">{targetSleepHours}h</span>
                                </div>
                                <input
                                    type="range"
                                    min="4"
                                    max="12"
                                    value={targetSleepHours}
                                    onChange={(e) => setTargetSleepHours(Number(e.target.value))}
                                    className="w-full h-2 bg-muted/30 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                    <span>4h</span>
                                    <span>8h</span>
                                    <span>12h</span>
                                </div>
                            </div>

                            {/* Water Goal */}
                            <div className="mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-mono text-foreground flex items-center gap-2">
                                        <span>💧</span> Target Water
                                    </label>
                                    <span className="text-lg font-mono font-bold text-cyan-500">{targetWaterLiters}L</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.5"
                                    value={targetWaterLiters}
                                    onChange={(e) => setTargetWaterLiters(Number(e.target.value))}
                                    className="w-full h-2 bg-muted/30 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                    <span>1L</span>
                                    <span>3L</span>
                                    <span>5L</span>
                                </div>
                            </div>

                            {/* Exercise Goal */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-mono text-foreground flex items-center gap-2">
                                        <span>💪</span> Exercise Days / Week
                                    </label>
                                    <span className="text-lg font-mono font-bold text-yellow-500">{targetExerciseDays}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="7"
                                    value={targetExerciseDays}
                                    onChange={(e) => setTargetExerciseDays(Number(e.target.value))}
                                    className="w-full h-2 bg-muted/30 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                    <span>0</span>
                                    <span>3-4</span>
                                    <span>7</span>
                                </div>
                            </div>
                        </div>

                        {/* Personal Baseline */}
                        <div className="bg-[#0a0a0a] border border-muted/30 rounded-2xl p-5 mb-5">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                    📊 Personal Baseline
                                </p>
                                {baseline?.hasBaseline && (
                                    <button
                                        onClick={handleRecalculateBaseline}
                                        className="text-[10px] font-mono text-primary hover:underline"
                                    >
                                        Recalculate
                                    </button>
                                )}
                            </div>

                            {baseline?.hasBaseline ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-muted/10 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-mono font-bold text-primary">{baseline.avgCapacity}%</p>
                                        <p className="text-[10px] text-muted-foreground">Avg Capacity</p>
                                    </div>
                                    <div className="bg-muted/10 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-mono font-bold text-cyan-500">{Math.round((baseline.avgSleepQuality || 0) * 100)}%</p>
                                        <p className="text-[10px] text-muted-foreground">Good Sleep Rate</p>
                                    </div>
                                    <div className="bg-muted/10 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-mono font-bold text-yellow-500">{Math.round((baseline.avgHydration || 0) * 100)}%</p>
                                        <p className="text-[10px] text-muted-foreground">Hydration Rate</p>
                                    </div>
                                    <div className="bg-muted/10 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-mono font-bold text-green-500">{Math.round((baseline.avgExercise || 0) * 100)}%</p>
                                        <p className="text-[10px] text-muted-foreground">Exercise Rate</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <span className="text-3xl mb-3 block">📈</span>
                                    <p className="text-muted-foreground font-mono text-sm">Not enough data yet</p>
                                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                                        Need at least 7 days of check-ins
                                    </p>
                                </div>
                            )}

                            {baseline?.dataPoints && (
                                <p className="text-[10px] text-muted-foreground text-center mt-3">
                                    Based on {baseline.dataPoints} days of data
                                </p>
                            )}
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-4 bg-primary text-black font-mono font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : '💾 Save Goals'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default GoalSettings;
