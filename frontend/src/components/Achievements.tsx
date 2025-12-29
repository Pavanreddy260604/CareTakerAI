import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
    Flame, Crown, Trophy, Dumbbell, Moon, Droplets, Rocket, Shield,
    Medal, X, Zap, Sparkles, AlertTriangle, Bot, Target, Lock
} from 'lucide-react';

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: any; // Updated to accept component or string, but we'll map IDs to icons
    earned: boolean;
}

interface AchievementsProps {
    onClose: () => void;
}

export function Achievements({ onClose }: AchievementsProps) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [streak, setStreak] = useState<{ current: number; longest: number; atRisk: boolean } | null>(null);
    const [aiMotivation, setAiMotivation] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [achievementsData, streakData] = await Promise.all([
                    api.getAchievements(),
                    api.getStreak()
                ]);
                setAchievements(achievementsData.achievements || []);
                setStreak(streakData);
                if (achievementsData.aiMotivation) {
                    setAiMotivation(achievementsData.aiMotivation);
                }
            } catch (e) {
                console.error('Failed to load achievements:', e);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // Badge mapping
    const getBadgeIcon = (id: string, className = "w-8 h-8") => {
        const props = { className };
        switch (id) {
            case 'streak_week': return <Flame {...props} className={className + " text-orange-500"} />;
            case 'streak_2week': return <Crown {...props} className={className + " text-yellow-500"} />;
            case 'streak_month': return <Trophy {...props} className={className + " text-primary"} />;
            case 'exercise_10': return <Dumbbell {...props} className={className + " text-blue-500"} />;
            case 'sleep_master': return <Moon {...props} className={className + " text-indigo-400"} />;
            case 'hydration_hero': return <Droplets {...props} className={className + " text-cyan-400"} />;
            case 'peak_performer': return <Rocket {...props} className={className + " text-rose-500"} />;
            case 'recovery_respect': return <Shield {...props} className={className + " text-emerald-500"} />;
            default: return <Medal {...props} />;
        }
    };

    // Predefined badges that can be earned (metadata only)
    const allBadges = [
        { id: 'streak_week', name: 'Week Warrior', description: '7-day check-in streak' },
        { id: 'streak_2week', name: 'Consistency King', description: '14-day check-in streak' },
        { id: 'streak_month', name: 'Monthly Master', description: '30-day check-in streak' },
        { id: 'exercise_10', name: 'Active Lifestyle', description: '10+ exercise days this month' },
        { id: 'sleep_master', name: 'Sleep Master', description: '20+ good sleep days this month' },
        { id: 'hydration_hero', name: 'Hydration Hero', description: '20+ good hydration days' },
        { id: 'peak_performer', name: 'Peak Performer', description: '5+ days at 80%+ capacity' },
        { id: 'recovery_respect', name: 'Recovery Respect', description: 'Entered recovery mode when needed' },
    ];

    const earnedIds = new Set(achievements.map(a => a.id));

    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-auto animate-in fade-in duration-200">
            <div className="max-w-lg mx-auto px-4 py-6 pb-20">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-mono font-bold text-primary flex items-center gap-2">
                        <Medal className="w-6 h-6" />
                        <span>Achievements</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground text-2xl p-2 transition-colors"
                    >
                        <X className="w-6 h-6" />
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
                                    <div className="text-primary">
                                        {streak.current >= 7 ? <Flame className="w-12 h-12" /> : streak.current >= 3 ? <Zap className="w-12 h-12" /> : <Sparkles className="w-12 h-12" />}
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm font-mono">
                                    <span className="text-muted-foreground">Longest: {streak.longest} days</span>
                                    {streak.atRisk && (
                                        <span className="text-yellow-500 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> At risk!</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* AI Motivation Message */}
                        {aiMotivation && (
                            <div className="bg-gradient-to-r from-cyan-500/10 to-primary/10 border border-cyan-500/20 rounded-2xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <Bot className="w-8 h-8 text-cyan-500" />
                                    <div>
                                        <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">AI Coach Says</p>
                                        <p className="text-sm text-foreground/90 italic">"{aiMotivation}"</p>
                                    </div>
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
                                            className="bg-primary/10 border border-primary/40 rounded-xl p-4 text-center flex flex-col items-center"
                                        >
                                            <div className="mb-2">{getBadgeIcon(badge.id)}</div>
                                            <p className="text-sm font-mono font-bold text-primary">{badge.name}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-muted/5 rounded-xl border border-muted/20 flex flex-col items-center">
                                    <Target className="w-10 h-10 text-muted-foreground mb-3" />
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
                                            className="bg-muted/5 border border-muted/20 rounded-xl p-4 text-center opacity-60 flex flex-col items-center"
                                        >
                                            <div className="mb-2 grayscale opacity-50">{getBadgeIcon(badge.id)}</div>
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
