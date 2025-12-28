import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
}

interface AchievementsProps {
    onClose: () => void;
}

export function Achievements({ onClose }: AchievementsProps) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [streak, setStreak] = useState<{ current: number; longest: number; atRisk: boolean } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [achievementsData, streakData] = await Promise.all([
                    api.getAchievements(),
                    api.getStreak()
                ]);
                setAchievements(achievementsData.achievements || []);
                setStreak(streakData);
            } catch (e) {
                console.error('Failed to load achievements:', e);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // Predefined badges that can be earned
    const allBadges = [
        { id: 'streak_week', name: 'Week Warrior', description: '7-day check-in streak', icon: '🔥' },
        { id: 'streak_2week', name: 'Consistency King', description: '14-day check-in streak', icon: '👑' },
        { id: 'streak_month', name: 'Monthly Master', description: '30-day check-in streak', icon: '🏆' },
        { id: 'exercise_10', name: 'Active Lifestyle', description: '10+ exercise days this month', icon: '💪' },
        { id: 'sleep_master', name: 'Sleep Master', description: '20+ good sleep days this month', icon: '😴' },
        { id: 'hydration_hero', name: 'Hydration Hero', description: '20+ good hydration days', icon: '💧' },
        { id: 'peak_performer', name: 'Peak Performer', description: '5+ days at 80%+ capacity', icon: '🚀' },
        { id: 'recovery_respect', name: 'Recovery Respect', description: 'Entered recovery mode when needed', icon: '🛡️' },
    ];

    const earnedIds = new Set(achievements.map(a => a.id));

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 overflow-auto">
            <div className="max-w-lg mx-auto px-4 py-6 pb-20">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-mono font-bold text-primary flex items-center gap-2">
                        <span>🏅</span>
                        <span>Achievements</span>
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
                        {/* Streak Card */}
                        {streak && (
                            <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-5 mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] font-mono text-primary uppercase tracking-widest">Current Streak</p>
                                        <p className="text-4xl font-mono font-bold text-primary">{streak.current}</p>
                                        <p className="text-sm text-muted-foreground">days</p>
                                    </div>
                                    <div className="text-6xl">
                                        {streak.current >= 7 ? '🔥' : streak.current >= 3 ? '⚡' : '✨'}
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm font-mono">
                                    <span className="text-muted-foreground">Longest: {streak.longest} days</span>
                                    {streak.atRisk && (
                                        <span className="text-yellow-500">⚠️ At risk!</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Earned Badges */}
                        <div className="mb-6">
                            <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-4">
                                Earned ({achievements.length})
                            </p>
                            {achievements.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {achievements.map(badge => (
                                        <div
                                            key={badge.id}
                                            className="bg-primary/10 border border-primary/40 rounded-xl p-4 text-center"
                                        >
                                            <span className="text-3xl mb-2 block">{badge.icon}</span>
                                            <p className="text-sm font-mono font-bold text-primary">{badge.name}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-muted/5 rounded-xl border border-muted/20">
                                    <span className="text-4xl mb-3 block">🎯</span>
                                    <p className="text-muted-foreground font-mono text-sm">No badges earned yet</p>
                                    <p className="text-[10px] text-muted-foreground/70 mt-1">Keep checking in to unlock achievements!</p>
                                </div>
                            )}
                        </div>

                        {/* Locked Badges */}
                        <div>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
                                Available ({allBadges.filter(b => !earnedIds.has(b.id)).length})
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {allBadges
                                    .filter(b => !earnedIds.has(b.id))
                                    .map(badge => (
                                        <div
                                            key={badge.id}
                                            className="bg-muted/5 border border-muted/20 rounded-xl p-4 text-center opacity-50"
                                        >
                                            <span className="text-3xl mb-2 block grayscale">{badge.icon}</span>
                                            <p className="text-sm font-mono font-bold text-muted-foreground">{badge.name}</p>
                                            <p className="text-[10px] text-muted-foreground/70 mt-1">{badge.description}</p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Achievements;
