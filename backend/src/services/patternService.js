/**
 * backend/src/services/patternService.js
 * Deep Pattern Detection for AI Context Enhancement
 * Analyzes historical health data to find actionable patterns
 */
const HealthLog = require('../models/HealthLog');

/**
 * Detect all patterns for a user
 * Returns comprehensive pattern analysis for AI context
 */
async function detectUserPatterns(userId, currentHealth = {}) {
    try {
        // Fetch last 30 days of logs
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await HealthLog.find({
            userId,
            date: { $gte: thirtyDaysAgo }
        }).sort({ date: -1 });

        if (logs.length < 5) {
            return {
                hasEnoughData: false,
                message: 'Need at least 5 days of data for pattern detection',
                daysLogged: logs.length
            };
        }

        // Run all pattern detectors
        const patterns = {
            hasEnoughData: true,
            daysAnalyzed: logs.length,
            dayOfWeek: detectDayOfWeekPattern(logs),
            sleepImpact: detectSleepImpact(logs),
            stressCorrelation: detectStressCorrelation(logs),
            exerciseImpact: detectExerciseImpact(logs),
            recoveryTime: detectRecoveryTime(logs),
            recurringIssues: detectRecurringIssues(logs, currentHealth),
            weeklyTrend: detectWeeklyTrend(logs),
            currentStreak: detectCurrentStreak(logs)
        };

        // Generate AI-ready summary
        patterns.aiSummary = generateAISummary(patterns);

        return patterns;
    } catch (error) {
        console.error('Pattern detection error:', error);
        return { hasEnoughData: false, error: error.message };
    }
}

/**
 * Detect day-of-week patterns
 * "Mondays are typically your weakest day"
 */
function detectDayOfWeekPattern(logs) {
    const dayStats = {
        Sunday: { capacities: [], count: 0 },
        Monday: { capacities: [], count: 0 },
        Tuesday: { capacities: [], count: 0 },
        Wednesday: { capacities: [], count: 0 },
        Thursday: { capacities: [], count: 0 },
        Friday: { capacities: [], count: 0 },
        Saturday: { capacities: [], count: 0 }
    };

    logs.forEach(log => {
        const dayName = new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' });
        if (dayStats[dayName] && log.aiResponse?.metrics?.capacity) {
            dayStats[dayName].capacities.push(log.aiResponse.metrics.capacity);
            dayStats[dayName].count++;
        }
    });

    // Calculate averages and find extremes
    let weakestDay = null, strongestDay = null;
    let lowestAvg = 100, highestAvg = 0;

    Object.entries(dayStats).forEach(([day, stats]) => {
        if (stats.capacities.length >= 2) {
            const avg = Math.round(stats.capacities.reduce((a, b) => a + b, 0) / stats.capacities.length);
            stats.average = avg;

            if (avg < lowestAvg) {
                lowestAvg = avg;
                weakestDay = { day, average: avg, samples: stats.count };
            }
            if (avg > highestAvg) {
                highestAvg = avg;
                strongestDay = { day, average: avg, samples: stats.count };
            }
        }
    });

    return {
        weakestDay,
        strongestDay,
        difference: strongestDay && weakestDay ? highestAvg - lowestAvg : 0,
        message: weakestDay && lowestAvg < 60
            ? `${weakestDay.day}s are typically your weakest day (avg ${lowestAvg}% capacity)`
            : null
    };
}

/**
 * Detect sleep impact on next day
 * "After poor sleep, your capacity drops 25%"
 */
function detectSleepImpact(logs) {
    const afterGoodSleep = [];
    const afterBadSleep = [];

    for (let i = 0; i < logs.length - 1; i++) {
        const today = logs[i];
        const yesterday = logs[i + 1];

        if (today.aiResponse?.metrics?.capacity) {
            if (yesterday.health?.sleep === 'OK') {
                afterGoodSleep.push(today.aiResponse.metrics.capacity);
            } else if (yesterday.health?.sleep === 'LOW') {
                afterBadSleep.push(today.aiResponse.metrics.capacity);
            }
        }
    }

    if (afterGoodSleep.length >= 2 && afterBadSleep.length >= 2) {
        const avgGood = Math.round(afterGoodSleep.reduce((a, b) => a + b, 0) / afterGoodSleep.length);
        const avgBad = Math.round(afterBadSleep.reduce((a, b) => a + b, 0) / afterBadSleep.length);
        const impact = avgGood - avgBad;

        return {
            afterGoodSleep: avgGood,
            afterBadSleep: avgBad,
            impact,
            message: impact > 10
                ? `After poor sleep, your capacity drops ${impact}% the next day`
                : null
        };
    }

    return { message: null };
}

/**
 * Detect stress correlation with other factors
 */
function detectStressCorrelation(logs) {
    const withHighStress = [];
    const withLowStress = [];

    logs.forEach(log => {
        if (log.aiResponse?.metrics?.capacity) {
            if (log.health?.mentalLoad === 'HIGH') {
                withHighStress.push(log.aiResponse.metrics.capacity);
            } else if (log.health?.mentalLoad === 'LOW') {
                withLowStress.push(log.aiResponse.metrics.capacity);
            }
        }
    });

    if (withHighStress.length >= 2 && withLowStress.length >= 2) {
        const avgHigh = Math.round(withHighStress.reduce((a, b) => a + b, 0) / withHighStress.length);
        const avgLow = Math.round(withLowStress.reduce((a, b) => a + b, 0) / withLowStress.length);
        const impact = avgLow - avgHigh;

        return {
            withHighStress: avgHigh,
            withLowStress: avgLow,
            impact,
            message: impact > 15
                ? `High stress days show ${impact}% lower capacity than calm days`
                : null
        };
    }

    return { message: null };
}

/**
 * Detect exercise impact on capacity
 */
function detectExerciseImpact(logs) {
    const withExercise = [];
    const withoutExercise = [];

    logs.forEach(log => {
        if (log.aiResponse?.metrics?.capacity) {
            if (log.health?.exercise === 'DONE') {
                withExercise.push(log.aiResponse.metrics.capacity);
            } else if (log.health?.exercise === 'PENDING') {
                withoutExercise.push(log.aiResponse.metrics.capacity);
            }
        }
    });

    if (withExercise.length >= 2 && withoutExercise.length >= 2) {
        const avgWith = Math.round(withExercise.reduce((a, b) => a + b, 0) / withExercise.length);
        const avgWithout = Math.round(withoutExercise.reduce((a, b) => a + b, 0) / withoutExercise.length);
        const impact = avgWith - avgWithout;

        return {
            withExercise: avgWith,
            withoutExercise: avgWithout,
            impact,
            message: impact > 5
                ? `Days with exercise show ${impact}% higher capacity`
                : impact < -5
                    ? `Possible overtraining: exercise days show ${Math.abs(impact)}% lower capacity`
                    : null
        };
    }

    return { message: null };
}

/**
 * Detect recovery time after low capacity days
 */
function detectRecoveryTime(logs) {
    const recoveryTimes = [];

    for (let i = logs.length - 1; i >= 0; i--) {
        const capacity = logs[i].aiResponse?.metrics?.capacity || 70;

        // Found a low day
        if (capacity < 40) {
            // Count days until capacity > 60
            let recoveryDays = 0;
            for (let j = i - 1; j >= 0 && recoveryDays < 7; j--) {
                recoveryDays++;
                const nextCapacity = logs[j].aiResponse?.metrics?.capacity || 70;
                if (nextCapacity >= 60) {
                    recoveryTimes.push(recoveryDays);
                    break;
                }
            }
        }
    }

    if (recoveryTimes.length >= 2) {
        const avgRecovery = Math.round(recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length * 10) / 10;
        return {
            avgDays: avgRecovery,
            samples: recoveryTimes.length,
            message: `You typically need ${avgRecovery} days to recover from low capacity periods`
        };
    }

    return { message: null };
}

/**
 * Detect recurring issues in recent days
 */
function detectRecurringIssues(logs, currentHealth) {
    const last7 = logs.slice(0, 7);
    const issues = [];

    // Count issues
    const lowSleepCount = last7.filter(l => l.health?.sleep === 'LOW').length;
    const lowWaterCount = last7.filter(l => l.health?.water === 'LOW').length;
    const highStressCount = last7.filter(l => l.health?.mentalLoad === 'HIGH').length;
    const noExerciseCount = last7.filter(l => l.health?.exercise === 'PENDING').length;

    if (lowSleepCount >= 3) {
        issues.push({
            type: 'sleep',
            count: lowSleepCount,
            message: `${lowSleepCount} days of poor sleep this week`
        });
    }

    if (lowWaterCount >= 3) {
        issues.push({
            type: 'hydration',
            count: lowWaterCount,
            message: `${lowWaterCount} days of low hydration this week`
        });
    }

    if (highStressCount >= 3) {
        issues.push({
            type: 'stress',
            count: highStressCount,
            message: `${highStressCount} high-stress days this week`
        });
    }

    if (noExerciseCount >= 5) {
        issues.push({
            type: 'exercise',
            count: noExerciseCount,
            message: `Only ${7 - noExerciseCount} exercise days this week`
        });
    }

    // Current issue streak
    if (currentHealth.water === 'LOW' && lowWaterCount >= 2) {
        issues.push({
            type: 'streak',
            message: `This is your ${lowWaterCount + 1}th consecutive low-water day`
        });
    }

    return {
        hasIssues: issues.length > 0,
        issues,
        mostCritical: issues[0] || null
    };
}

/**
 * Detect weekly capacity trend
 */
function detectWeeklyTrend(logs) {
    const last7 = logs.slice(0, 7);
    const prev7 = logs.slice(7, 14);

    if (last7.length < 3 || prev7.length < 3) {
        return { trend: 'unknown', message: null };
    }

    const avgThis = Math.round(
        last7.filter(l => l.aiResponse?.metrics?.capacity)
            .reduce((sum, l) => sum + l.aiResponse.metrics.capacity, 0) /
        last7.filter(l => l.aiResponse?.metrics?.capacity).length
    );

    const avgPrev = Math.round(
        prev7.filter(l => l.aiResponse?.metrics?.capacity)
            .reduce((sum, l) => sum + l.aiResponse.metrics.capacity, 0) /
        prev7.filter(l => l.aiResponse?.metrics?.capacity).length
    );

    const change = avgThis - avgPrev;

    let trend = 'stable';
    if (change > 10) trend = 'improving';
    else if (change < -10) trend = 'declining';

    return {
        trend,
        thisWeekAvg: avgThis,
        lastWeekAvg: avgPrev,
        change,
        message: trend !== 'stable'
            ? `Your capacity is ${trend} (${change > 0 ? '+' : ''}${change}% from last week)`
            : null
    };
}

/**
 * Detect current positive/negative streaks
 */
function detectCurrentStreak(logs) {
    if (logs.length === 0) return { message: null };

    // Check for good day streak
    let goodStreak = 0;
    for (const log of logs) {
        const capacity = log.aiResponse?.metrics?.capacity || 0;
        if (capacity >= 70) goodStreak++;
        else break;
    }

    // Check for bad day streak
    let badStreak = 0;
    for (const log of logs) {
        const capacity = log.aiResponse?.metrics?.capacity || 100;
        if (capacity < 50) badStreak++;
        else break;
    }

    if (goodStreak >= 3) {
        return {
            type: 'positive',
            days: goodStreak,
            message: `You're on a ${goodStreak}-day high performance streak! Keep it up.`
        };
    }

    if (badStreak >= 2) {
        return {
            type: 'negative',
            days: badStreak,
            message: `${badStreak} consecutive challenging days. Recovery recommended.`
        };
    }

    return { message: null };
}

/**
 * Generate AI-ready summary of all patterns
 */
function generateAISummary(patterns) {
    const lines = [];

    // Day of week
    if (patterns.dayOfWeek?.message) {
        lines.push(patterns.dayOfWeek.message);
    }

    // Sleep impact
    if (patterns.sleepImpact?.message) {
        lines.push(patterns.sleepImpact.message);
    }

    // Stress correlation
    if (patterns.stressCorrelation?.message) {
        lines.push(patterns.stressCorrelation.message);
    }

    // Exercise impact
    if (patterns.exerciseImpact?.message) {
        lines.push(patterns.exerciseImpact.message);
    }

    // Recovery time
    if (patterns.recoveryTime?.message) {
        lines.push(patterns.recoveryTime.message);
    }

    // Weekly trend
    if (patterns.weeklyTrend?.message) {
        lines.push(patterns.weeklyTrend.message);
    }

    // Current streak
    if (patterns.currentStreak?.message) {
        lines.push(patterns.currentStreak.message);
    }

    // Recurring issues
    if (patterns.recurringIssues?.hasIssues) {
        patterns.recurringIssues.issues.forEach(issue => {
            lines.push(issue.message);
        });
    }

    return lines.length > 0
        ? lines.join('. ') + '.'
        : 'Building your pattern history... Check in daily for personalized insights.';
}

module.exports = {
    detectUserPatterns,
    detectDayOfWeekPattern,
    detectSleepImpact,
    detectStressCorrelation,
    detectExerciseImpact,
    detectRecoveryTime,
    detectRecurringIssues,
    detectWeeklyTrend,
    detectCurrentStreak
};
