/**
 * backend/src/services/insightsService.js
 * Weekly Insights & Pattern Detection with Supermemory + Gemini AI Integration
 */
const HealthLog = require('../models/HealthLog');
const User = require('../models/User');
const { queryMemory, getMemoryCallback } = require('./memoryService');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini for Deep Analysis
let geminiModel = null;
if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

// Basic In-Memory Cache to prevent AI Rate Limiting
const summaryCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Hours (Daily Strategy)

/**
 * Invalidate cache for a user (called after new check-in)
 */
function invalidateCache(userId) {
    if (summaryCache.has(userId)) {
        console.log(`Checking-in: Invalidating insights cache for user ${userId}`);
        summaryCache.delete(userId);
    }
}

/**
 * Generate weekly summary with insights + Supermemory deep analysis
 */
async function generateWeeklySummary(userId) {
    try {
        // Check Cache
        if (summaryCache.has(userId)) {
            const { timestamp, data } = summaryCache.get(userId);
            if (Date.now() - timestamp < CACHE_TTL) {
                console.log(`Using cached weekly summary for user ${userId} (Age: ${Math.round((Date.now() - timestamp) / 60000)}m)`);
                return data;
            }
        }

        // Get last 7 days of logs
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const logs = await HealthLog.find({
            userId,
            date: { $gte: weekAgo }
        }).sort({ date: -1 });

        if (logs.length < 3) {
            return {
                hasEnoughData: false,
                message: 'Need at least 3 days of data for weekly summary',
                daysLogged: logs.length
            };
        }

        // Get current state for memory recall
        const currentHealth = logs[0]?.health || {};

        // Fetch long-term memory insights from Supermemory
        // Fetch long-term memory insights from Supermemory with 4s timeout
        let memoryInsights = null;
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Memory fetch timeout')), 4000)
            );

            const fetchPromise = Promise.all([
                getMemoryCallback(userId, currentHealth),
                queryMemory('patterns stress sleep exercise', userId, 5)
            ]);

            const [memoryCallback, historicalPatterns] = await Promise.race([fetchPromise, timeoutPromise]);

            if (memoryCallback || (historicalPatterns && historicalPatterns.length > 0)) {
                memoryInsights = {
                    callback: memoryCallback,
                    historicalContext: historicalPatterns ? historicalPatterns.slice(0, 3) : [],
                    hasLongTermData: !memoryCallback?.isNewUser
                };
            }
        } catch (memError) {
            console.error('Memory fetch error (non-fatal):', memError.message);
        }

        // Calculate base metrics
        const overview = calculateOverview(logs);
        const patterns = detectPatterns(logs);
        const correlations = findCorrelations(logs);
        const ruleBasedRecs = generateRecommendations(logs);

        // Generate AI-powered recommendations if Gemini is available
        let aiRecommendations = null;
        if (geminiModel && logs.length >= 3) {
            try {
                const aiTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 10000));
                aiRecommendations = await Promise.race([
                    generateAIRecommendations(overview, patterns, correlations, memoryInsights),
                    aiTimeout
                ]);
            } catch (aiError) {
                console.error('AI recommendations error (non-fatal):', aiError.message);
            }
        }

        // Calculate metrics
        const summary = {
            hasEnoughData: true,
            period: {
                start: weekAgo.toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0],
                daysLogged: logs.length
            },
            overview: overview,
            bestDay: findBestDay(logs),
            worstDay: findWorstDay(logs),
            patterns: patterns,
            dayOfWeekAnalysis: analyzeDayOfWeek(logs),
            correlations: correlations,
            recommendations: aiRecommendations || ruleBasedRecs, // Prefer AI recs
            ruleBasedRecommendations: ruleBasedRecs,
            progressVsLastWeek: null,
            // Supermemory deep analysis
            memoryInsights: memoryInsights,
            aiPowered: !!aiRecommendations
        };

        // Cache the result to save API calls
        summaryCache.set(userId, {
            timestamp: Date.now(),
            data: summary
        });

        return summary;
    } catch (error) {
        console.error('Weekly summary error:', error);
        return { hasEnoughData: false, error: error.message };
    }
}

/**
 * Calculate overview metrics
 */
function calculateOverview(logs) {
    let totalCapacity = 0;
    let capacityCount = 0;
    let sleepOk = 0;
    let waterOk = 0;
    let exerciseDone = 0;
    let highStress = 0;

    logs.forEach(log => {
        if (log.aiResponse?.metrics?.capacity) {
            totalCapacity += log.aiResponse.metrics.capacity;
            capacityCount++;
        }
        if (log.health?.sleep === 'OK') sleepOk++;
        if (log.health?.water === 'OK') waterOk++;
        if (log.health?.exercise === 'DONE') exerciseDone++;
        if (log.health?.mentalLoad === 'HIGH') highStress++;
    });

    const total = logs.length;

    return {
        avgCapacity: capacityCount > 0 ? Math.round(totalCapacity / capacityCount) : null,
        sleepQualityRate: Math.round((sleepOk / total) * 100),
        hydrationRate: Math.round((waterOk / total) * 100),
        exerciseRate: Math.round((exerciseDone / total) * 100),
        stressRate: Math.round((highStress / total) * 100),
        totalCheckIns: total
    };
}

/**
 * Find best day of the week
 */
function findBestDay(logs) {
    let best = null;
    let bestCapacity = 0;

    logs.forEach(log => {
        const capacity = log.aiResponse?.metrics?.capacity || 0;
        if (capacity > bestCapacity) {
            bestCapacity = capacity;
            best = {
                date: log.date,
                dayName: new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' }),
                capacity: capacity,
                reason: determineDayReason(log, 'best')
            };
        }
    });

    return best;
}

/**
 * Find worst day of the week
 */
function findWorstDay(logs) {
    let worst = null;
    let worstCapacity = 100;

    logs.forEach(log => {
        const capacity = log.aiResponse?.metrics?.capacity || 100;
        if (capacity < worstCapacity && capacity > 0) {
            worstCapacity = capacity;
            worst = {
                date: log.date,
                dayName: new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' }),
                capacity: capacity,
                reason: determineDayReason(log, 'worst')
            };
        }
    });

    return worst;
}

/**
 * Determine reason for best/worst day
 */
function determineDayReason(log, type) {
    const reasons = [];

    if (type === 'best') {
        if (log.health?.sleep === 'OK') reasons.push('good sleep');
        if (log.health?.water === 'OK') reasons.push('proper hydration');
        if (log.health?.exercise === 'DONE') reasons.push('exercised');
        if (log.health?.mentalLoad !== 'HIGH') reasons.push('managed stress');
    } else {
        if (log.health?.sleep === 'LOW') reasons.push('poor sleep');
        if (log.health?.water === 'LOW') reasons.push('dehydration');
        if (log.health?.mentalLoad === 'HIGH') reasons.push('high stress');
        if (log.health?.food === 'LOW') reasons.push('poor nutrition');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'multiple factors';
}

/**
 * Detect patterns in the data
 */
function detectPatterns(logs) {
    const patterns = [];

    // Check for consecutive issues
    let consecutiveLowSleep = 0;
    let consecutiveHighStress = 0;
    let consecutiveLowWater = 0;

    logs.forEach(log => {
        if (log.health?.sleep === 'LOW') consecutiveLowSleep++;
        else consecutiveLowSleep = 0;

        if (log.health?.mentalLoad === 'HIGH') consecutiveHighStress++;
        else consecutiveHighStress = 0;

        if (log.health?.water === 'LOW') consecutiveLowWater++;
        else consecutiveLowWater = 0;
    });

    if (consecutiveLowSleep >= 3) {
        patterns.push({
            type: 'warning',
            category: 'sleep',
            message: `${consecutiveLowSleep} consecutive days of poor sleep`,
            icon: '😴',
            severity: 'high'
        });
    }

    if (consecutiveHighStress >= 3) {
        patterns.push({
            type: 'warning',
            category: 'mental',
            message: `${consecutiveHighStress} consecutive days of high stress`,
            icon: '🧠',
            severity: 'high'
        });
    }

    if (consecutiveLowWater >= 2) {
        patterns.push({
            type: 'warning',
            category: 'hydration',
            message: `${consecutiveLowWater} consecutive days of low hydration`,
            icon: '💧',
            severity: 'medium'
        });
    }

    // Check for exercise patterns
    const exerciseDays = logs.filter(l => l.health?.exercise === 'DONE').length;
    if (exerciseDays >= 5) {
        patterns.push({
            type: 'positive',
            category: 'exercise',
            message: `Great exercise habit! ${exerciseDays}/7 days active`,
            icon: '💪',
            severity: 'positive'
        });
    } else if (exerciseDays <= 1 && logs.length >= 5) {
        patterns.push({
            type: 'warning',
            category: 'exercise',
            message: 'Very low physical activity this week',
            icon: '🏃',
            severity: 'medium'
        });
    }

    return patterns;
}

/**
 * Analyze performance by day of week
 */
function analyzeDayOfWeek(logs) {
    const dayStats = {
        'Sunday': { total: 0, capacitySum: 0, count: 0 },
        'Monday': { total: 0, capacitySum: 0, count: 0 },
        'Tuesday': { total: 0, capacitySum: 0, count: 0 },
        'Wednesday': { total: 0, capacitySum: 0, count: 0 },
        'Thursday': { total: 0, capacitySum: 0, count: 0 },
        'Friday': { total: 0, capacitySum: 0, count: 0 },
        'Saturday': { total: 0, capacitySum: 0, count: 0 }
    };

    logs.forEach(log => {
        const dayName = new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' });
        if (dayStats[dayName]) {
            dayStats[dayName].total++;
            if (log.aiResponse?.metrics?.capacity) {
                dayStats[dayName].capacitySum += log.aiResponse.metrics.capacity;
                dayStats[dayName].count++;
            }
        }
    });

    // Calculate averages and find patterns
    const analysis = [];
    let lowestDay = null;
    let lowestAvg = 100;
    let highestDay = null;
    let highestAvg = 0;

    Object.keys(dayStats).forEach(day => {
        const stats = dayStats[day];
        if (stats.count > 0) {
            const avg = Math.round(stats.capacitySum / stats.count);
            if (avg < lowestAvg) {
                lowestAvg = avg;
                lowestDay = day;
            }
            if (avg > highestAvg) {
                highestAvg = avg;
                highestDay = day;
            }
        }
    });

    if (lowestDay && lowestAvg < 60) {
        analysis.push({
            type: 'insight',
            message: `${lowestDay}s tend to be your weakest day (avg ${lowestAvg}% capacity)`,
            suggestion: `Consider preparing extra for ${lowestDay}s`
        });
    }

    if (highestDay && highestAvg > 70) {
        analysis.push({
            type: 'insight',
            message: `${highestDay}s are typically your best (avg ${highestAvg}% capacity)`,
            suggestion: 'Schedule important tasks on this day'
        });
    }

    return {
        byDay: dayStats,
        insights: analysis,
        weakestDay: lowestDay,
        strongestDay: highestDay
    };
}

/**
 * Find correlations between behaviors and outcomes
 */
function findCorrelations(logs) {
    const correlations = [];

    // Group logs by exercised vs not
    const exercisedDays = logs.filter(l => l.health?.exercise === 'DONE');
    const noExerciseDays = logs.filter(l => l.health?.exercise === 'PENDING');

    if (exercisedDays.length >= 2 && noExerciseDays.length >= 2) {
        const avgWithExercise = calculateAvgCapacity(exercisedDays);
        const avgWithoutExercise = calculateAvgCapacity(noExerciseDays);
        const difference = avgWithExercise - avgWithoutExercise;

        if (Math.abs(difference) >= 5) {
            correlations.push({
                factor: 'exercise',
                impact: difference > 0 ? 'positive' : 'negative',
                difference: Math.abs(difference),
                message: difference > 0
                    ? `Days with exercise show ${difference}% higher capacity`
                    : `Exercise days show ${Math.abs(difference)}% lower capacity (possible overexertion)`
            });
        }
    }

    // Sleep correlation
    const goodSleepDays = logs.filter(l => l.health?.sleep === 'OK');
    const badSleepDays = logs.filter(l => l.health?.sleep === 'LOW');

    if (goodSleepDays.length >= 2 && badSleepDays.length >= 2) {
        const avgGoodSleep = calculateAvgCapacity(goodSleepDays);
        const avgBadSleep = calculateAvgCapacity(badSleepDays);
        const difference = avgGoodSleep - avgBadSleep;

        if (difference >= 10) {
            correlations.push({
                factor: 'sleep',
                impact: 'positive',
                difference: difference,
                message: `Good sleep = ${difference}% higher capacity`
            });
        }
    }

    // Stress correlation
    const lowStressDays = logs.filter(l => l.health?.mentalLoad !== 'HIGH');
    const highStressDays = logs.filter(l => l.health?.mentalLoad === 'HIGH');

    if (lowStressDays.length >= 2 && highStressDays.length >= 2) {
        const avgLowStress = calculateAvgCapacity(lowStressDays);
        const avgHighStress = calculateAvgCapacity(highStressDays);
        const difference = avgLowStress - avgHighStress;

        if (difference >= 10) {
            correlations.push({
                factor: 'stress',
                impact: 'negative',
                difference: difference,
                message: `High stress days have ${difference}% lower capacity`
            });
        }
    }

    return correlations;
}

/**
 * Calculate average capacity from logs
 */
function calculateAvgCapacity(logs) {
    let sum = 0;
    let count = 0;
    logs.forEach(log => {
        if (log.aiResponse?.metrics?.capacity) {
            sum += log.aiResponse.metrics.capacity;
            count++;
        }
    });
    return count > 0 ? Math.round(sum / count) : 0;
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(logs) {
    const recommendations = [];
    const overview = calculateOverview(logs);

    if (overview.sleepQualityRate < 50) {
        recommendations.push({
            priority: 'high',
            category: 'sleep',
            action: 'Establish a consistent bedtime routine',
            reason: `Only ${overview.sleepQualityRate}% of days had good sleep`
        });
    }

    if (overview.hydrationRate < 60) {
        recommendations.push({
            priority: 'medium',
            category: 'hydration',
            action: 'Set hourly water reminders',
            reason: `Hydration was low ${100 - overview.hydrationRate}% of the week`
        });
    }

    if (overview.exerciseRate < 40 && logs.length >= 5) {
        recommendations.push({
            priority: 'medium',
            category: 'exercise',
            action: 'Start with 10-minute daily walks',
            reason: `Only ${overview.exerciseRate}% exercise rate this week`
        });
    }

    if (overview.stressRate > 50) {
        recommendations.push({
            priority: 'high',
            category: 'mental',
            action: 'Add 5-minute daily meditation',
            reason: `High stress on ${overview.stressRate}% of days`
        });
    }

    return recommendations;
}

/**
 * Get monthly trends
 */
async function getMonthlyTrends(userId) {
    try {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);

        const logs = await HealthLog.find({
            userId,
            date: { $gte: monthAgo }
        }).sort({ date: 1 });

        if (logs.length < 7) {
            return { hasEnoughData: false };
        }

        // Calculate weekly averages for trend
        const weeks = [];
        for (let i = 0; i < 4; i++) {
            const weekStart = i * 7;
            const weekLogs = logs.slice(weekStart, weekStart + 7);
            if (weekLogs.length > 0) {
                weeks.push({
                    week: i + 1,
                    avgCapacity: calculateAvgCapacity(weekLogs),
                    daysLogged: weekLogs.length
                });
            }
        }

        // Calculate trend direction
        let trend = 'stable';
        if (weeks.length >= 2) {
            const firstWeek = weeks[0].avgCapacity;
            const lastWeek = weeks[weeks.length - 1].avgCapacity;
            const diff = lastWeek - firstWeek;
            if (diff > 10) trend = 'improving';
            else if (diff < -10) trend = 'declining';
        }

        return {
            hasEnoughData: true,
            weeks,
            trend,
            totalDays: logs.length
        };
    } catch (error) {
        console.error('Monthly trends error:', error);
        return { hasEnoughData: false, error: error.message };
    }
}

/**
 * Generate AI-powered recommendations using Gemini
 */
async function generateAIRecommendations(overview, patterns, correlations, memoryInsights) {
    if (!geminiModel) return null;

    const prompt = `You are a wellness coach AI. Based on the following weekly health data, provide 2-4 specific, actionable recommendations.

WEEKLY DATA:
- Average Capacity: ${overview.avgCapacity || 'N/A'}%
- Sleep Quality Rate: ${overview.sleepQualityRate}%
- Hydration Rate: ${overview.hydrationRate}%
- Exercise Rate: ${overview.exerciseRate}%
- High Stress Rate: ${overview.stressRate}%
- Total Check-ins: ${overview.totalCheckIns}

DETECTED PATTERNS:
${patterns.map(p => `- ${p.category}: ${p.message} (${p.severity})`).join('\n') || 'No significant patterns'}

CORRELATIONS FOUND:
${correlations.map(c => `- ${c.factor}: ${c.message}`).join('\n') || 'No significant correlations'}

${memoryInsights?.callback?.message ? `HISTORICAL CONTEXT: ${memoryInsights.callback.message}` : ''}

Respond ONLY with a JSON array of recommendations. Each recommendation must have:
- priority: "high" | "medium" | "low"
- category: "sleep" | "hydration" | "exercise" | "mental" | "nutrition" | "general"
- action: A specific actionable task (max 15 words)
- reason: Why this matters based on their data (1 sentence)

Example format:
[{"priority":"high","category":"sleep","action":"Set a bedtime alarm for 10:30 PM","reason":"Only 40% good sleep days this week is impacting your capacity."}]`;

    try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        // Parse JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const recommendations = JSON.parse(jsonMatch[0]);
            console.log('AI generated', recommendations.length, 'recommendations');
            return recommendations;
        }
        return null;
    } catch (error) {
        console.error('Gemini recommendations error:', error.message);
        return null;
    }
}

module.exports = {
    generateWeeklySummary,
    getMonthlyTrends,
    calculateOverview,
    findCorrelations,
    detectPatterns,
    invalidateCache
};
