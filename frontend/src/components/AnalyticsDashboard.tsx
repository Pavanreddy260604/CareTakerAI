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
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-primary font-mono text-sm">Loading Analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <p className="text-destructive font-mono mb-4">{error}</p>
                    <button
                        onClick={onClose}
                        className="text-primary hover:underline font-mono px-4 py-2"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-50 overflow-auto safe-area-bottom">
            <div className="max-w-4xl mx-auto px-4 py-6 pb-20 sm:pb-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-background py-2 -mx-4 px-4 z-10">
                    <h2 className="text-xl sm:text-2xl font-mono font-bold text-primary flex items-center gap-2">
                        <span>📊</span>
                        <span>Analytics</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-white text-2xl p-2 -mr-2 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab('trends')}
                        className={`px-4 py-2.5 font-mono text-sm rounded-xl transition-all whitespace-nowrap ${activeTab === 'trends'
                            ? 'bg-primary text-black font-bold'
                            : 'bg-muted/20 text-muted-foreground hover:text-white'
                            }`}
                    >
                        30-Day Trends
                    </button>
                    <button
                        onClick={() => setActiveTab('weekly')}
                        className={`px-4 py-2.5 font-mono text-sm rounded-xl transition-all whitespace-nowrap ${activeTab === 'weekly'
                            ? 'bg-primary text-black font-bold'
                            : 'bg-muted/20 text-muted-foreground hover:text-white'
                            }`}
                    >
                        Weekly Summary
                    </button>
                </div>

                {/* Summary Stats - Responsive Grid */}
                {data?.summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-6">
                        <StatCard label="Total Days" value={data.summary.totalDays} />
                        <StatCard
                            label="Avg Capacity"
                            value={`${data.summary.avgCapacity}%`}
                            color={data.summary.avgCapacity >= 60 ? 'text-primary' : 'text-yellow-500'}
                        />
                        <StatCard label="Low Sleep" value={data.summary.lowSleepDays} color="text-destructive" />
                        <StatCard label="High Stress" value={data.summary.highStressDays} color="text-yellow-500" />
                        <StatCard label="Exercise" value={data.summary.exerciseDays} color="text-primary" />
                    </div>
                )}

                {/* Trends Tab */}
                {activeTab === 'trends' && (
                    <div className="bg-[#0a0a0a] border border-muted/30 rounded-xl p-4 sm:p-5">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
                            Capacity Over Time
                        </p>

                        {data?.trends && data.trends.length > 0 ? (
                            <>
                                {/* Chart visualization - horizontally scrollable on mobile */}
                                <div className="overflow-x-auto scroll-container pb-2 -mx-4 px-4">
                                    <div
                                        className="flex items-end gap-1.5 h-40 mb-4"
                                        style={{ minWidth: `${Math.max(320, data.trends.length * 16)}px` }}
                                    >
                                        {data.trends.map((day, idx) => {
                                            const height = Math.max(8, day.capacity);
                                            const color = day.capacity >= 70
                                                ? 'bg-primary'
                                                : day.capacity >= 45
                                                    ? 'bg-yellow-500'
                                                    : 'bg-destructive';
                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex-1 flex flex-col items-center justify-end h-full group min-w-[14px]"
                                                >
                                                    {/* Tooltip on hover */}
                                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-foreground bg-background/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                        {day.date}: {day.capacity}%
                                                    </div>
                                                    <div
                                                        className={`w-full rounded-t-sm transition-all ${color} group-hover:opacity-80`}
                                                        style={{ height: `${height}%` }}
                                                    />
                                                    <span className="text-[8px] sm:text-[9px] text-muted-foreground mt-1.5 truncate">
                                                        {day.day}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap gap-3 sm:gap-4 text-[10px] font-mono text-muted-foreground justify-center">
                                    <span className="flex items-center gap-1.5">
                                        <span className="inline-block w-3 h-3 bg-primary rounded-sm" />
                                        <span>Good (≥70%)</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="inline-block w-3 h-3 bg-yellow-500 rounded-sm" />
                                        <span>Warning (45-69%)</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="inline-block w-3 h-3 bg-destructive rounded-sm" />
                                        <span>Critical (&lt;45%)</span>
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">📈</span>
                                </div>
                                <p className="text-muted-foreground font-mono mb-2">No trend data yet</p>
                                <p className="text-[11px] text-muted-foreground/70">
                                    Start logging daily to see your capacity chart
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Weekly Tab */}
                {activeTab === 'weekly' && data?.weekly && (
                    <div className="space-y-4">
                        {data.weekly.stats ? (
                            <>
                                <div className="bg-[#0a0a0a] border border-muted/30 rounded-xl p-4 sm:p-5">
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
                                        This Week's Stats
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                        <StatCard label="Days Logged" value={data.weekly.stats.daysLogged} />
                                        <StatCard label="Avg Capacity" value={`${data.weekly.stats.avgCapacity}%`} />
                                        <StatCard label="Exercise" value={`${data.weekly.stats.exerciseDays}/7`} color="text-primary" />
                                    </div>
                                </div>

                                {data.weekly.insights && data.weekly.insights.length > 0 && (
                                    <div className="bg-[#0a0a0a] border border-muted/30 rounded-xl p-4 sm:p-5">
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
                                            Weekly Insights
                                        </p>
                                        <div className="space-y-2">
                                            {data.weekly.insights.map((insight, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 sm:p-4 rounded-xl border ${insight.type === 'positive'
                                                        ? 'border-primary/30 bg-primary/5 text-primary'
                                                        : 'border-yellow-500/30 bg-yellow-500/5 text-yellow-500'
                                                        }`}
                                                >
                                                    <p className="text-sm font-mono leading-relaxed">
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
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">📅</span>
                                </div>
                                <p className="text-muted-foreground font-mono">
                                    No data for this week yet
                                </p>
                                <p className="text-[11px] text-muted-foreground/70 mt-1">
                                    Start logging to see weekly insights
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
    return (
        <div className="bg-[#0a0a0a] border border-muted/30 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                {label}
            </p>
            <p className={`text-lg sm:text-xl font-mono font-bold ${color}`}>
                {value}
            </p>
        </div>
    );
}

export default AnalyticsDashboard;
