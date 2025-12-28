/**
 * backend/src/services/baselineService.js
 * Personal Baseline Learning - What's normal for THIS user
 */
const User = require('../models/User');
const HealthLog = require('../models/HealthLog');

/**
 * Calculate personal baseline from user's health history
 * Should be called periodically (e.g., weekly or after each check-in if old)
 */
async function calculateBaseline(userId) {
    try {
        // Get last 30 days of health logs
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await HealthLog.find({
            userId,
            date: { $gte: thirtyDaysAgo }
        }).sort({ date: -1 });

        if (logs.length < 7) {
            console.log(`Baseline: Not enough data for user ${userId} (${logs.length} days)`);
            return null; // Need at least 7 days of data
        }

        // Calculate averages
        let sleepOkCount = 0;
        let waterOkCount = 0;
        let exerciseDoneCount = 0;
        let highStressCount = 0;
        let totalCapacity = 0;
        let capacityCount = 0;

        logs.forEach(log => {
            if (log.health) {
                if (log.health.sleep === 'OK') sleepOkCount++;
                if (log.health.water === 'OK') waterOkCount++;
                if (log.health.exercise === 'DONE') exerciseDoneCount++;
                if (log.health.mentalLoad === 'HIGH') highStressCount++;
            }
            if (log.aiResponse?.metrics?.capacity) {
                totalCapacity += log.aiResponse.metrics.capacity;
                capacityCount++;
            }
        });

        const total = logs.length;
        const avgCapacity = capacityCount > 0 ? Math.round(totalCapacity / capacityCount) : 70;

        // Calculate personal thresholds
        // Low capacity threshold = 80% of user's personal average
        const lowCapacityThreshold = Math.max(30, Math.round(avgCapacity * 0.8));

        const baseline = {
            avgCapacity,
            avgSleepQuality: parseFloat((sleepOkCount / total).toFixed(2)),
            avgHydration: parseFloat((waterOkCount / total).toFixed(2)),
            avgExercise: parseFloat((exerciseDoneCount / total).toFixed(2)),
            avgStress: parseFloat((highStressCount / total).toFixed(2)),
            lowCapacityThreshold,
            lastCalculated: new Date(),
            dataPoints: total
        };

        // Update user's baseline
        await User.findByIdAndUpdate(userId, { baseline });

        console.log(`Baseline: Calculated for user ${userId}:`, baseline);
        return baseline;

    } catch (error) {
        console.error('Baseline calculation error:', error);
        return null;
    }
}

/**
 * Get user's baseline (calculate if stale or missing)
 */
async function getBaseline(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        const baseline = user.baseline || {};
        const lastCalculated = baseline.lastCalculated ? new Date(baseline.lastCalculated) : null;
        const now = new Date();

        // Recalculate if never calculated or older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (!lastCalculated || lastCalculated < sevenDaysAgo) {
            console.log(`Baseline: Recalculating for user ${userId} (stale or missing)`);
            return await calculateBaseline(userId);
        }

        return baseline;
    } catch (error) {
        console.error('Get baseline error:', error);
        return null;
    }
}

/**
 * Compare current state to user's personal baseline
 * Returns personalized insights
 */
async function compareToBaseline(userId, currentCapacity, currentHealth) {
    const baseline = await getBaseline(userId);

    if (!baseline || baseline.dataPoints < 7) {
        return {
            hasBaseline: false,
            message: "Building your personal baseline... Keep checking in daily!",
            insights: []
        };
    }

    const insights = [];
    const capacityDiff = currentCapacity - baseline.avgCapacity;

    // Capacity comparison
    if (capacityDiff > 15) {
        insights.push({
            type: 'positive',
            message: `Your capacity (${currentCapacity}%) is ${capacityDiff}% above your usual average!`,
            icon: '🚀'
        });
    } else if (currentCapacity < baseline.lowCapacityThreshold) {
        insights.push({
            type: 'warning',
            message: `Your capacity (${currentCapacity}%) is below your personal threshold of ${baseline.lowCapacityThreshold}%.`,
            icon: '⚠️'
        });
    }

    // Sleep comparison
    if (currentHealth.sleep === 'LOW' && baseline.avgSleepQuality > 0.7) {
        insights.push({
            type: 'concern',
            message: `You usually have good sleep (${Math.round(baseline.avgSleepQuality * 100)}% OK days). Today's low sleep is unusual.`,
            icon: '😴'
        });
    }

    // Stress comparison
    if (currentHealth.mentalLoad === 'HIGH' && baseline.avgStress < 0.3) {
        insights.push({
            type: 'concern',
            message: `High stress is unusual for you (only ${Math.round(baseline.avgStress * 100)}% of days typically).`,
            icon: '🧠'
        });
    }

    // Exercise pattern
    if (currentHealth.exercise === 'PENDING' && baseline.avgExercise > 0.6) {
        insights.push({
            type: 'reminder',
            message: `You exercise most days (${Math.round(baseline.avgExercise * 100)}%). Missing today might affect your pattern.`,
            icon: '🏃'
        });
    }

    return {
        hasBaseline: true,
        baseline,
        capacityVsAverage: capacityDiff,
        isAboveAverage: capacityDiff > 0,
        isBelowThreshold: currentCapacity < baseline.lowCapacityThreshold,
        insights,
        message: insights.length > 0
            ? insights[0].message
            : `Your capacity is ${Math.abs(capacityDiff)}% ${capacityDiff >= 0 ? 'above' : 'below'} your usual ${baseline.avgCapacity}%.`
    };
}

/**
 * Get user's goals
 */
async function getUserGoals(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        return user.goals || {
            targetSleepHours: 7,
            targetWaterLiters: 2,
            targetExerciseDays: 3,
            customGoals: []
        };
    } catch (error) {
        console.error('Get goals error:', error);
        return null;
    }
}

/**
 * Update user's goals
 */
async function updateUserGoals(userId, goals) {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { goals },
            { new: true }
        );
        return user?.goals;
    } catch (error) {
        console.error('Update goals error:', error);
        return null;
    }
}

module.exports = {
    calculateBaseline,
    getBaseline,
    compareToBaseline,
    getUserGoals,
    updateUserGoals
};
