import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface AnalyticsData {
    trends: Array<{
        date: string;
        day: string;
        capacity: number;
        sleep: number;
        stress: number;
    }>;
    summary: {
        totalDays: number;
        avgCapacity: number;
        lowSleepDays: number;
        highStressDays: number;
        exerciseDays: number;
    };
    weekly: {
        stats?: {
            daysLogged: number;
            avgCapacity: number;
            lowSleepDays: number;
            highStressDays: number;
            exerciseDays: number;
            hydrationIssues: number;
        };
        insights?: Array<{ type: string; text: string }>;
    };
}

interface AnalyticsDashboardProps {
    onClose: () => void;
}

export function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'trends' | 'weekly'>('trends');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const analytics = await api.getAnalytics();
                setData(analytics);
            } catch (e: any) {
                console.error('Analytics fetch error:', e);
                setError(e.message || 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <p className="text-primary font-mono animate-pulse text-center">Loading Analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                <p className="text-destructive font-mono mb-4">⚠️ {error}</p>
                <button onClick={onClose} className="text-primary hover:underline font-mono">Close</button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-auto">
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-mono font-bold text-primary">📊 Analytics Dashboard</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-white text-2xl">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('trends')}
                        className={`px-4 py-2 font-mono text-sm rounded transition-all ${activeTab === 'trends' ? 'bg-primary text-black' : 'bg-muted/20 text-muted-foreground hover:text-white'
                            }`}
                    >
                        30-Day Trends
                    </button>
                    <button
                        onClick={() => setActiveTab('weekly')}
                        className={`px-4 py-2 font-mono text-sm rounded transition-all ${activeTab === 'weekly' ? 'bg-primary text-black' : 'bg-muted/20 text-muted-foreground hover:text-white'
                            }`}
                    >
                        Weekly Summary
                    </button>
                </div>

                {/* Summary Stats */}
                {data?.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        <StatCard label="Total Days" value={data.summary.totalDays} />
                        <StatCard label="Avg Capacity" value={`${data.summary.avgCapacity}%`} color={data.summary.avgCapacity >= 60 ? 'text-primary' : 'text-yellow-500'} />
                        <StatCard label="Low Sleep Days" value={data.summary.lowSleepDays} color="text-destructive" />
                        <StatCard label="High Stress Days" value={data.summary.highStressDays} color="text-yellow-500" />
                        <StatCard label="Exercise Days" value={data.summary.exerciseDays} color="text-primary" />
                    </div>
                )}

                {/* Trends Tab */}
                {activeTab === 'trends' && (
                    <div className="bg-black/30 border border-muted/30 rounded-lg p-4">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
                            Capacity Over Time
                        </p>

                        {data?.trends && data.trends.length > 0 ? (
                            <>
                                {/* Chart visualization - scrollable on mobile */}
                                <div className="overflow-x-auto pb-2">
                                    <div className="flex items-end gap-1 h-40 mb-4" style={{ minWidth: `${Math.max(300, data.trends.length * 15)}px` }}>
                                        {data.trends.map((day, idx) => {
                                            const height = Math.max(5, day.capacity);
                                            const color = day.capacity >= 70 ? 'bg-primary' : day.capacity >= 45 ? 'bg-yellow-500' : 'bg-destructive';
                                            return (
                                                <div key={idx} className="flex-1 flex flex-col items-center group min-w-[12px]">
                                                    <div
                                                        className={`w-full rounded-t transition-all ${color} group-hover:opacity-80`}
                                                        style={{ height: `${height}%` }}
                                                        title={`${day.date}: ${day.capacity}%`}
                                                    />
                                                    <span className="text-[8px] text-muted-foreground mt-1 truncate">{day.day}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Legend - wraps on mobile */}
                                <div className="flex flex-wrap gap-3 text-[10px] font-mono text-muted-foreground">
                                    <span><span className="inline-block w-3 h-3 bg-primary rounded mr-1" /> Good (≥70%)</span>
                                    <span><span className="inline-block w-3 h-3 bg-yellow-500 rounded mr-1" /> Warning (45-69%)</span>
                                    <span><span className="inline-block w-3 h-3 bg-destructive rounded mr-1" /> Critical (&lt;45%)</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground font-mono mb-2">No trend data yet</p>
                                <p className="text-[10px] text-muted-foreground/70">Start logging daily to see your capacity chart</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Weekly Tab */}
                {activeTab === 'weekly' && data?.weekly && (
                    <div className="space-y-4">
                        {data.weekly.stats ? (
                            <>
                                <div className="bg-black/30 border border-muted/30 rounded-lg p-4">
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
                                        This Week's Stats
                                    </p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <StatCard label="Days Logged" value={data.weekly.stats.daysLogged} />
                                        <StatCard label="Avg Capacity" value={`${data.weekly.stats.avgCapacity}%`} />
                                        <StatCard label="Exercise" value={`${data.weekly.stats.exerciseDays}/7`} color="text-primary" />
                                    </div>
                                </div>

                                {data.weekly.insights && data.weekly.insights.length > 0 && (
                                    <div className="bg-black/30 border border-muted/30 rounded-lg p-4">
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
                                            Weekly Insights
                                        </p>
                                        <div className="space-y-2">
                                            {data.weekly.insights.map((insight, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-lg border ${insight.type === 'positive'
                                                        ? 'border-primary/30 bg-primary/5 text-primary'
                                                        : 'border-yellow-500/30 bg-yellow-500/5 text-yellow-500'
                                                        }`}
                                                >
                                                    <p className="text-sm font-mono">
                                                        {insight.type === 'positive' ? '✓ ' : '⚠ '}
                                                        {insight.text}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-muted-foreground font-mono text-center py-8">
                                No data for this week yet. Start logging!
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
    return (
        <div className="bg-black/30 border border-muted/30 rounded-lg p-3 text-center">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</p>
            <p className={`text-xl font-mono font-bold ${color}`}>{value}</p>
        </div>
    );
}

export default AnalyticsDashboard;
