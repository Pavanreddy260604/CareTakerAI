const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getMemoryCallback, addStructuredHealthMemory } = require('./memoryService');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const AI_PROVIDER = process.env.AI_PROVIDER || 'MISTRAL'; // 'GEMINI' or 'MISTRAL'
const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:5000';

// Initialize Gemini if provider is set
let genAI = null;
let geminiModel = null;
if (AI_PROVIDER === 'GEMINI' && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use the user-validated model
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

/**
 * Generates the Caretaker explanation.
 * Supports choosing between Gemini Cloud and local Mistral.
 */
async function processHealthData(context) {
    try {
        const currentHour = new Date().getHours();
        const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

        // Get memory callback if user exists
        let memoryContext = null;
        if (context.userId && context.health) {
            memoryContext = await getMemoryCallback(context.userId, context.health);
        }

        // Calculate Long-Term Trends (Week/Month)
        let trendSummary = "";
        if (context.history && context.history.length > 0) {
            const last7 = context.history.slice(0, 7);
            const lowSleepCount = last7.filter(log => log.health.sleep === 'LOW').length;
            const lowWaterCount = last7.filter(log => log.health.water === 'LOW').length;
            const highStressCount = last7.filter(log => log.health.mentalLoad === 'HIGH').length;

            const trends = [];
            // Weekly Chronic Issues
            if (lowSleepCount >= 3) trends.push(`Chronic low sleep detected: ${lowSleepCount} of the last 7 days`);
            if (lowWaterCount >= 3) trends.push(`Dehydration pattern emerging: ${lowWaterCount} of the last 7 days`);
            if (highStressCount >= 3) trends.push(`High mental load persists for ${highStressCount}/7 days`);

            // Monthly Perspective
            if (context.history.length >= 14) {
                const waterOkRatio = context.history.filter(log => log.health.water === 'OK').length / context.history.length;
                if (waterOkRatio > 0.8) trends.push(`Excellent hydration stability over the last month`);

                const exerciseCount = context.history.filter(log => log.health.exercise === 'DONE').length;
                if (exerciseCount < 5 && context.history.length >= 20) trends.push(`Activity levels are significantly below monthly targets`);
            }

            trendSummary = trends.length > 0
                ? `System Pattern Analysis: ${trends.join('. ')}.`
                : "Operational metrics are consistent with long-term averages.";
        }

        // Calculate a simple "What Changed?" diff from history
        let dailyDiff = "";
        if (context.history && context.history.length > 0) {
            const yesterday = context.history[0].health;
            const changes = [];
            if (context.health.sleep !== yesterday.sleep) changes.push(`Sleep (${yesterday.sleep} -> ${context.health.sleep})`);
            if (context.health.water !== yesterday.water) changes.push(`Hydration (${yesterday.water} -> ${context.health.water})`);
            if (context.health.mentalLoad !== yesterday.mentalLoad) changes.push(`Stress (${yesterday.mentalLoad} -> ${context.health.mentalLoad})`);

            if (changes.length > 0) {
                dailyDiff = `Changes since yesterday: ${changes.join(', ')}.`;
            } else {
                dailyDiff = "Your metrics are consistent with yesterday.";
            }
        }

        let explanation = "";

        if (AI_PROVIDER === 'GEMINI' && geminiModel) {
            explanation = await callGemini(context, timeOfDay, memoryContext, trendSummary);
        } else {
            explanation = await callLocalMistral(context, timeOfDay, memoryContext, trendSummary);
        }

        // Store structured memory for future recall
        if (context.userId && context.health) {
            addStructuredHealthMemory(context.userId, context.health, context.decision);
        }

        return {
            systemStatus: context.decision.systemMode,
            action: context.decision.requiredAction,
            explanation: explanation,
            metrics: context.decision,
            memoryCallback: memoryContext,
            trendSummary: trendSummary
        };

    } catch (error) {
        console.error(`${AI_PROVIDER} AI Service Error:`, error.message);
        return fallbackResponse(context);
    }
}

async function callGemini(context, timeOfDay, memoryContext, trendSummary) {
    const prompt = `
        ROLE: You are the "Caretaker AI" - a long-term biological health strategist.
        TONE: Clear, supportive, and data-driven.
        
        INPUT DATA:
        - Today's Capacity: ${context.decision.capacity}%
        - Required Action: ${context.decision.requiredAction}
        - Time: ${timeOfDay}
        
        HISTORICAL TREND DATA:
        - ${trendSummary}
        ${memoryContext ? `- User Memory: ${memoryContext.message}` : ''}
        
        OBJECTIVE: Explain the health status using the LONG-TERM TRENDS provided. 
        Instead of just talking about today, emphasize the pattern (e.g., "This is your third day of low sleep this week, which is why your capacity is dropping").
        Be firm about recovery if a chronic pattern is detected.
        
        Format: 2 sentences max. Speak to a "normal person" clearly.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

async function callLocalMistral(context, timeOfDay, memoryContext, trendSummary) {
    const aiPayload = {
        ...context.decision,
        timeOfDay,
        trendSummary,
        memoryCallback: memoryContext?.message || null
    };

    const response = await fetch(`${AI_SERVER_URL}/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload),
    });

    if (!response.ok) throw new Error(`Mistral Server error: ${response.status}`);
    const data = await response.json();
    return data.explanation;
}

function fallbackResponse(context) {
    return {
        systemStatus: context.decision?.systemMode || "RULE_ENFORCED",
        action: context.decision?.requiredAction || "Monitor Status",
        explanation: `System capacity at ${context.decision?.capacity || 'unknown'}%. Enforcing recovery protocols via biological rules engine.`,
        metrics: context.decision,
        memoryCallback: null
    };
}

module.exports = { processHealthData };

