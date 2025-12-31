/**
 * backend/src/services/analyticsService.js
 * Analytics: Trend data, weekly summaries, pattern analysis
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const HealthLog = require('../models/HealthLog');

/**
 * Get trend data for charts (last N days)
 */
async function getTrendData(userId, days = 30) {
    try {
        const history = await HealthLog.find({ userId })
            .sort({ date: -1 })
            .limit(days);

        // Convert to chart-friendly format
        const trends = history.reverse().map(log => {
            const date = new Date(log.date);
            // Use actual hydration amount when available, fallback to status-based
            let waterScore;
            if (log.hydrationAmount && log.hydrationGoal) {
                waterScore = Math.round((log.hydrationAmount / log.hydrationGoal) * 100);
            } else {
                waterScore = log.health?.water === 'OK' ? 100 : log.health?.water === 'LOW' ? 30 : 50;
            }
            return {
                date: date.toISOString().split('T')[0],
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                sleep: log.health?.sleep === 'OK' ? 100 : log.health?.sleep === 'LOW' ? 30 : 50,
                water: waterScore,
                hydrationMl: log.hydrationAmount || null,
                hydrationGoal: log.hydrationGoal || null,
                stress: log.health?.mentalLoad === 'LOW' ? 100 : log.health?.mentalLoad === 'HIGH' ? 20 : 60,
                exercise: log.health?.exercise === 'DONE' ? 100 : 0,
                capacity: log.capacityScore || log.aiResponse?.metrics?.capacity || 50
            };
        });

        return {
            trends,
            summary: {
                totalDays: history.length,
                avgCapacity: trends.length > 0
                    ? Math.round(trends.reduce((a, b) => a + b.capacity, 0) / trends.length)
                    : 50,
                lowSleepDays: history.filter(l => l.health?.sleep === 'LOW').length,
                highStressDays: history.filter(l => l.health?.mentalLoad === 'HIGH').length,
                exerciseDays: history.filter(l => l.health?.exercise === 'DONE').length
            }
        };
    } catch (error) {
        console.error('Analytics Trend Error:', error);
        return { trends: [], summary: {} };
    }
}

/**
 * Generate weekly summary
 */
async function getWeeklySummary(userId) {
    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const logs = await HealthLog.find({
            userId,
            date: { $gte: weekAgo }
        }).sort({ date: -1 });

        if (logs.length === 0) {
            return { message: 'No data this week', stats: null };
        }

        // Calculate average hydration rate from actual amounts
        const logsWithHydration = logs.filter(l => l.hydrationAmount && l.hydrationGoal);
        const avgHydrationRate = logsWithHydration.length > 0
            ? Math.round(logsWithHydration.reduce((sum, l) => sum + (l.hydrationAmount / l.hydrationGoal) * 100, 0) / logsWithHydration.length)
            : null;

        // Count hydration issues using actual amount when available
        const hydrationIssues = logs.filter(l => {
            if (l.hydrationAmount && l.hydrationGoal) {
                return l.hydrationAmount < l.hydrationGoal * 0.7; // Below 70% of goal
            }
            return l.health?.water === 'LOW';
        }).length;

        const stats = {
            daysLogged: logs.length,
            avgCapacity: Math.round(
                logs.reduce((a, l) => a + (l.capacityScore || l.aiResponse?.metrics?.capacity || 50), 0) / logs.length
            ),
            lowSleepDays: logs.filter(l => l.health?.sleep === 'LOW').length,
            highStressDays: logs.filter(l => l.health?.mentalLoad === 'HIGH').length,
            exerciseDays: logs.filter(l => l.health?.exercise === 'DONE').length,
            hydrationIssues: hydrationIssues,
            avgHydrationRate: avgHydrationRate
        };

        // Generate insights
        const insights = [];

        if (stats.avgCapacity >= 70) {
            insights.push({ type: 'positive', text: 'Strong week! Capacity averaged above 70%.' });
        } else if (stats.avgCapacity < 45) {
            insights.push({ type: 'warning', text: 'Challenging week. Capacity stayed low.' });
        }

        if (stats.lowSleepDays >= 3) {
            insights.push({ type: 'warning', text: `Sleep was poor on ${stats.lowSleepDays} days. Consider sleep hygiene.` });
        }

        if (stats.exerciseDays >= 4) {
            insights.push({ type: 'positive', text: `Great movement! Exercised ${stats.exerciseDays} days.` });
        }

        if (stats.hydrationIssues >= 3) {
            insights.push({ type: 'warning', text: `Hydration needs attention (${stats.hydrationIssues} low days).` });
        }

        return { stats, insights, logs: logs.length };
    } catch (error) {
        console.error('Analytics Weekly Error:', error);
        return { message: 'Error loading summary', stats: null };
    }
}

/**
 * Get comprehensive analytics
 */
async function getFullAnalytics(userId) {
    const [trends, weekly] = await Promise.all([
        getTrendData(userId, 30),
        getWeeklySummary(userId)
    ]);

    return {
        trends: trends.trends,
        summary: trends.summary,
        weekly,
        generatedAt: new Date().toISOString()
    };
}

module.exports = {
    getTrendData,
    getWeeklySummary,
    getFullAnalytics
};
