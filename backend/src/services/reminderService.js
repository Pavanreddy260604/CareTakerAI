/**
 * backend/src/services/reminderService.js
 * Smart Check-in Reminders, Achievements & Notification Logic with AI
 */
const User = require('../models/User');
const HealthLog = require('../models/HealthLog');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini for AI messages
let geminiModel = null;
if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

/**
 * Get smart reminder data for a user
 * Determines when and what to remind based on patterns
 */
async function getSmartReminder(userId) {
    try {
        const now = new Date();
        const currentHour = now.getHours();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if user already checked in today
        const todayLog = await HealthLog.findOne({
            userId,
            date: { $gte: today }
        });

        const checkedInToday = !!todayLog;

        // Get user's check-in patterns from last 14 days
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const recentLogs = await HealthLog.find({
            userId,
            date: { $gte: twoWeeksAgo }
        }).sort({ date: -1 });

        // Calculate typical check-in hour
        const checkInHours = recentLogs
            .map(log => new Date(log.date).getHours())
            .filter(h => h > 0);

        const avgCheckInHour = checkInHours.length > 0
            ? Math.round(checkInHours.reduce((a, b) => a + b, 0) / checkInHours.length)
            : 9; // Default to 9 AM

        // Determine reminder type
        let reminderType = 'none';
        let message = '';
        let urgency = 'low';
        let suggestedTime = null;

        if (!checkedInToday) {
            if (currentHour >= avgCheckInHour && currentHour < avgCheckInHour + 2) {
                // Within typical check-in window
                reminderType = 'check_in';
                message = "It's your usual check-in time! How are you feeling today?";
                urgency = 'medium';
            } else if (currentHour >= avgCheckInHour + 2 && currentHour < 20) {
                // Missed typical time
                reminderType = 'missed';
                message = `You usually check in around ${avgCheckInHour}:00. Don't forget today!`;
                urgency = 'high';
            } else if (currentHour >= 20 && currentHour < 23) {
                // Evening reminder
                reminderType = 'evening';
                message = "Quick evening check-in before bed? It helps track your daily patterns.";
                urgency = 'medium';
            } else if (currentHour < avgCheckInHour) {
                // Morning, hasn't checked in yet (expected)
                reminderType = 'morning';
                message = "Good morning! Ready for today's check-in?";
                urgency = 'low';
                suggestedTime = `${avgCheckInHour}:00`;
            }
        } else {
            // Already checked in today
            const lastLog = todayLog;
            const capacity = lastLog?.aiResponse?.metrics?.capacity || 70;

            if (capacity < 40) {
                reminderType = 'recovery_check';
                message = "Your capacity was low earlier. How are you feeling now?";
                urgency = 'medium';
            } else if (currentHour >= 18 && !lastLog?.evening) {
                reminderType = 'evening_update';
                message = "Evening reflection time! How did your day go?";
                urgency = 'low';
            } else {
                reminderType = 'none';
                message = "You're all set! Check back tomorrow.";
            }
        }

        // Calculate streak status
        const streakData = await calculateStreakStatus(userId, recentLogs);

        return {
            reminderType,
            message,
            urgency,
            suggestedTime,
            checkedInToday,
            typicalCheckInHour: avgCheckInHour,
            streak: streakData,
            currentHour
        };

    } catch (error) {
        console.error('Smart reminder error:', error);
        return {
            reminderType: 'error',
            message: 'Unable to get reminder data',
            urgency: 'low'
        };
    }
}

/**
 * Calculate streak status
 */
async function calculateStreakStatus(userId, recentLogs = null) {
    try {
        if (!recentLogs) {
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            recentLogs = await HealthLog.find({
                userId,
                date: { $gte: twoWeeksAgo }
            }).sort({ date: -1 });
        }

        // Calculate current streak
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Create a set of dates that have logs
        const logDates = new Set(
            recentLogs.map(log => {
                const d = new Date(log.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime();
            })
        );

        // Check consecutive days from today
        for (let i = 0; i < 14; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            checkDate.setHours(0, 0, 0, 0);

            if (logDates.has(checkDate.getTime())) {
                tempStreak++;
                if (i === 0 || currentStreak > 0) {
                    currentStreak++;
                }
            } else if (i > 0) {
                // Break in streak (but not for today)
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 0;
                if (i === 1) currentStreak = 0; // Yesterday missed = no current streak
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        // Streak at risk?
        const atRisk = currentStreak > 0 && !logDates.has(today.getTime());

        return {
            current: currentStreak,
            longest: longestStreak,
            atRisk,
            daysLogged: recentLogs.length
        };

    } catch (error) {
        console.error('Streak calculation error:', error);
        return { current: 0, longest: 0, atRisk: false, daysLogged: 0 };
    }
}

/**
 * Get time-of-day context for AI
 */
function getTimeOfDayContext() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday

    let timeContext = {
        period: 'morning',
        greeting: 'Good morning',
        energyExpectation: 'building',
        suggestedFocus: 'planning',
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    };

    if (hour < 6) {
        timeContext = {
            period: 'early_morning',
            greeting: 'Early bird!',
            energyExpectation: 'low',
            suggestedFocus: 'gentle start',
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        };
    } else if (hour < 12) {
        timeContext = {
            period: 'morning',
            greeting: 'Good morning',
            energyExpectation: 'building',
            suggestedFocus: 'deep work',
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        };
    } else if (hour < 14) {
        timeContext = {
            period: 'midday',
            greeting: 'Good afternoon',
            energyExpectation: 'post-lunch dip possible',
            suggestedFocus: 'lighter tasks',
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        };
    } else if (hour < 17) {
        timeContext = {
            period: 'afternoon',
            greeting: 'Good afternoon',
            energyExpectation: 'second wind',
            suggestedFocus: 'meetings or creative work',
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        };
    } else if (hour < 20) {
        timeContext = {
            period: 'evening',
            greeting: 'Good evening',
            energyExpectation: 'winding down',
            suggestedFocus: 'relaxation',
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        };
    } else {
        timeContext = {
            period: 'night',
            greeting: 'Winding down?',
            energyExpectation: 'low',
            suggestedFocus: 'rest preparation',
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        };
    }

    return timeContext;
}

/**
 * Get achievement badges for user
 */
async function getUserAchievements(userId) {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await HealthLog.find({
            userId,
            date: { $gte: thirtyDaysAgo }
        });

        const achievements = [];

        // Streak achievements
        const streakData = await calculateStreakStatus(userId, logs);
        if (streakData.current >= 7) {
            achievements.push({
                id: 'streak_week',
                name: 'Week Warrior',
                description: '7-day check-in streak',
                icon: '🔥',
                earned: true
            });
        }
        if (streakData.current >= 14) {
            achievements.push({
                id: 'streak_2week',
                name: 'Consistency King',
                description: '14-day check-in streak',
                icon: '👑',
                earned: true
            });
        }
        if (streakData.current >= 30) {
            achievements.push({
                id: 'streak_month',
                name: 'Monthly Master',
                description: '30-day check-in streak',
                icon: '🏆',
                earned: true
            });
        }

        // Exercise achievements
        const exerciseDays = logs.filter(l => l.health?.exercise === 'DONE').length;
        if (exerciseDays >= 10) {
            achievements.push({
                id: 'exercise_10',
                name: 'Active Lifestyle',
                description: '10+ exercise days this month',
                icon: '💪',
                earned: true
            });
        }

        // Sleep achievements
        const goodSleepDays = logs.filter(l => l.health?.sleep === 'OK').length;
        if (goodSleepDays >= 20) {
            achievements.push({
                id: 'sleep_master',
                name: 'Sleep Master',
                description: '20+ good sleep days this month',
                icon: '😴',
                earned: true
            });
        }

        // Hydration achievements
        const goodHydrationDays = logs.filter(l => l.health?.water === 'OK').length;
        if (goodHydrationDays >= 20) {
            achievements.push({
                id: 'hydration_hero',
                name: 'Hydration Hero',
                description: '20+ good hydration days',
                icon: '💧',
                earned: true
            });
        }

        // Capacity achievements
        const highCapacityDays = logs.filter(l =>
            l.aiResponse?.metrics?.capacity >= 80
        ).length;
        if (highCapacityDays >= 5) {
            achievements.push({
                id: 'peak_performer',
                name: 'Peak Performer',
                description: '5+ days at 80%+ capacity',
                icon: '🚀',
                earned: true
            });
        }

        // Recovery wins
        const recoveryWins = logs.filter(l =>
            l.aiResponse?.metrics?.systemMode === 'LOCKED_RECOVERY'
        ).length;
        if (recoveryWins >= 3) {
            achievements.push({
                id: 'recovery_respect',
                name: 'Recovery Respect',
                description: 'Entered recovery mode when needed',
                icon: '🛡️',
                earned: true
            });
        }

        // Generate AI motivational message if user has achievements
        let aiMotivation = null;
        if (geminiModel && achievements.length > 0) {
            try {
                aiMotivation = await generateAIMotivation(achievements, streakData);
            } catch (e) {
                console.error('AI motivation error (non-fatal):', e.message);
            }
        }

        return {
            badges: achievements,
            aiMotivation: aiMotivation,
            stats: {
                totalLogged: logs.length,
                streak: streakData.current,
                exerciseDays,
                goodSleepDays,
                goodHydrationDays,
                highCapacityDays
            }
        };

    } catch (error) {
        console.error('Achievements error:', error);
        return { badges: [], aiMotivation: null, stats: {} };
    }
}

/**
 * Generate AI motivational message for achievements
 */
async function generateAIMotivation(achievements, streakData) {
    if (!geminiModel) return null;

    const prompt = `You are a supportive wellness coach. Generate a short, personalized motivational message (2-3 sentences max) for a user who has earned these achievements:

EARNED BADGES: ${achievements.map(a => a.name).join(', ')}
CURRENT STREAK: ${streakData.current} days
LONGEST STREAK: ${streakData.longest} days

Be warm, encouraging, and specific to their achievements. Don't be generic. Respond with just the message, no quotes or extra formatting.`;

    try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error('Gemini motivation error:', error.message);
        return null;
    }
}

/**
 * Generate AI-suggested goals based on user's patterns
 */
async function generateAIGoalSuggestions(userId) {
    if (!geminiModel) return null;

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await HealthLog.find({
            userId,
            date: { $gte: thirtyDaysAgo }
        });

        if (logs.length < 7) {
            return { hasEnoughData: false, message: 'Need at least 7 days of data for AI goal suggestions' };
        }

        // Calculate current averages
        const sleepOkDays = logs.filter(l => l.health?.sleep === 'OK').length;
        const waterOkDays = logs.filter(l => l.health?.water === 'OK').length;
        const exerciseDays = logs.filter(l => l.health?.exercise === 'DONE').length;
        const totalDays = logs.length;

        const sleepRate = Math.round((sleepOkDays / totalDays) * 100);
        const waterRate = Math.round((waterOkDays / totalDays) * 100);
        const exerciseRate = Math.round((exerciseDays / totalDays) * 100);

        const prompt = `You are a wellness coach AI. Based on this user's 30-day data, suggest optimal personalized health goals.

CURRENT PERFORMANCE (last ${totalDays} days):
- Good sleep days: ${sleepOkDays}/${totalDays} (${sleepRate}%)
- Good hydration days: ${waterOkDays}/${totalDays} (${waterRate}%)
- Exercise days: ${exerciseDays}/${totalDays} (${exerciseRate}%)

Suggest realistic, achievable goals that are slightly challenging but not overwhelming.

Respond ONLY with a JSON object:
{
  "targetSleepHours": number (7-9),
  "targetWaterLiters": number (1.5-3.5),
  "targetExerciseDays": number (2-6 per week),
  "explanation": "Brief explanation of why these targets (1-2 sentences)"
}`;

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const suggestions = JSON.parse(jsonMatch[0]);
            return {
                hasEnoughData: true,
                suggestions: suggestions,
                currentStats: { sleepRate, waterRate, exerciseRate, totalDays }
            };
        }
        return null;
    } catch (error) {
        console.error('AI goal suggestions error:', error.message);
        return null;
    }
}

/**
 * Generate AI trend analysis summary
 */
async function generateAITrendAnalysis(userId) {
    if (!geminiModel) return null;

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await HealthLog.find({
            userId,
            date: { $gte: thirtyDaysAgo }
        }).sort({ date: 1 });

        if (logs.length < 7) {
            return { hasEnoughData: false };
        }

        // Split into weeks
        const weeks = [];
        for (let i = 0; i < 4; i++) {
            const weekLogs = logs.slice(i * 7, (i + 1) * 7);
            if (weekLogs.length > 0) {
                const avgCapacity = weekLogs.reduce((sum, l) =>
                    sum + (l.aiResponse?.metrics?.capacity || 0), 0) / weekLogs.length;
                weeks.push({ week: i + 1, avgCapacity: Math.round(avgCapacity), days: weekLogs.length });
            }
        }

        const prompt = `You are a wellness analyst AI. Analyze this user's 30-day capacity trend and provide insights.

WEEKLY CAPACITY DATA:
${weeks.map(w => `Week ${w.week}: ${w.avgCapacity}% avg (${w.days} days logged)`).join('\n')}

Provide a brief, insightful analysis (3-4 sentences max) that:
1. Identifies the overall trend (improving, stable, declining)
2. Points out any notable patterns
3. Gives one actionable suggestion

Respond with just the analysis text, no formatting.`;

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;

        // Determine trend
        let trend = 'stable';
        if (weeks.length >= 2) {
            const diff = weeks[weeks.length - 1].avgCapacity - weeks[0].avgCapacity;
            if (diff > 10) trend = 'improving';
            else if (diff < -10) trend = 'declining';
        }

        return {
            hasEnoughData: true,
            weeks: weeks,
            trend: trend,
            aiAnalysis: response.text().trim()
        };
    } catch (error) {
        console.error('AI trend analysis error:', error.message);
        return null;
    }
}

module.exports = {
    getSmartReminder,
    calculateStreakStatus,
    getTimeOfDayContext,
    getUserAchievements,
    generateAIGoalSuggestions,
    generateAITrendAnalysis
};
