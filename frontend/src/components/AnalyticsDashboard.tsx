import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
    X,
    BarChart2,
    Calendar,
    Battery,
    Moon,
    Brain,
    Activity,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    Sparkles,
    Droplets,
    HelpCircle
} from 'lucide-react';
import { CapacityExplainer } from './CapacityExplainer';

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
    const [activeTab, setActiveTab] = useState<'trends' | 'weekly' | 'insights'>('trends');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [weeklyInsights, setWeeklyInsights] = useState<any>(null);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [aiTrendAnalysis, setAiTrendAnalysis] = useState<{
        hasEnoughData: boolean;
        trend?: 'improving' | 'stable' | 'declining';
        aiAnalysis?: string;
    } | null>(null);
    const [showCapacityExplainer, setShowCapacityExplainer] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [analytics, trendAnalysis] = await Promise.all([
                    api.getAnalytics(),
                    api.getAITrendAnalysis().catch(() => null)
                ]);
                setData(analytics);
                if (trendAnalysis?.hasEnoughData) {
                    setAiTrendAnalysis(trendAnalysis);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                <div className="text-center animate-pulse flex flex-col items-center">
                    <BarChart2 className="w-12 h-12 text-primary mb-4" />
                    <p className="text-muted-foreground font-display text-sm">Synthesizing Data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[60] flex flex-col items-center justify-center p-4">
                <div className="glass-card max-w-sm text-center">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>
                    <p className="text-destructive font-display font-medium mb-4">{error}</p>
                    <button onClick={onClose} className="btn-ghost">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 overflow-auto safe-area-bottom animate-fade-in">
            <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 sticky top-0 py-4 z-20 bg-background/50 backdrop-blur-md">
                    <div>
                        <h2 className="text-3xl font-display font-medium text-foreground tracking-tight">
                            Wellness Analytics
                        </h2>
                        <p className="text-sm text-muted-foreground">Your biological trends</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center transition-all"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 p-1 bg-muted/20 rounded-2xl w-fit">
                    {(['trends', 'weekly', 'insights'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                if (tab === 'insights' && !weeklyInsights && !insightsLoading) {
                                    setInsightsLoading(true);
                                    api.getWeeklySummary().then(setWeeklyInsights).catch(console.error).finally(() => setInsightsLoading(false));
                                }
                            }}
                            className={`px-6 py-2.5 font-display font-medium text-sm rounded-xl transition-all ${activeTab === tab
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {tab === 'trends' ? 'Trends' : tab === 'weekly' ? 'Weekly' : 'AI Insights'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="animate-slide-up">

                    {/* Summary Cards */}
                    {data?.summary && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                            <StatCard label="Total Days" value={data.summary.totalDays} icon={Calendar} />
                            <div onClick={() => setShowCapacityExplainer(true)} className="cursor-pointer group relative">
                                <StatCard
                                    label="30-Day Avg"
                                    value={`${data.summary.avgCapacity}%`}
                                    icon={Battery}
                                    color={data.summary.avgCapacity >= 70 ? 'text-emerald-500' : 'text-amber-500'}
                                />
                                <HelpCircle className="absolute top-2 right-2 w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                            </div>
                            <StatCard label="Sleep Issues" value={data.summary.lowSleepDays} icon={Moon} color="text-rose-500" />
                            <StatCard label="High Stress" value={data.summary.highStressDays} icon={Brain} color="text-amber-500" />
                            <StatCard label="Workouts" value={data.summary.exerciseDays} icon={Activity} color="text-emerald-500" />
                        </div>
                    )}

                    {/* Trends Tab */}
                    {activeTab === 'trends' && (
                        <>
                            {/* Info Banner */}
                            <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                                <p className="text-sm text-foreground/80">
                                    <span className="font-semibold text-primary">📊 30-Day Overview</span> — Your capacity trend over the last month.
                                    Capacity = your cognitive energy (100% = fully charged, below 45% = recovery needed).
                                </p>
                            </div>
                            <div className="glass-card p-6 bg-card border-border">
                                <h3 className="text-lg font-display font-medium mb-6 text-foreground">Capacity Trend (30 Days)</h3>

                                {data?.trends && data.trends.length > 0 ? (
                                    <div className="h-64 flex items-end gap-2 overflow-x-auto pb-4">
                                        {data.trends.map((day, idx) => {
                                            const height = Math.max(10, day.capacity);
                                            const isLow = day.capacity < 45;
                                            const isHigh = day.capacity >= 70;

                                            return (
                                                <div key={idx} className="flex-1 min-w-[20px] h-full flex flex-col justify-end group relative cursor-pointer">
                                                    <div
                                                        className={`w-full rounded-t-lg transition-all duration-500 hover:opacity-80 ${isHigh ? 'bg-gradient-to-t from-emerald-500/50 to-emerald-400' :
                                                            isLow ? 'bg-gradient-to-t from-rose-500/50 to-rose-400' :
                                                                'bg-gradient-to-t from-amber-500/50 to-amber-400'
                                                            }`}
                                                        style={{ height: `${height}%` }}
                                                    />
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-popover text-popover-foreground rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none border border-border shadow-md">
                                                        <p className="font-bold">{day.date}</p>
                                                        <p>Capacity: {day.capacity}%</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                                        No trend data available yet.
                                    </div>
                                )}
                            </div>

                            {/* AI Trend Analysis */}
                            {aiTrendAnalysis?.aiAnalysis && (
                                <div className="glass-card p-6 mt-6 bg-card border-border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className="text-lg font-display font-medium text-foreground">AI Trend Analysis</h3>
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-full flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" /> AI POWERED
                                        </span>
                                        <div className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${aiTrendAnalysis.trend === 'improving' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                            aiTrendAnalysis.trend === 'declining' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' :
                                                'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                            }`}>
                                            {aiTrendAnalysis.trend === 'improving' ? <TrendingUp className="w-3 h-3" /> :
                                                aiTrendAnalysis.trend === 'declining' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}

                                            {aiTrendAnalysis.trend === 'improving' ? 'Improving' :
                                                aiTrendAnalysis.trend === 'declining' ? 'Declining' : 'Stable'}
                                        </div>
                                    </div>
                                    <p className="text-sm text-foreground/80 leading-relaxed">
                                        {aiTrendAnalysis.aiAnalysis}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Weekly Tab */}
                    {activeTab === 'weekly' && data?.weekly?.stats && (
                        <>
                            {/* Info Banner */}
                            <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                <p className="text-sm text-foreground/80">
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">📅 This Week Only</span> — Performance from the last 7 days.
                                    Compare with your 30-day average in the Trends tab.
                                </p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="glass-card p-6 bg-card border-border">
                                    <h3 className="text-lg font-display font-medium mb-4 text-foreground">Weekly Performance</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-muted/20 rounded-xl">
                                            <span className="text-muted-foreground">This Week Avg</span>
                                            <span className="text-xl font-bold text-foreground">{data.weekly.stats.avgCapacity}%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-muted/20 rounded-xl">
                                            <span className="text-muted-foreground">Check-ins This Week</span>
                                            <span className="text-xl font-bold text-foreground">{data.weekly.stats.daysLogged}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-muted/10 rounded-xl">
                                            <span className="text-muted-foreground">Hydration Issues</span>
                                            <span className="text-xl font-bold text-rose-500">{data.weekly.stats.hydrationIssues}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-card p-6 bg-card border-border">
                                    <h3 className="text-lg font-display font-medium mb-4 text-foreground">Key Insights</h3>
                                    <div className="space-y-3">
                                        {data.weekly.insights?.map((insight, idx) => (
                                            <div key={idx} className={`p-4 rounded-xl border ${insight.type === 'positive' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'
                                                }`}>
                                                <p className="text-sm font-medium leading-relaxed opacity-90 text-foreground">
                                                    {insight.text}
                                                </p>
                                            </div>
                                        ))}
                                        {(!data.weekly.insights || data.weekly.insights.length === 0) && (
                                            <p className="text-muted-foreground">No significant insights for this week yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* AI Insights Tab */}
                    {activeTab === 'insights' && (
                        <div className="space-y-6">
                            {/* Info Banner */}
                            <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                                <p className="text-sm text-foreground/80">
                                    <span className="font-semibold text-cyan-600 dark:text-cyan-400">🤖 AI Analysis (7 Days)</span> — Personalized insights from your weekly data.
                                    Recommendations based on patterns detected in your check-ins.
                                </p>
                            </div>
                            {insightsLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="text-muted-foreground">Analyzing patterns...</p>
                                </div>
                            ) : weeklyInsights ? (
                                <>
                                    <div className="bento-grid !p-0 !pb-0 md:!grid-cols-3">
                                        {/* Sleep Quality */}
                                        <div className="bento-card p-6 flex flex-col items-center justify-center text-center bg-card border-border">
                                            <Moon className="w-10 h-10 mb-2 text-primary" />
                                            <span className="text-2xl font-bold text-foreground">{weeklyInsights.overview?.sleepQualityRate || 0}%</span>
                                            <span className="text-xs uppercase tracking-widest text-muted-foreground">Good Sleep Days</span>
                                            <span className="text-[10px] text-muted-foreground mt-1">Days with quality rest</span>
                                        </div>
                                        {/* Hydration */}
                                        <div className="bento-card p-6 flex flex-col items-center justify-center text-center bg-card border-border">
                                            <Droplets className="w-10 h-10 mb-2 text-cyan-500" />
                                            <span className="text-2xl font-bold text-cyan-500">{weeklyInsights.overview?.hydrationRate || 0}%</span>
                                            <span className="text-xs uppercase tracking-widest text-muted-foreground">Hydration Score</span>
                                            <span className="text-[10px] text-muted-foreground mt-1">Days you hit water goal</span>
                                        </div>
                                        {/* Exercise */}
                                        <div className="bento-card p-6 flex flex-col items-center justify-center text-center bg-card border-border">
                                            <Activity className="w-10 h-10 mb-2 text-emerald-500" />
                                            <span className="text-2xl font-bold text-emerald-500">{weeklyInsights.overview?.exerciseRate || 0}%</span>
                                            <span className="text-xs uppercase tracking-widest text-muted-foreground">Active Days</span>
                                            <span className="text-[10px] text-muted-foreground mt-1">Days you exercised</span>
                                        </div>
                                    </div>

                                    {/* Detailed Text Insights */}
                                    <div className="glass-card p-6 bg-card border-border">
                                        <div className="flex items-center gap-2 mb-4">
                                            <h3 className="text-lg font-display font-medium text-foreground">Deep Analysis</h3>
                                            {weeklyInsights.aiPowered && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/20 text-primary rounded-full flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" /> AI POWERED
                                                </span>
                                            )}
                                        </div>
                                        {weeklyInsights.recommendations && weeklyInsights.recommendations.length > 0 ? (
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {weeklyInsights.recommendations.map((rec: any, idx: number) => (
                                                    <div key={idx} className="p-4 rounded-2xl bg-muted/10 hover:bg-muted/20 transition-colors">
                                                        <p className="font-bold text-primary mb-1">{rec.action}</p>
                                                        <p className="text-sm text-muted-foreground">{rec.reason}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Sparkles className="w-10 h-10 mx-auto mb-2 text-primary/50" />
                                                <p className="font-medium">Great job!</p>
                                                <p className="text-sm">No specific recommendations - you're doing well!</p>
                                            </div>
                                        )}

                                        {/* Correlations */}
                                        {weeklyInsights.correlations && weeklyInsights.correlations.length > 0 && (
                                            <div className="mt-6 pt-6 border-t border-border/10">
                                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Patterns Found</h4>
                                                <div className="space-y-2">
                                                    {weeklyInsights.correlations.map((c: any, idx: number) => (
                                                        <div key={idx} className="p-3 rounded-xl bg-muted/10 text-sm text-foreground">
                                                            {c.message}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Supermemory Deep Analysis */}
                                        {weeklyInsights.memoryInsights && (weeklyInsights.memoryInsights.callback?.message || (weeklyInsights.memoryInsights.historicalContext?.length > 0)) && (
                                            <div className="mt-6 pt-6 border-t border-border/10">
                                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Brain className="w-4 h-4" /> AI Memory Recall
                                                </h4>
                                                {weeklyInsights.memoryInsights.callback?.message && (
                                                    <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-cyan-500/10 border border-primary/20">
                                                        <p className="text-sm text-foreground/90 italic">
                                                            "{weeklyInsights.memoryInsights.callback.message}"
                                                        </p>
                                                    </div>
                                                )}
                                                {weeklyInsights.memoryInsights.historicalContext && weeklyInsights.memoryInsights.historicalContext.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        <p className="text-xs text-muted-foreground">Historical patterns:</p>
                                                        {weeklyInsights.memoryInsights.historicalContext.map((ctx: string, idx: number) => (
                                                            <div key={idx} className="p-3 rounded-xl bg-muted/10 text-xs text-muted-foreground">
                                                                {typeof ctx === 'string' ? ctx : JSON.stringify(ctx)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    {weeklyInsights?.hasEnoughData === false ? (
                                        <>
                                            <BarChart2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                                            <p className="text-lg font-medium text-foreground mb-2">Not Enough Data</p>
                                            <p className="text-muted-foreground">{weeklyInsights?.message || 'Need at least 3 days of data for AI insights'}</p>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                                            <p className="text-muted-foreground">Unable to generate insights at this time.</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Capacity Explainer Modal */}
            <CapacityExplainer
                isOpen={showCapacityExplainer}
                onClose={() => setShowCapacityExplainer(false)}
                currentCapacity={data?.summary?.avgCapacity}
            />
        </div >
    );
}

function StatCard({ label, value, icon, color = 'text-foreground' }: { label: string; value: string | number; icon: React.ElementType; color?: string }) {
    const Icon = icon;
    return (
        <div className="glass p-4 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-muted/10 transition-colors bg-card border border-border/50">
            <Icon className={`w-8 h-8 mb-2 ${color}`} />
            <span className={`text-xl font-bold font-display ${color}`}>{value}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</span>
        </div>
    );
}

export default AnalyticsDashboard;
