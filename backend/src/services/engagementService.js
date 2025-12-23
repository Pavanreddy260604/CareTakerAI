/**
 * backend/src/services/engagementService.js
 * Engagement features: Focus Card, Pattern Alerts, Recovery Score
 */

const HealthLog = require('../models/HealthLog');

/**
 * Detect day-of-week patterns (e.g., "Every Monday low sleep")
 */
function detectDayPatterns(history) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats = {};

    // Initialize
    dayNames.forEach(d => { dayStats[d] = { lowSleep: 0, lowWater: 0, highStress: 0, total: 0 }; });

    history.forEach(log => {
        const day = dayNames[new Date(log.date).getDay()];
        dayStats[day].total++;
        if (log.health?.sleep === 'LOW') dayStats[day].lowSleep++;
        if (log.health?.water === 'LOW') dayStats[day].lowWater++;
        if (log.health?.mentalLoad === 'HIGH') dayStats[day].highStress++;
    });

    // Find patterns (>= 2 occurrences with >= 50% frequency)
    const patterns = [];
    Object.entries(dayStats).forEach(([day, stats]) => {
        if (stats.total >= 2) {
            if (stats.lowSleep / stats.total >= 0.5) {
                patterns.push({ day, type: 'lowSleep', frequency: Math.round((stats.lowSleep / stats.total) * 100) });
            }
            if (stats.highStress / stats.total >= 0.5) {
                patterns.push({ day, type: 'highStress', frequency: Math.round((stats.highStress / stats.total) * 100) });
            }
        }
    });

    return patterns;
}

/**
 * Detect pattern transitions (only alert on NEW patterns, not ongoing)
 */
function detectPatternTransitions(history, previousPatterns = []) {
    const currentPatterns = detectDayPatterns(history);
    const newPatterns = [];

    // Find patterns that weren't in previous set
    currentPatterns.forEach(cp => {
        const wasKnown = previousPatterns.some(pp => pp.day === cp.day && pp.type === cp.type);
        if (!wasKnown) {
            newPatterns.push(cp);
        }
    });

    // Detect chronic issues (3+ consecutive days)
    const recentLogs = history.slice(0, 7);
    let consecutiveLowSleep = 0;
    let consecutiveHighStress = 0;

    for (const log of recentLogs) {
        if (log.health?.sleep === 'LOW') consecutiveLowSleep++;
        else break;
    }

    for (const log of recentLogs) {
        if (log.health?.mentalLoad === 'HIGH') consecutiveHighStress++;
        else break;
    }

    if (consecutiveLowSleep >= 3) {
        newPatterns.push({ type: 'chronicSleep', days: consecutiveLowSleep, severity: 'high' });
    }
    if (consecutiveHighStress >= 3) {
        newPatterns.push({ type: 'chronicStress', days: consecutiveHighStress, severity: 'high' });
    }

    return newPatterns;
}

/**
 * Calculate Recovery Score (0-100)
 * Measures: Speed of recovery + consistency of rebounds
 */
function calculateRecoveryScore(history) {
    if (history.length < 7) {
        return { score: 50, trend: 'unknown', message: 'Need more data' };
    }

    let recoveryEvents = 0;
    let totalRecoveryDays = 0;
    let rebounds = 0;

    for (let i = 1; i < history.length; i++) {
        const today = history[i - 1]; // Newer
        const yesterday = history[i]; // Older (history is newest first)

        const todayBad = today.health?.sleep === 'LOW' || today.health?.mentalLoad === 'HIGH';
        const yesterdayBad = yesterday.health?.sleep === 'LOW' || yesterday.health?.mentalLoad === 'HIGH';

        // Recovery = was bad, now good
        if (yesterdayBad && !todayBad) {
            rebounds++;
        }

        // Still bad = counting recovery time
        if (todayBad && yesterdayBad) {
            totalRecoveryDays++;
        }

        if (yesterdayBad) {
            recoveryEvents++;
        }
    }

    // Score calculation
    // Higher rebounds = better (quicker recovery)
    // Lower totalRecoveryDays = better (less time spent bad)

    const reboundRate = recoveryEvents > 0 ? rebounds / recoveryEvents : 1;
    const avgRecoveryTime = recoveryEvents > 0 ? totalRecoveryDays / recoveryEvents : 0;

    // Score: 100 = perfect rebounds, 0 = never recovers
    let score = Math.round((reboundRate * 70) + ((1 - Math.min(avgRecoveryTime, 3) / 3) * 30));
    score = Math.max(0, Math.min(100, score));

    // Trend (compare first half vs second half of history)
    const mid = Math.floor(history.length / 2);
    const oldScore = calculateRecoveryScoreSimple(history.slice(mid));
    const newScore = calculateRecoveryScoreSimple(history.slice(0, mid));

    const trend = newScore > oldScore + 5 ? 'improving' : newScore < oldScore - 5 ? 'declining' : 'stable';

    return {
        score,
        trend,
        rebounds,
        avgRecoveryTime: Math.round(avgRecoveryTime * 10) / 10,
        message: trend === 'improving'
            ? 'You recover faster than before'
            : trend === 'declining'
                ? 'Recovery taking longer lately'
                : 'Recovery rate is stable'
    };
}

function calculateRecoveryScoreSimple(history) {
    if (history.length < 3) return 50;
    let rebounds = 0, events = 0;
    for (let i = 1; i < history.length; i++) {
        const todayBad = history[i - 1].health?.sleep === 'LOW' || history[i - 1].health?.mentalLoad === 'HIGH';
        const yesterdayBad = history[i].health?.sleep === 'LOW' || history[i].health?.mentalLoad === 'HIGH';
        if (yesterdayBad && !todayBad) rebounds++;
        if (yesterdayBad) events++;
    }
    return events > 0 ? Math.round((rebounds / events) * 100) : 50;
}

/**
 * Generate Today's Focus Card
 * Single, actionable focus for the day
 */
function generateTodaysFocus(todayLog, history, detectedPatterns) {
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const hour = new Date().getHours();

    let focus = {
        title: "Maintain Balance",
        reason: "All systems nominal",
        action: "Continue current habits",
        priority: 'low'
    };

    // Check immediate issues
    if (todayLog?.health?.sleep === 'LOW') {
        focus = {
            title: "Protect Energy",
            reason: "Poor sleep detected",
            action: hour < 14
                ? "Avoid heavy cognitive work. Take breaks every 45 min."
                : "No demanding tasks after 6 PM. Early wind-down.",
            priority: 'high'
        };
    } else if (todayLog?.health?.mentalLoad === 'HIGH') {
        focus = {
            title: "Stress Recovery",
            reason: "High mental load reported",
            action: hour < 12
                ? "Start with easiest task. Build momentum."
                : "Take 10-min break now. Reset before continuing.",
            priority: 'high'
        };
    }

    // Check pattern-based focus
    const dayPattern = detectedPatterns.find(p => p.day === dayName);
    if (dayPattern && focus.priority !== 'high') {
        if (dayPattern.type === 'lowSleep') {
            focus = {
                title: `${dayName} Sleep Alert`,
                reason: `Pattern: ${dayPattern.frequency}% of ${dayName}s have poor sleep`,
                action: "Pre-emptive recovery: Light schedule today",
                priority: 'medium'
            };
        } else if (dayPattern.type === 'highStress') {
            focus = {
                title: `${dayName} Stress Pattern`,
                reason: `Pattern: ${dayPattern.frequency}% of ${dayName}s are high stress`,
                action: "Protect boundaries today. Schedule buffer time.",
                priority: 'medium'
            };
        }
    }

    // Check chronic issues
    const chronic = detectedPatterns.find(p => p.type === 'chronicSleep' || p.type === 'chronicStress');
    if (chronic) {
        focus = {
            title: chronic.type === 'chronicSleep' ? "Sleep Debt Critical" : "Stress Accumulating",
            reason: `${chronic.days} consecutive days of ${chronic.type === 'chronicSleep' ? 'poor sleep' : 'high stress'}`,
            action: "Recovery is non-negotiable today. Cancel non-essential commitments.",
            priority: 'critical'
        };
    }

    return focus;
}

/**
 * Time-Aware Advice (Phase 3)
 * Same day, different advice based on time
 */
function getTimeAwareAdvice(todayLog, history) {
    const hour = new Date().getHours();
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17) timeOfDay = 'evening';

    const hasPoorSleep = todayLog?.health?.sleep === 'LOW';
    const hasHighStress = todayLog?.health?.mentalLoad === 'HIGH';
    const hasLowWater = todayLog?.health?.water === 'LOW';

    const advice = {
        timeOfDay,
        hour,
        message: '',
        icon: ''
    };

    if (timeOfDay === 'morning') {
        advice.icon = '🌅';
        if (hasPoorSleep) {
            advice.message = "Morning with low energy: Start with the easiest task first. Save complex work for after lunch.";
        } else if (hasHighStress) {
            advice.message = "High stress morning: Take 5 minutes to plan. Avoid reactive work. Block focus time.";
        } else {
            advice.message = "Energy is highest now. Tackle your most important task before noon.";
        }
    } else if (timeOfDay === 'afternoon') {
        advice.icon = '☀️';
        if (hasPoorSleep) {
            advice.message = "Low energy afternoon: Consider a 20-min rest. Avoid new commitments. Protect evening for recovery.";
        } else if (hasHighStress) {
            advice.message = "Stress building: Take a 10-min break NOW. Walk, stretch, or step outside.";
        } else if (hasLowWater) {
            advice.message = "Hydration check: Drink water now. Energy dips at 3PM are often dehydration.";
        } else {
            advice.message = "Good momentum. Wrap up key tasks before 5PM. Plan tomorrow briefly.";
        }
    } else {
        advice.icon = '🌙';
        if (hasPoorSleep) {
            advice.message = "Tonight is critical: Dim screens at 9PM. No caffeine. Body needs recovery.";
        } else if (hasHighStress) {
            advice.message = "Evening wind-down: Journal for 5 mins. Tomorrow's problems aren't solvable tonight.";
        } else {
            advice.message = "Good day. Light activity or relaxation now. Maintain the win.";
        }
    }

    return advice;
}

/**
 * What Changed Diff (Phase 3)
 * Compares today vs yesterday to show causality
 */
function generateWhatChangedDiff(todayLog, yesterdayLog) {
    if (!todayLog || !yesterdayLog) {
        return null;
    }

    const changes = [];
    const insights = [];

    // Compare each metric
    const todayHealth = todayLog.health || {};
    const yesterdayHealth = yesterdayLog.health || {};

    // Sleep
    if (todayHealth.sleep !== yesterdayHealth.sleep) {
        changes.push({
            metric: 'Sleep',
            from: yesterdayHealth.sleep || 'N/A',
            to: todayHealth.sleep || 'N/A',
            improved: todayHealth.sleep === 'OK' && yesterdayHealth.sleep === 'LOW'
        });
    }

    // Mental Load
    if (todayHealth.mentalLoad !== yesterdayHealth.mentalLoad) {
        changes.push({
            metric: 'Stress',
            from: yesterdayHealth.mentalLoad || 'N/A',
            to: todayHealth.mentalLoad || 'N/A',
            improved: (todayHealth.mentalLoad === 'LOW' || todayHealth.mentalLoad === 'OK') && yesterdayHealth.mentalLoad === 'HIGH'
        });
    }

    // Water
    if (todayHealth.water !== yesterdayHealth.water) {
        changes.push({
            metric: 'Hydration',
            from: yesterdayHealth.water || 'N/A',
            to: todayHealth.water || 'N/A',
            improved: todayHealth.water === 'OK' && yesterdayHealth.water === 'LOW'
        });
    }

    // Exercise
    if (todayHealth.exercise !== yesterdayHealth.exercise) {
        changes.push({
            metric: 'Exercise',
            from: yesterdayHealth.exercise || 'N/A',
            to: todayHealth.exercise || 'N/A',
            improved: todayHealth.exercise === 'DONE' && yesterdayHealth.exercise === 'PENDING'
        });
    }

    // Generate insights based on changes
    if (changes.length === 0) {
        insights.push("State unchanged from yesterday. Consistency detected.");
    } else {
        const improvements = changes.filter(c => c.improved).length;
        const declines = changes.filter(c => !c.improved).length;

        if (improvements > declines) {
            insights.push("Overall improvement today. Recovery trajectory positive.");
        } else if (declines > improvements) {
            insights.push("Some regression detected. Consider protective actions.");
        }

        // Specific causality insights
        const sleepChange = changes.find(c => c.metric === 'Sleep');
        const stressChange = changes.find(c => c.metric === 'Stress');

        if (sleepChange?.improved && stressChange?.improved) {
            insights.push("Sleep improved AND stress down — likely connected. Protect this pattern.");
        } else if (!sleepChange?.improved && stressChange && !stressChange.improved) {
            insights.push("Poor sleep may be increasing stress. Prioritize rest tonight.");
        } else if (sleepChange?.improved && stressChange && !stressChange.improved) {
            insights.push("Sleep improved but stress up — external factor suspected. Not your fault.");
        }
    }

    return {
        changes,
        insights,
        summary: changes.length === 0
            ? "No changes from yesterday"
            : `${changes.length} metric${changes.length > 1 ? 's' : ''} changed`
    };
}

/**
 * Get comprehensive engagement data for a user
 */
async function getEngagementData(userId) {
    try {
        // Fetch 30-day history for pattern detection
        const history = await HealthLog.find({ userId })
            .sort({ date: -1 })
            .limit(30);

        // Get today's log
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLog = history.find(log => {
            const logDate = new Date(log.date);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
        });

        // Get yesterday's log
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayLog = history.find(log => {
            const logDate = new Date(log.date);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === yesterday.getTime();
        });

        // Detect patterns
        const patterns = detectDayPatterns(history);
        const newPatterns = detectPatternTransitions(history, []);

        // Calculate recovery score
        const recoveryScore = calculateRecoveryScore(history);

        // Generate focus card
        const focus = generateTodaysFocus(todayLog, history, [...patterns, ...newPatterns]);

        // Time-aware advice
        const timeAdvice = getTimeAwareAdvice(todayLog, history);

        // What changed diff
        const whatChanged = generateWhatChangedDiff(todayLog, yesterdayLog);

        return {
            focus,
            patterns: newPatterns,
            allPatterns: patterns,
            recoveryScore,
            timeAdvice,
            whatChanged,
            historyLength: history.length
        };
    } catch (error) {
        console.error('Engagement Error:', error);
        return {
            focus: { title: "Stay Balanced", reason: "System loading", action: "Check back soon", priority: 'low' },
            patterns: [],
            recoveryScore: { score: 50, trend: 'unknown', message: 'Loading...' },
            timeAdvice: null,
            whatChanged: null,
            historyLength: 0
        };
    }
}

module.exports = {
    detectDayPatterns,
    detectPatternTransitions,
    calculateRecoveryScore,
    generateTodaysFocus,
    getTimeAwareAdvice,
    generateWhatChangedDiff,
    getEngagementData
};

