/**
 * backend/src/services/aiService.js
 * Enterprise-Grade AI Service with Structured Output
 */
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getMemoryCallback, addStructuredHealthMemory } = require('./memoryService');
const { compareToBaseline, getUserGoals } = require('./baselineService');
const { detectUserPatterns } = require('./patternService');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const AI_PROVIDER = process.env.AI_PROVIDER || 'GEMINI';
const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:5000';

// Initialize Gemini
let genAI = null;
let geminiModel = null;
if (AI_PROVIDER === 'GEMINI' && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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

        // PHASE 4: Detect user patterns
        let userPatterns = null;
        if (context.userId) {
            userPatterns = await detectUserPatterns(context.userId, context.health);
        }

        // Calculate trend summary
        const trendSummary = calculateTrendSummary(context);

        // Calculate confidence (now includes baseline)
        const confidence = calculateConfidence(context, memoryContext, baselineComparison);

        // Get AI response
        let aiResult = null;

        if (AI_PROVIDER === 'GEMINI' && geminiModel) {
            aiResult = await callGeminiStructured(context, timeOfDay, memoryContext, trendSummary, baselineComparison, userGoals, userPatterns);
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
async function callGeminiStructured(context, timeOfDay, memoryContext, trendSummary, baselineComparison, userGoals, userPatterns) {
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

    const prompt = `You are a caring, wise friend who knows this person deeply. You've been watching their health patterns and you genuinely care about their wellbeing.

YOUR PERSONALITY:
- Warm and supportive, like a trusted friend
- Direct but kind - no fluff, real talk
- Acknowledge their struggles with empathy
- Celebrate their wins, no matter how small
- Reference their personal patterns naturally (not robotically)

WHAT YOU KNOW ABOUT THEM RIGHT NOW:
- Energy Level: ${context.decision.capacity}% (${context.decision.capacity < 30 ? 'they\'re running on empty' : context.decision.capacity < 50 ? 'they\'re struggling' : context.decision.capacity < 70 ? 'they\'re doing okay' : 'they\'re in great shape'})
- Time: ${timeOfDay}
- Sleep: ${context.health.sleep === 'LOW' ? 'Didn\'t sleep well' : 'Slept okay'}
- Hydration: ${context.health.water === 'LOW' ? 'Not drinking enough water' : 'Hydrated'}
- Food: ${context.health.food === 'LOW' ? 'Haven\'t eaten properly' : 'Eating well'}
- Exercise: ${context.health.exercise === 'DONE' ? 'Got some movement in' : 'No exercise yet'}
- Stress: ${context.health.mentalLoad === 'HIGH' ? 'Feeling overwhelmed' : context.health.mentalLoad === 'MEDIUM' ? 'Moderate stress' : 'Calm'}

THEIR RECENT STORY: ${trendSummary}
${baselineContext ? `\nWHAT'S NORMAL FOR THEM:\n${baselineContext}` : ''}
${goalsContext ? `\nWHAT THEY'RE WORKING TOWARD:\n${goalsContext}` : ''}
${memoryContext ? `\nYOU REMEMBER: ${memoryContext.message}` : ''}
${userPatterns?.hasEnoughData ? `\nPATTERNS YOU'VE NOTICED (from watching them for ${userPatterns.daysAnalyzed} days):\n${userPatterns.aiSummary}` : ''}

RESPOND WITH THIS JSON (and nothing else):
{
  "action": "one specific thing to do right now (3-8 words, like advice from a friend)",
  "reasoning": "2-3 sentences. Start with empathy ('I can see...', 'I noticed...', 'Based on what I know about you...'). Reference their patterns if relevant. Explain WHY this will help them specifically.",
  "urgency": "${context.decision.capacity < 30 ? 'critical' : context.decision.capacity < 50 ? 'high' : context.decision.capacity < 70 ? 'medium' : 'low'}",
  "timeframe": "when to do this (be specific like 'right now', 'before your next meeting', 'tonight before bed')",
  "category": "hydration|nutrition|sleep|exercise|mental|general"
}

IMPORTANT TONE GUIDELINES:
1. Sound like a caring friend, NOT a robot or doctor
2. Use "you" and "your" - make it personal
3. If they're struggling, acknowledge it warmly ("I can see you're having a tough stretch...")
4. If doing well, celebrate genuinely ("You're on fire lately!")
5. Reference their specific patterns ("I've noticed your Mondays are tough...")
6. Keep reasoning conversational - no bullet points, no formal language
7. If capacity < 40%, be extra gentle and focus on ONE simple recovery action`;


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
// RULES-BASED FALLBACK RESPONSE (Human-Friendly)
// ============================================
function generateRulesBasedResponse(context) {
    const { decision, health } = context;
    const capacity = decision?.capacity || 50;

    // Determine primary issue with warm, human language
    let action, reasoning, category, timeframe;

    if (health.sleep === 'LOW') {
        action = "Get to bed early tonight";
        reasoning = "I can see you didn't get enough rest. Your body needs time to recover, and sleep is the best medicine right now. Tomorrow will feel completely different.";
        category = "sleep";
        timeframe = "tonight before 10pm";
    } else if (health.water === 'LOW') {
        action = "Grab a big glass of water";
        reasoning = "I noticed you haven't had enough water today. Even mild dehydration can make everything feel harder. A few good gulps will help you feel more alert.";
        category = "hydration";
        timeframe = "right now";
    } else if (health.mentalLoad === 'HIGH') {
        action = "Step away for 10 minutes";
        reasoning = "You're carrying a lot right now, and that's exhausting. A short break isn't slacking—it's how you'll actually get through the rest of today without burning out.";
        category = "mental";
        timeframe = "as soon as you can";
    } else if (health.food === 'LOW') {
        action = "Have a proper meal";
        reasoning = "Running on empty never ends well. Your brain needs fuel to function. Something with protein will keep you going longer than a quick snack.";
        category = "nutrition";
        timeframe = "within the next hour";
    } else if (health.exercise === 'PENDING') {
        action = "Move your body for 20 minutes";
        reasoning = "Even a short walk can shift your entire mood. You don't need a full workout—just some movement to get out of your head and into your body.";
        category = "exercise";
        timeframe = "sometime today";
    } else {
        action = "Keep doing what you're doing";
        reasoning = "You're in a good place right now! All your basics are covered. This is what balance looks like—enjoy it.";
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

// ============================================
// DYNAMIC MENTAL LOAD ASSESSMENT
// ============================================

/**
 * Generate a contextual question for mental load assessment
 */
async function generateMentalLoadQuestion(userId) {
    if (!geminiModel) return { question: "How would you describe your mental energy right now?", type: "general" };

    try {
        const history = await getMemoryCallback(userId, {});
        const prompt = `You are a mindful AI health coach. Generate ONE brief, intelligent question to assess the user's current mental load and stress level.
        
        CONTEXT:
        ${history ? `Recent pattern: ${history.message}` : 'No recent history.'}
        
        GUIDELINES:
        1. Keep it under 15 words.
        2. Vary the focus: sometimes ask about rest, sometimes focus/clarity, sometimes physical tension.
        3. Make it feel human and caring, not clinical.
        
        Return ONLY the question text.`;

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return {
            question: response.text().trim() || "How is your mental state feeling at this moment?",
            type: "dynamic"
        };
    } catch (error) {
        console.error('Question generation error:', error);
        return { question: "How is your stress level today?", type: "fallback" };
    }
}

/**
 * Analyze user's response to determine mental load status
 */
async function analyzeMentalLoadAnswer(answer) {
    if (!geminiModel) {
        const lower = answer.toLowerCase();
        if (lower.includes('stress') || lower.includes('busy') || lower.includes('tired') || lower.includes('hard')) return 'HIGH';
        return 'OK';
    }

    try {
        const prompt = `Analyze the user's response to a stress assessment question and categorize it into exactly one of three statuses:
        - OK: Feeling good, balanced, or manageable stress.
        - HIGH: Feeling overwhelmed, anxious, extremely busy, or burnout.
        - LOW: Feeling sad, low energy, depressed, or lack of motivation.

        USER ANSWER: "${answer}"

        Return ONLY the status (OK, HIGH, or LOW).`;

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const status = response.text().trim().toUpperCase();

        if (['OK', 'HIGH', 'LOW'].includes(status)) return status;
        return 'OK';
    } catch (error) {
        return 'OK';
    }
}

module.exports = {
    processHealthData,
    parseVoiceHealthLog,
    generateMentalLoadQuestion,
    analyzeMentalLoadAnswer
};
