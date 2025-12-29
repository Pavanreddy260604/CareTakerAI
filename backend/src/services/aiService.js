/**
 * backend/src/services/aiService.js
 * Enterprise-Grade AI Service with Structured Output
 */
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getMemoryCallback, addStructuredHealthMemory } = require('./memoryService');
const { compareToBaseline, getUserGoals } = require('./baselineService');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const AI_PROVIDER = process.env.AI_PROVIDER || 'GEMINI';
const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:5000';

// Initialize Gemini
let genAI = null;
let geminiModel = null;
if (AI_PROVIDER === 'GEMINI' && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

// ============================================
// STRUCTURED RESPONSE SCHEMA
// ============================================
const RESPONSE_SCHEMA = {
    action: "string - specific actionable task (max 10 words)",
    reasoning: "string - brief explanation (1-2 sentences)",
    urgency: "low | medium | high | critical",
    timeframe: "string - when to do this (e.g., 'now', 'within 2 hours', 'before bed')",
    category: "hydration | nutrition | sleep | exercise | mental | general"
};

// ============================================
// CONFIDENCE CALCULATION
// ============================================
function calculateConfidence(context, memoryContext, baselineComparison) {
    let confidence = 50; // Base confidence

    // History depth adds confidence
    if (context.history && context.history.length > 0) {
        confidence += Math.min(context.history.length * 3, 20); // Max +20 for history
    }

    // Consistency in data adds confidence
    if (context.history && context.history.length >= 3) {
        const last3 = context.history.slice(0, 3);
        const allSameSleep = last3.every(h => h.health.sleep === context.health.sleep);
        const allSameStress = last3.every(h => h.health.mentalLoad === context.health.mentalLoad);
        if (allSameSleep) confidence += 5;
        if (allSameStress) confidence += 5;
    }

    // Memory context adds confidence (we have learned about user)
    if (memoryContext && memoryContext.hasSimilarPast) {
        confidence += 10;
    }

    // Baseline comparison adds confidence (personalized)
    if (baselineComparison && baselineComparison.hasBaseline) {
        confidence += 10;
    }

    // Complete health data adds confidence
    const healthFields = ['water', 'food', 'sleep', 'exercise', 'mentalLoad'];
    const completeness = healthFields.filter(f => context.health[f]).length / healthFields.length;
    confidence += Math.round(completeness * 10);

    // Capacity extremes are more certain
    if (context.decision && (context.decision.capacity < 30 || context.decision.capacity > 80)) {
        confidence += 5;
    }

    return Math.min(Math.max(confidence, 20), 98); // Clamp between 20-98
}

// ============================================
// RESPONSE VALIDATION
// ============================================
function validateAIResponse(parsed) {
    const required = ['action', 'reasoning', 'urgency'];
    const validUrgency = ['low', 'medium', 'high', 'critical'];

    // Check required fields exist
    for (const field of required) {
        if (!parsed[field] || typeof parsed[field] !== 'string') {
            return { valid: false, reason: `Missing or invalid field: ${field}` };
        }
    }

    // Validate urgency value
    if (!validUrgency.includes(parsed.urgency.toLowerCase())) {
        return { valid: false, reason: `Invalid urgency: ${parsed.urgency}` };
    }

    // Action should be actionable (not too vague)
    if (parsed.action.length < 5 || parsed.action.length > 100) {
        return { valid: false, reason: 'Action length out of range' };
    }

    return { valid: true };
}

// ============================================
// PARSE AI RESPONSE
// ============================================
function parseAIResponse(text) {
    try {
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return { success: true, data: parsed };
        }
        return { success: false, error: 'No JSON found in response' };
    } catch (e) {
        return { success: false, error: `Parse error: ${e.message}` };
    }
}

// ============================================
// MAIN PROCESSING FUNCTION
// ============================================
async function processHealthData(context) {
    try {
        const currentHour = new Date().getHours();
        const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

        // Normalize health data to uppercase to prevent case sensitivity issues
        if (context.health) {
            Object.keys(context.health).forEach(key => {
                if (typeof context.health[key] === 'string') {
                    context.health[key] = context.health[key].toUpperCase();
                }
            });
            // Map common variances
            if (context.health.sleep === 'POOR') context.health.sleep = 'LOW';
            if (context.health.food === 'NONE') context.health.food = 'LOW';
            if (context.health.exercise === 'NONE') context.health.exercise = 'PENDING';
        }

        // Get memory callback
        let memoryContext = null;
        if (context.userId && context.health) {
            memoryContext = await getMemoryCallback(context.userId, context.health);
        }

        // PHASE 3: Get baseline comparison
        let baselineComparison = null;
        let userGoals = null;
        if (context.userId) {
            baselineComparison = await compareToBaseline(
                context.userId,
                context.decision?.capacity || 70,
                context.health
            );
            userGoals = await getUserGoals(context.userId);
        }

        // Calculate trend summary
        const trendSummary = calculateTrendSummary(context);

        // Calculate confidence (now includes baseline)
        const confidence = calculateConfidence(context, memoryContext, baselineComparison);

        // Get AI response
        let aiResult = null;

        if (AI_PROVIDER === 'GEMINI' && geminiModel) {
            aiResult = await callGeminiStructured(context, timeOfDay, memoryContext, trendSummary, baselineComparison, userGoals);
        } else {
            aiResult = await callLocalMistral(context, timeOfDay, memoryContext, trendSummary);
        }

        // Store memory
        if (context.userId && context.health) {
            addStructuredHealthMemory(context.userId, context.health, context.decision);
        }

        return {
            systemStatus: context.decision.systemMode,
            action: aiResult.action,
            explanation: aiResult.reasoning,
            urgency: aiResult.urgency,
            timeframe: aiResult.timeframe || 'today',
            category: aiResult.category || 'general',
            confidence: confidence,
            metrics: context.decision,
            memoryCallback: memoryContext,
            trendSummary: trendSummary,
            // Legacy field for backward compatibility
            rawExplanation: `${aiResult.action}. ${aiResult.reasoning}`
        };

    } catch (error) {
        console.error(`AI Service Error:`, error.message);
        return fallbackResponse(context);
    }
}

// ============================================
// STRUCTURED GEMINI CALL
// ============================================
async function callGeminiStructured(context, timeOfDay, memoryContext, trendSummary, baselineComparison, userGoals) {
    // Build baseline context string
    let baselineContext = '';
    if (baselineComparison && baselineComparison.hasBaseline) {
        baselineContext = `
PERSONAL BASELINE (what's normal for this user):
- Average Capacity: ${baselineComparison.baseline.avgCapacity}%
- Current vs Average: ${baselineComparison.capacityVsAverage > 0 ? '+' : ''}${baselineComparison.capacityVsAverage}%
- Below personal threshold: ${baselineComparison.isBelowThreshold ? 'YES (concerning)' : 'NO'}
- Personal insights: ${baselineComparison.insights?.map(i => i.message).join('; ') || 'None'}`;
    }

    // Build goals context string
    let goalsContext = '';
    if (userGoals) {
        goalsContext = `
USER GOALS:
- Target sleep: ${userGoals.targetSleepHours} hours
- Target water: ${userGoals.targetWaterLiters} liters
- Target exercise: ${userGoals.targetExerciseDays} days/week`;
    }

    const prompt = `You are the Caretaker AI - a personalized health strategist who knows this user's patterns.

CURRENT STATUS:
- Capacity: ${context.decision.capacity}%
- System Mode: ${context.decision.systemMode}
- Required Action: ${context.decision.requiredAction}
- Time of Day: ${timeOfDay}

HEALTH DATA TODAY:
- Sleep: ${context.health.sleep}
- Water: ${context.health.water}
- Food: ${context.health.food}
- Exercise: ${context.health.exercise}
- Mental Load: ${context.health.mentalLoad}

TREND DATA: ${trendSummary}
${baselineContext}
${goalsContext}
${memoryContext ? `USER MEMORY: ${memoryContext.message}` : ''}

RESPOND WITH EXACTLY THIS JSON FORMAT (no other text):
{
  "action": "specific task in 3-8 words",
  "reasoning": "1 sentence explaining why, referencing personal baseline if available",
  "urgency": "${context.decision.capacity < 30 ? 'critical' : context.decision.capacity < 50 ? 'high' : context.decision.capacity < 70 ? 'medium' : 'low'}",
  "timeframe": "when to do this",
  "category": "hydration|nutrition|sleep|exercise|mental|general"
}

RULES:
1. Action MUST be specific and actionable (not vague like "take care of yourself")
2. Reference the user's PERSONAL baseline when available (e.g., "Your capacity is 15% below YOUR usual average")
3. If capacity < 40%, action should focus on RECOVERY
4. Match category to the most pressing issue
5. Timeframe should be realistic
6. If user is performing BETTER than their baseline, acknowledge it positively`;

    try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const parsed = parseAIResponse(text);

        if (parsed.success) {
            const validation = validateAIResponse(parsed.data);
            if (validation.valid) {
                return {
                    ...parsed.data,
                    urgency: parsed.data.urgency.toLowerCase()
                };
            }
            console.warn('AI response validation failed:', validation.reason);
        }

        // Fallback to rules-based
        return generateRulesBasedResponse(context);

    } catch (error) {
        console.error('Gemini call failed:', error.message);
        return generateRulesBasedResponse(context);
    }
}

// ============================================
// RULES-BASED FALLBACK RESPONSE
// ============================================
function generateRulesBasedResponse(context) {
    const { decision, health } = context;
    const capacity = decision?.capacity || 50;

    // Determine primary issue
    let action, reasoning, category, timeframe;

    if (health.sleep === 'LOW') {
        action = "Prioritize 8 hours of sleep tonight";
        reasoning = "Sleep deficit is limiting your cognitive capacity. Recovery requires rest.";
        category = "sleep";
        timeframe = "tonight";
    } else if (health.water === 'LOW') {
        action = "Drink 500ml of water now";
        reasoning = "Dehydration detected. Immediate hydration will improve focus and energy.";
        category = "hydration";
        timeframe = "now";
    } else if (health.mentalLoad === 'HIGH') {
        action = "Take a 10-minute break";
        reasoning = "High mental load detected. A short break will help restore focus.";
        category = "mental";
        timeframe = "within 30 minutes";
    } else if (health.food === 'LOW') {
        action = "Eat a balanced meal";
        reasoning = "Nutrition is essential for sustained energy. Prioritize protein and complex carbs.";
        category = "nutrition";
        timeframe = "within 1 hour";
    } else if (health.exercise === 'PENDING') {
        action = "Get 20 minutes of movement";
        reasoning = "Physical activity boosts mood and energy. Even a short walk helps.";
        category = "exercise";
        timeframe = "today";
    } else {
        action = "Maintain your current routine";
        reasoning = "All metrics are stable. Continue your healthy habits.";
        category = "general";
        timeframe = "ongoing";
    }

    const urgency = capacity < 30 ? 'critical'
        : capacity < 50 ? 'high'
            : capacity < 70 ? 'medium'
                : 'low';

    return { action, reasoning, urgency, category, timeframe };
}

// ============================================
// TREND SUMMARY CALCULATION
// ============================================
function calculateTrendSummary(context) {
    if (!context.history || context.history.length === 0) {
        return "First check-in - no historical data yet.";
    }

    const last7 = context.history.slice(0, 7);
    const trends = [];

    const lowSleepCount = last7.filter(log => log.health?.sleep === 'LOW').length;
    const lowWaterCount = last7.filter(log => log.health?.water === 'LOW').length;
    const highStressCount = last7.filter(log => log.health?.mentalLoad === 'HIGH').length;
    const exerciseCount = last7.filter(log => log.health?.exercise === 'DONE').length;

    if (lowSleepCount >= 3) trends.push(`Sleep deficit: ${lowSleepCount}/7 days with poor sleep`);
    if (lowWaterCount >= 3) trends.push(`Dehydration pattern: ${lowWaterCount}/7 days`);
    if (highStressCount >= 3) trends.push(`Chronic stress: ${highStressCount}/7 days high mental load`);
    if (exerciseCount <= 1 && last7.length >= 5) trends.push(`Low activity: only ${exerciseCount} exercise days`);
    if (exerciseCount >= 5) trends.push(`Strong exercise habit: ${exerciseCount}/7 days active`);

    return trends.length > 0
        ? trends.join('. ') + '.'
        : "Metrics are stable with no concerning patterns.";
}

// ============================================
// LOCAL MISTRAL CALL
// ============================================
async function callLocalMistral(context, timeOfDay, memoryContext, trendSummary) {
    try {
        const response = await fetch(`${AI_SERVER_URL}/inference`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...context.decision,
                timeOfDay,
                trendSummary,
                memoryCallback: memoryContext?.message || null
            }),
        });

        if (!response.ok) throw new Error(`Mistral error: ${response.status}`);
        const data = await response.json();

        // Try to structure Mistral response
        return {
            action: context.decision.requiredAction || "Follow recovery protocol",
            reasoning: data.explanation || "Based on current metrics analysis.",
            urgency: context.decision.capacity < 50 ? 'high' : 'medium',
            category: 'general',
            timeframe: 'today'
        };
    } catch (error) {
        console.error('Mistral call failed:', error.message);
        return generateRulesBasedResponse(context);
    }
}

// ============================================
// FALLBACK RESPONSE
// ============================================
function fallbackResponse(context) {
    const rulesResponse = generateRulesBasedResponse(context);

    return {
        systemStatus: context.decision?.systemMode || "RULE_ENFORCED",
        action: rulesResponse.action,
        explanation: rulesResponse.reasoning,
        urgency: rulesResponse.urgency,
        timeframe: rulesResponse.timeframe,
        category: rulesResponse.category,
        confidence: 75, // Rules-based is fairly confident
        metrics: context.decision,
        memoryCallback: null,
        trendSummary: "Using rules-based analysis.",
        rawExplanation: `${rulesResponse.action}. ${rulesResponse.reasoning}`
    };
}

// ============================================
// VOICE COMMAND PARSING
// ============================================
async function parseVoiceHealthLog(text) {
    const prompt = `
    You are an AI assistant parsing natural language health logs.
    User said: "${text}"

    Extract the following health data if mentioned:
    - water (OK/LOW/HIGH/PENDING) - OK if they drank water, LOW if thirsty/forgot
    - food (OK/LOW/HIGH/PENDING) - OK if ate, LOW if hungry/skipped
    - sleep (OK/LOW/HIGH/PENDING) - OK if slept well (>6h), LOW if tired/bad sleep
    - exercise (DONE/PENDING) - DONE if they exercised/moved, PENDING if not
    - mental (OK/HIGH/LOW) - HIGH if stressed/anxious, LOW if sad/depressed, OK if good/neutral

    Return ONLY a JSON object:
    {
      "water": "status",
      "food": "status", 
      "sleep": "status",
      "exercise": "status",
      "mental": "status"
    }
    Only include fields that are explicitly mentioned or clearly implied.
    `;

    try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const jsonText = response.text().match(/\{[\s\S]*\}/)?.[0];

        if (!jsonText) return { success: false, error: 'No structured data parsed' };

        return {
            success: true,
            health: JSON.parse(jsonText),
            raw: text
        };
    } catch (error) {
        console.error('Voice parse error:', error);
        // Fallback to basic regex if AI fails
        const health = {};
        const lower = text.toLowerCase();
        if (lower.includes('water') || lower.includes('drink')) health.water = 'OK';
        if (lower.includes('food') || lower.includes('eat') || lower.includes('meal')) health.food = 'OK';
        if (lower.includes('sleep') || lower.includes('tired')) health.sleep = lower.includes('tired') ? 'LOW' : 'OK';
        if (lower.includes('exercis') || lower.includes('run') || lower.includes('workout')) health.exercise = 'DONE';

        return { success: true, health, usedFallback: true };
    }
}

module.exports = { processHealthData, parseVoiceHealthLog };
