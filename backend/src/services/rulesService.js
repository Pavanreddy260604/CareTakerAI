/**
 * backend/rules.js
 * strict, deterministic logic for Caretaker AI
 */

const thresholds = {
    water: { critical: 'LOW', ok: 'OK' },
    food: { critical: 'LOW', ok: 'OK' },
    sleep: { critical: 'LOW', ok: 'OK' },
    mentalLoad: { critical: 'HIGH', ok: 'OK' } // High load triggers recovery
};

// Priority Order: Hydration > Food > Sleep > Exercise
const priorityOrder = ['water', 'food', 'sleep', 'exercise'];

/**
 * Evaluates recovery state.
 * @param {Object} health - Health signals
 * @param {boolean} recoveryState - Current recovery state
 * @param {Array} history - Past health logs (newest first)
 * @returns {boolean} - True if recovery is required
 */
function isRecoveryRequired(health, recoveryState, history = []) {
    if (recoveryState) return true; // Already in recovery

    // Immediate Trigger: High Mental Load
    if (health.mentalLoad === 'HIGH' || health.mentalLoad === 'CRITICAL') {
        return true;
    }

    // Pattern Trigger: Check for chronic issues in Sleep, Water, or Food
    // If any is LOW for 3 consecutive days (Today + 2 past days), trigger recovery.
    const criticalFactors = ['sleep', 'water', 'food'];

    for (const factor of criticalFactors) {
        if (health[factor] === 'LOW') {
            if (history.length >= 2) {
                const day1 = history[0]; // Yesterday
                const day2 = history[1]; // Day before

                if (day1.health && day1.health[factor] === 'LOW' &&
                    day2.health && day2.health[factor] === 'LOW') {
                    return true;
                }
            }
        }
    }

    return false;
}

/**
 * Determines the highest priority action based on deficits.
 * @param {Object} health - Health signals
 * @returns {string|null} - The key of the action to take (e.g., 'water'), or null if all OK.
 */
function getHighestPriorityAction(health) {
    // Check purely based on priority order
    // 1. Water
    if (health.water === 'LOW') return 'water';
    // 2. Food
    if (health.food === 'LOW') return 'food';
    // 3. Sleep Preparation (if sleep is low, asking to sleep is priority)
    if (health.sleep === 'LOW') return 'sleep';
    // 4. Exercise (only if others are OK and exercise is PENDING)
    if (health.exercise === 'PENDING') return 'exercise';

    return null;
}

/**
 * Calculates continuity state.
 * @param {boolean} appOpened - Has the app been opened?
 * @returns {string} - 'MAINTAINED' or 'PAUSED'
 */
/**
 * Calculates Biological Debts (0-100) and Cognitive Capacity (0-100).
 * Uses Lieibig's Law of the Minimum: Capacity is limited by the scarcest resource.
 */
function calculateBiologicalMetrics(health, history = []) {
    let sleepDebt = 0;
    let hydrationDebt = 0;
    let mentalDebt = 0;

    // Combine current day + history into one timeline (newest first)
    // Create a safe array of log objects
    const timeline = [{ health }, ...history];

    // Traverse timeline (reverse chronological)
    // Limit to last 7 days for debt calculation accumulation
    const relevantHistory = timeline.slice(0, 7);

    // We iterate from OLDEST to NEWEST to simulate accumulation?
    // "Humans don't break suddenly... they accumulate".
    // If I calculate Newest->Oldest, I'm effectively doing "Current Status + History Modifier".
    // Let's iterate Oldest->Newest (reverse the slice) to simulate the "Build up".

    const chronological = [...relevantHistory].reverse();

    chronological.forEach(log => {
        const h = log.health;
        if (!h) return;

        // Sleep Logic
        if (h.sleep === 'LOW') sleepDebt += 20;
        else if (h.sleep === 'OK') sleepDebt = Math.max(0, sleepDebt - 10);
        else if (h.sleep === 'OPTIMAL') sleepDebt = 0; // Reset

        // Water Logic
        if (h.water === 'LOW') hydrationDebt += 15;
        else if (h.water === 'OK') hydrationDebt = Math.max(0, hydrationDebt - 15);

        // Mental Logic
        if (h.mentalLoad === 'HIGH' || h.mentalLoad === 'CRITICAL') mentalDebt += 15;
        else if (h.mentalLoad === 'LOW') mentalDebt = Math.max(0, mentalDebt - 10);
    });

    // Cap at 100
    sleepDebt = Math.min(100, sleepDebt);
    hydrationDebt = Math.min(100, hydrationDebt);
    mentalDebt = Math.min(100, mentalDebt);

    // Calculate Capacity: Limited by the heaviest anchor
    const maxDebt = Math.max(sleepDebt, hydrationDebt, mentalDebt);
    const capacity = Math.max(0, 100 - maxDebt);

    // Predict Failure
    let prediction = null;
    if (capacity < 20) prediction = "CRITICAL FAILURE IMMINENT (< 12h)";
    else if (capacity < 40) prediction = "Functional Collapse expected within 24h";

    // --- NEW: Modes & Budgets ---
    let systemMode = "NORMAL";
    let recoveryBudget = 0; // Hours needed
    let violationPenalty = 0;

    // Define Modes based on Capacity
    if (capacity < 20) {
        systemMode = "SURVIVAL";
        recoveryBudget = 24 + ((100 - capacity) * 0.5); // 24h min + penalty
    } else if (capacity < 45 || isRecoveryRequired(health, false, history)) {
        systemMode = "LOCKED_RECOVERY";
        recoveryBudget = 10 + ((50 - capacity) * 0.5); // 10h min
    }

    // Violation Detection
    // Did user ignore previous recovery?
    // Check yesterday (history[0])
    if (history.length > 0) {
        const yesterday = history[0];
        // We look for previous AI response metrics if saved
        const prevMetrics = yesterday.aiResponse?.metrics;

        if (prevMetrics && (prevMetrics.systemMode === 'LOCKED_RECOVERY' || prevMetrics.systemMode === 'SURVIVAL')) {
            // If they were in recovery, and Capacity DROPPED or stayed Critical -> Violation
            // "Ignoring fatigue doesn't delay collapse — it worsens it."
            if (capacity < prevMetrics.capacity) {
                violationPenalty = 5; // Add 5 hours penalty
                recoveryBudget += violationPenalty;
                prediction = `VIOLATION DETECTED. RECOVERY EXTENDED BY ${violationPenalty}H.`;
            }
        }
    }

    return {
        sleepDebt,
        hydrationDebt,
        mentalDebt,
        capacity,
        prediction,
        systemMode,
        recoveryBudget: Math.round(recoveryBudget),
        violationPenalty
    };
}

/**
 * Calculates continuity state.
 * @param {boolean} appOpened - Has the app been opened?
 * @returns {string} - 'MAINTAINED' or 'PAUSED'
 */
function getContinuityState(appOpened) {
    return appOpened ? 'MAINTAINED' : 'PAUSED';
}

/**
 * Generates the final Decision Object for the AI.
 * Decouples logic from explanation.
 */
function generateDecision(health, history = [], userMode = 'CARETAKER') {
    // 1. Calculate Metrics
    const metrics = calculateBiologicalMetrics(health, history);

    // 2. Override Mode if Observer
    if (userMode === 'OBSERVER') {
        metrics.systemMode = 'OBSERVER';
        metrics.prediction = "Observer Mode: Monitoring patterns only.";
        metrics.recoveryBudget = 0;
    }

    // 3. Calculate Confidence
    let confidence = 1.0;

    // Check Input Completeness
    const inputKeys = ['sleep', 'water', 'food', 'mentalLoad'];
    const missingInputs = inputKeys.filter(k => !health[k] || health[k] === 'NOT_SET' || (health[k] && health[k].status === 'NOT_SET'));

    // If health is empty object (passive check), missing inputs is 4. Confidence hits 0.6.
    if (missingInputs.length > 0) {
        confidence -= (missingInputs.length * 0.1);
    }

    // Check History Gap (Consistency)
    // If we have history, check if yesterday exists?
    if (history.length < 3) {
        confidence -= 0.2; // New user penalty
    }

    metrics.confidence = Math.max(0.1, parseFloat(confidence.toFixed(2)));

    // 4. Determine Action
    const actionKey = getHighestPriorityAction(health);
    let requiredAction = null;

    if (actionKey) {
        const actionMap = {
            'water': "Hydrate Immediately",
            'food': "Eat a Nutritious Meal",
            'sleep': "Rest Your Eyes (20m)",
            'exercise': "Movement Break"
        };
        requiredAction = actionMap[actionKey];
    }

    if (userMode === 'OBSERVER') {
        requiredAction = "Continue Observation";
    } else if (metrics.systemMode === 'SURVIVAL') {
        requiredAction = "IMMEDIATE REST PROTOCOL";
    } else if (metrics.systemMode === 'LOCKED_RECOVERY') {
        // If locked, stick to the specific deficit action, or default if none found
        requiredAction = requiredAction || "Immediate Rest Required";
    }

    return {
        decision: {
            ...metrics,
            requiredAction,
            actionKey // Return key for potential API usage
        }
    };
}

module.exports = {
    isRecoveryRequired,
    getHighestPriorityAction,
    getContinuityState,
    calculateBiologicalMetrics,
    generateDecision
};
