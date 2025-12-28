/**
 * backend/src/services/memoryService.js
 * Supermemory integration for long-term user memory
 * Docs: https://supermemory.ai/docs/search/filtering
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const Supermemory = require('supermemory').default;

// Initialize client - uses SUPERMEMORY_API_KEY from environment
const client = new Supermemory({
    apiKey: process.env.SUPERMEMORY_API_KEY
});

const hasValidKey = () =>
    process.env.SUPERMEMORY_API_KEY &&
    process.env.SUPERMEMORY_API_KEY !== 'your_supermemory_key_here';

/**
 * Add a memory for a user
 */
async function addMemory(content, userId, metadata = {}) {
    if (!hasValidKey()) {
        console.warn("Supermemory: No valid API Key. Skipping add.");
        return null;
    }

    try {
        const response = await client.memories.add({
            content: content,
            containerTag: `user_${userId}`,
            metadata: { ...metadata, userId, type: 'health_log' }
        });
        console.log("Supermemory: Memory added for user", userId);
        return response;
    } catch (error) {
        console.error("Supermemory Add Error:", error.message);
        return null;
    }
}

/**
 * Add structured health memory (more semantic for retrieval)
 * STRICT: Only stores ONCE per day (first check-in wins)
 */
const storedToday = new Map(); // In-memory tracker: userId -> lastStoredDate

async function addStructuredHealthMemory(userId, healthData, decision, date = new Date()) {
    if (!hasValidKey()) return null;

    const dateStr = date.toISOString().split('T')[0];

    // STRICT ONCE-PER-DAY: Skip if already stored today
    const lastStoredDate = storedToday.get(userId);
    if (lastStoredDate === dateStr) {
        console.log(`Supermemory: Skipped (already stored for ${dateStr})`);
        return null;
    }

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    // Create semantic memory content
    const stateDescriptors = [];
    if (healthData.sleep === 'LOW') stateDescriptors.push('poor sleep');
    if (healthData.water === 'LOW') stateDescriptors.push('dehydrated');
    if (healthData.mentalLoad === 'HIGH') stateDescriptors.push('high stress');
    if (healthData.exercise === 'DONE') stateDescriptors.push('exercised');

    const stateStr = stateDescriptors.length > 0
        ? stateDescriptors.join(', ')
        : 'balanced state';

    const content = `Date: ${dateStr} (${dayName}) | State: ${stateStr} | Capacity: ${decision.metrics?.capacity || 'N/A'}% | Action: ${decision.action || 'Continue'} | Mode: ${decision.systemStatus || 'NORMAL'}`;

    try {
        await client.memories.add({
            content,
            containerTag: `user_${userId}`,
            metadata: {
                userId,
                type: 'daily_state',
                date: dateStr,
                dayOfWeek: dayName,
                capacity: decision.metrics?.capacity,
                hadLowSleep: healthData.sleep === 'LOW',
                hadHighStress: healthData.mentalLoad === 'HIGH',
                wasRecovery: decision.recoveryRequired || false
            }
        });

        // Mark as stored for today
        storedToday.set(userId, dateStr);
        console.log(`Supermemory: Structured memory added for ${dateStr}`);
        return true;
    } catch (error) {
        console.error("Supermemory Structured Add Error:", error.message);
        return null;
    }
}

/**
 * Recall similar past states for "Last time you felt like this..."
 */
async function recallSimilarState(userId, currentState) {
    if (!hasValidKey()) {
        console.log("Supermemory Search: Skipped (no valid API key)");
        return null;
    }

    // Build semantic query based on current state
    const queryParts = [];
    if (currentState.sleep === 'LOW') queryParts.push('poor sleep');
    if (currentState.mentalLoad === 'HIGH') queryParts.push('high stress');
    if (currentState.water === 'LOW') queryParts.push('dehydrated');

    if (queryParts.length === 0) {
        queryParts.push('balanced state');
    }

    const query = queryParts.join(' and ');
    console.log(`Supermemory Search: Query="${query}" for user_${userId}`);

    try {
        const response = await client.search.documents({
            q: query,
            containerTags: [`user_${userId}`],
            limit: 3
        });

        if (response.results && response.results.length > 0) {
            console.log(`Supermemory Search: Found ${response.results.length} memories`);
            return response.results.map(r => {
                const content = r.content || r.chunk?.content || '';
                return { content, score: r.score || 0 };
            });
        }
        console.log("Supermemory Search: No matching memories found");
        return [];
    } catch (error) {
        console.error("Supermemory Recall Error:", error.message);
        return [];
    }
}

/**
 * Generate memory callback message for AI context
 */
async function getMemoryCallback(userId, currentState) {
    console.log(`Supermemory: Attempting retrieval for user ${userId}`);
    const memories = await recallSimilarState(userId, currentState);

    if (!memories || memories.length === 0) {
        console.log("Supermemory: No callback generated (no memories)");
        // FALLBACK: Return a friendly message for new users
        return {
            message: "Building your health history... Check in daily for personalized insights.",
            isNewUser: true
        };
    }

    // Find most relevant past memory
    const topMemory = memories[0];
    if (!topMemory.content) return null;

    // Extract useful info from memory content
    const match = topMemory.content.match(/Date: ([^|]+)\|.*Capacity: (\d+)%.*Action: ([^|]+)/);

    if (match) {
        const callback = {
            date: match[1].trim(),
            capacity: parseInt(match[2]),
            action: match[3].trim(),
            message: `Last time you felt like this (${match[1].trim()}), your capacity was ${match[2]}% and the recommended action was: ${match[3].trim()}`
        };
        console.log(`Supermemory Callback: "${callback.message}"`);
        return callback;
    }

    // Fallback if structured parsing fails but we have content
    console.log("Supermemory: Raw memory returned (using raw content)");
    return {
        message: `Recall from your history: ${topMemory.content.substring(0, 100)}...`,
        isNewUser: false
    };
}

/**
 * Store weekly reflection
 */
async function storeWeeklyReflection(userId, reflection) {
    if (!hasValidKey()) return null;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStr = weekStart.toISOString().split('T')[0];

    const content = `Weekly Reflection (${weekStr}): What went well: ${reflection.wentWell || 'N/A'} | What drained: ${reflection.drained || 'N/A'} | Experiment: ${reflection.experiment || 'N/A'}`;

    try {
        await client.memories.add({
            content,
            containerTag: `user_${userId}`,
            metadata: {
                userId,
                type: 'weekly_reflection',
                weekStart: weekStr,
                wentWell: reflection.wentWell,
                drained: reflection.drained,
                experiment: reflection.experiment
            }
        });
        console.log("Supermemory: Weekly reflection stored");
        return true;
    } catch (error) {
        console.error("Supermemory Reflection Error:", error.message);
        return null;
    }
}

/**
 * Search memories for a user
 */
async function queryMemory(query, userId, limit = 3) {
    if (!hasValidKey()) return [];

    try {
        const response = await client.search.documents({
            q: query,
            containerTags: [`user_${userId}`],
            limit: limit
        });

        if (response.results && response.results.length > 0) {
            console.log(`Supermemory: Found ${response.results.length} memories`);
            return response.results.map(r => r.content || r.chunk?.content || '');
        }
        return [];
    } catch (error) {
        console.error("Supermemory Query Error:", error.message);
        return [];
    }
}

module.exports = {
    addMemory,
    queryMemory,
    addStructuredHealthMemory,
    recallSimilarState,
    getMemoryCallback,
    storeWeeklyReflection
};

