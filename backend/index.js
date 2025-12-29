/**
 * backend/index.js
 * Main API Server (Entry Point)
 */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Config
const connectDB = require('./src/config/db');

// Models
const User = require('./src/models/User');
const HealthLog = require('./src/models/HealthLog');
const FocusSession = require('./src/models/FocusSession');

// Services
const { isRecoveryRequired, getHighestPriorityAction, getContinuityState, calculateBiologicalMetrics, generateDecision } = require('./src/services/rulesService');
const { processHealthData } = require('./src/services/aiService');
const { addMemory, queryMemory, storeWeeklyReflection } = require('./src/services/memoryService');
const { getEngagementData } = require('./src/services/engagementService');
const { getFullAnalytics } = require('./src/services/analyticsService');
const { getBaseline, compareToBaseline, getUserGoals, updateUserGoals, calculateBaseline } = require('./src/services/baselineService');
const { generateWeeklySummary, getMonthlyTrends } = require('./src/services/insightsService');
const { getSmartReminder, getUserAchievements, getTimeOfDayContext, calculateStreakStatus, generateAIGoalSuggestions, generateAITrendAnalysis } = require('./src/services/reminderService');

// Middleware
const authMiddleware = require('./src/middleware/auth');

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// --- SECURITY: CORS Configuration ---
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// --- Health Check Endpoint (for hosting platforms) ---
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- SECURITY: Rate Limiting ---
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 auth attempts per window
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(generalLimiter);
app.use(helmet()); // Security Headers
app.use(express.json());

// Routes (with auth rate limiting)
app.use('/api/auth', authLimiter, require('./src/routes/auth'));

// API Endpoint: Get User Stats (PROTECTED)
app.get('/api/user/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user for settings/date
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Calculate days since registration (Calendar Days)
        const regDate = new Date(user.createdAt);
        regDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysSinceRegistration = Math.floor((today - regDate) / (1000 * 60 * 60 * 24)) + 1;

        // Get today's log
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const todayLog = await HealthLog.findOne({
            userId: userId,
            date: { $gte: startOfDay }
        });

        // Calculate streak
        const logs = await HealthLog.find({ userId: userId }).sort({ date: -1 }).limit(30);

        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        for (const log of logs) {
            const logDate = new Date(log.date);
            logDate.setHours(0, 0, 0, 0);
            if (logDate.getTime() === checkDate.getTime()) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (streak === 0 && logDate.getTime() === checkDate.getTime() - 86400000) {
                streak++;
                checkDate = logDate;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        // Calculate metrics using GenerateDecision for consistency (Confidence etc)
        const historyForMetrics = await HealthLog.find({ userId: req.user.id })
            .sort({ date: -1 })
            .limit(7);

        const currentHealth = todayLog ? todayLog.health : {};
        const userMode = user.settings?.mode || 'CARETAKER';
        const decisionObject = generateDecision(currentHealth, historyForMetrics, userMode);

        res.json({
            name: user.name,
            email: user.email,
            registrationDate: user.createdAt,
            dayCount: daysSinceRegistration,
            streak: streak,
            todayCheckedIn: !!todayLog,
            latestLog: todayLog,
            totalCheckIns: logs.length,
            metrics: decisionObject.decision,
            mode: userMode
        });

    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// API Endpoint: Check-in (PROTECTED)
app.post('/api/check-in', authMiddleware, async (req, res) => {
    try {
        const { health, continuity, recoveryRequired, appOpened } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId);

        // Fetch recent logs (30 days for monthly trend analysis)
        const historyLogs = await HealthLog.find({ userId: userId })
            .sort({ date: -1 })
            .limit(30);

        // 1. Generate Decision (Decoupled Logic)
        const userMode = user.settings?.mode || 'CARETAKER';
        const decisionObject = generateDecision(health, historyLogs, userMode);

        // 2. Memory storage is now handled by aiService.js via addStructuredHealthMemory
        // (with deduplication - only stores once per day OR when status changes)

        // 3. Prepare Context for AI
        const context = {
            userId: req.user.id, // Fixed: Added userId for Supermemory retrieval
            userName: user.name,
            health,
            decision: decisionObject.decision,
            history: historyLogs.map(log => ({ date: log.date, health: log.health }))
        };

        // 4. Get AI Explanation
        const aiResult = await processHealthData(context);

        // 5. Save Health Log
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        await HealthLog.findOneAndUpdate(
            { userId: userId, date: { $gte: startOfDay } },
            {
                userId: userId,
                date: new Date(),
                health: health,
                aiResponse: aiResult
            },
            { upsert: true, new: true }
        );

        res.json(aiResult);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'Internal System Error' });
    }
});



// API Endpoint: Get Health History (PROTECTED)
app.get('/api/health/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 7;

        const logs = await HealthLog.find({ userId: userId })
            .sort({ date: -1 })
            .limit(limit);

        res.json(logs);
    } catch (error) {
        console.error('History Error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// API Endpoint: Update Settings (PROTECTED)
app.put('/api/user/settings', authMiddleware, async (req, res) => {
    try {
        const { mode } = req.body;
        const userId = req.user.id;

        if (!['CARETAKER', 'OBSERVER'].includes(mode)) {
            return res.status(400).json({ error: 'Invalid mode' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { 'settings.mode': mode },
            { new: true }
        );

        res.json(user.settings);
    } catch (error) {
        console.error('Settings Error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// API Endpoint: Get Engagement Data (PROTECTED)
app.get('/api/engagement', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const engagement = await getEngagementData(userId);
        res.json(engagement);
    } catch (error) {
        console.error('Engagement Error:', error);
        res.status(500).json({ error: 'Failed to get engagement data' });
    }
});

// API Endpoint: Store Weekly Reflection (PROTECTED)
app.post('/api/reflection', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { wentWell, drained, experiment } = req.body;

        if (!wentWell && !drained && !experiment) {
            return res.status(400).json({ error: 'At least one field required' });
        }

        await storeWeeklyReflection(userId, { wentWell, drained, experiment });
        res.json({ success: true, message: 'Reflection stored' });
    } catch (error) {
        console.error('Reflection Error:', error);
        res.status(500).json({ error: 'Failed to store reflection' });
    }
});

// API Endpoint: Get Analytics (PROTECTED)
app.get('/api/analytics', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const analytics = await getFullAnalytics(userId);
        res.json(analytics);
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// API Endpoint: Parse Voice Text using AI (PROTECTED)
app.post('/api/parse-voice', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Use Gemini if available
        const { GoogleGenerativeAI } = require("@google/generative-ai");

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'AI not configured' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `You are a health data extraction assistant. Parse the following natural language text and extract health status information.

User said: "${text}"

Extract the following fields if mentioned (use EXACTLY these values):
- water: "LOW" (dehydrated, little/no water) or "OK" (hydrated, drank water)
- food: "LOW" (skipped meals, hungry) or "OK" (ate properly)  
- sleep: "LOW" (bad sleep, less than 6 hours, tired) or "OK" (slept well, 7+ hours)
- exercise: "PENDING" (no exercise, skipped) or "DONE" (exercised, worked out)
- mentalLoad: "LOW" (calm, relaxed), "OK" (moderate stress), or "HIGH" (stressed, anxious, overwhelmed)

Respond ONLY with a JSON object containing only the fields that were clearly mentioned. Example:
{"water": "OK", "sleep": "LOW"}

If nothing health-related was mentioned, respond with: {}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text().trim();

        // Parse JSON from response
        let healthData = {};
        try {
            // Extract JSON from response (might have markdown code blocks)
            const jsonMatch = responseText.match(/\{[^}]*\}/);
            if (jsonMatch) {
                healthData = JSON.parse(jsonMatch[0]);
            }
        } catch (parseError) {
            console.error('Failed to parse AI response:', responseText);
        }

        res.json({
            success: true,
            health: healthData,
            parsed: Object.keys(healthData).length > 0
        });
    } catch (error) {
        console.error('Voice Parse Error:', error);
        res.status(500).json({ error: 'Failed to parse voice text' });
    }
});

// API Endpoint: Save Focus Session (PROTECTED)
app.post('/api/focus-session', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { duration } = req.body;

        if (!duration || typeof duration !== 'number' || duration < 60) {
            return res.status(400).json({ error: 'Valid duration required (min 60 seconds)' });
        }

        // Get today's log
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let todayLog = await HealthLog.findOne({
            userId,
            date: { $gte: today }
        });

        if (!todayLog) {
            // Create a new log for today if doesn't exist
            todayLog = new HealthLog({
                userId,
                date: new Date(),
                health: {},
                focusSessions: []
            });
        }

        // Add focus session
        if (!todayLog.focusSessions) {
            todayLog.focusSessions = [];
        }

        todayLog.focusSessions.push({
            duration,
            completedAt: new Date()
        });

        // Calculate total focus time for today
        const totalFocusMinutes = todayLog.focusSessions.reduce((sum, s) => sum + (s.duration / 60), 0);

        await todayLog.save();

        res.json({
            success: true,
            message: 'Focus session saved',
            todayStats: {
                sessions: todayLog.focusSessions.length,
                totalMinutes: Math.round(totalFocusMinutes)
            }
        });
    } catch (error) {
        console.error('Focus Session Error:', error);
        res.status(500).json({ error: 'Failed to save focus session' });
    }
});

// API Endpoint: Get Focus Stats (PROTECTED)
app.get('/api/focus-stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get last 7 days of focus sessions
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const logs = await HealthLog.find({
            userId,
            date: { $gte: weekAgo },
            focusSessions: { $exists: true, $ne: [] }
        }).sort({ date: -1 });

        const weeklyStats = {
            totalSessions: 0,
            totalMinutes: 0,
            dailyBreakdown: []
        };

        logs.forEach(log => {
            if (log.focusSessions && log.focusSessions.length > 0) {
                const dayMinutes = log.focusSessions.reduce((sum, s) => sum + (s.duration / 60), 0);
                weeklyStats.totalSessions += log.focusSessions.length;
                weeklyStats.totalMinutes += dayMinutes;
                weeklyStats.dailyBreakdown.push({
                    date: log.date,
                    sessions: log.focusSessions.length,
                    minutes: Math.round(dayMinutes)
                });
            }
        });

        weeklyStats.totalMinutes = Math.round(weeklyStats.totalMinutes);

        res.json(weeklyStats);
    } catch (error) {
        console.error('Focus Stats Error:', error);
        res.status(500).json({ error: 'Failed to get focus stats' });
    }
});

// ============================================
// PHASE 2: USER FEEDBACK SYSTEM
// ============================================
const Feedback = require('./src/models/Feedback');

// API Endpoint: Submit Feedback on AI Response (PROTECTED)
app.post('/api/feedback', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { rating, aiResponse, healthContext, comment } = req.body;

        if (!rating || !['helpful', 'not_helpful'].includes(rating)) {
            return res.status(400).json({ error: 'Valid rating required (helpful/not_helpful)' });
        }

        // Create feedback entry
        const feedback = new Feedback({
            userId,
            rating,
            aiResponse: aiResponse || {},
            healthContext: healthContext || {},
            comment: comment || null
        });

        await feedback.save();

        // Calculate user's feedback stats
        const userFeedback = await Feedback.find({ userId });
        const helpful = userFeedback.filter(f => f.rating === 'helpful').length;
        const total = userFeedback.length;

        res.json({
            success: true,
            message: 'Thank you for your feedback!',
            stats: {
                totalFeedback: total,
                helpfulCount: helpful,
                helpfulRate: total > 0 ? Math.round((helpful / total) * 100) : 0
            }
        });
    } catch (error) {
        console.error('Feedback Error:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});

// API Endpoint: Get Feedback Analytics (PROTECTED)
app.get('/api/feedback/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's feedback
        const feedback = await Feedback.find({ userId }).sort({ createdAt: -1 }).limit(100);

        if (feedback.length === 0) {
            return res.json({
                totalFeedback: 0,
                helpfulRate: 0,
                byCategory: {},
                recentFeedback: []
            });
        }

        // Calculate stats
        const helpful = feedback.filter(f => f.rating === 'helpful').length;
        const total = feedback.length;

        // Group by category
        const byCategory = {};
        feedback.forEach(f => {
            const cat = f.aiResponse?.category || 'general';
            if (!byCategory[cat]) {
                byCategory[cat] = { helpful: 0, total: 0 };
            }
            byCategory[cat].total++;
            if (f.rating === 'helpful') byCategory[cat].helpful++;
        });

        // Calculate category rates
        Object.keys(byCategory).forEach(cat => {
            byCategory[cat].rate = Math.round((byCategory[cat].helpful / byCategory[cat].total) * 100);
        });

        res.json({
            totalFeedback: total,
            helpfulCount: helpful,
            helpfulRate: Math.round((helpful / total) * 100),
            byCategory,
            recentFeedback: feedback.slice(0, 10).map(f => ({
                rating: f.rating,
                category: f.aiResponse?.category,
                action: f.aiResponse?.action,
                createdAt: f.createdAt
            }))
        });
    } catch (error) {
        console.error('Feedback Stats Error:', error);
        res.status(500).json({ error: 'Failed to get feedback stats' });
    }
});

// API Endpoint: Track if user followed advice (PROTECTED)
app.post('/api/feedback/:feedbackId/outcome', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { feedbackId } = req.params;
        const { followedAdvice, capacityChange, notes } = req.body;

        const feedback = await Feedback.findOneAndUpdate(
            { _id: feedbackId, userId },
            {
                followedAdvice,
                outcome: {
                    capacityChange: capacityChange || 0,
                    notes: notes || ''
                }
            },
            { new: true }
        );

        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({ success: true, feedback });
    } catch (error) {
        console.error('Outcome Error:', error);
        res.status(500).json({ error: 'Failed to update outcome' });
    }
});

// ============================================
// PHASE 3: GOALS & BASELINE
// ============================================

// API Endpoint: Get User Goals (PROTECTED)
app.get('/api/goals', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const goals = await getUserGoals(userId);
        res.json(goals || { targetSleepHours: 7, targetWaterLiters: 2, targetExerciseDays: 3, customGoals: [] });
    } catch (error) {
        console.error('Goals Error:', error);
        res.status(500).json({ error: 'Failed to get goals' });
    }
});

// API Endpoint: Update User Goals (PROTECTED)
app.put('/api/goals', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { targetSleepHours, targetWaterLiters, targetExerciseDays, customGoals } = req.body;

        const goals = {
            targetSleepHours: Math.max(4, Math.min(12, targetSleepHours || 7)),
            targetWaterLiters: Math.max(1, Math.min(5, targetWaterLiters || 2)),
            targetExerciseDays: Math.max(0, Math.min(7, targetExerciseDays || 3)),
            customGoals: customGoals || []
        };

        const updated = await updateUserGoals(userId, goals);
        res.json({ success: true, goals: updated });
    } catch (error) {
        console.error('Update Goals Error:', error);
        res.status(500).json({ error: 'Failed to update goals' });
    }
});

// API Endpoint: Get User Baseline (PROTECTED)
app.get('/api/baseline', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const baseline = await getBaseline(userId);

        if (!baseline) {
            return res.json({
                hasBaseline: false,
                message: 'Not enough data yet. Keep checking in daily!',
                dataPoints: 0
            });
        }

        res.json({
            hasBaseline: true,
            ...baseline
        });
    } catch (error) {
        console.error('Baseline Error:', error);
        res.status(500).json({ error: 'Failed to get baseline' });
    }
});

// API Endpoint: Recalculate Baseline (PROTECTED)
app.post('/api/baseline/recalculate', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const baseline = await calculateBaseline(userId);

        if (!baseline) {
            return res.json({
                success: false,
                message: 'Not enough data to calculate baseline (need at least 7 days)'
            });
        }

        res.json({ success: true, baseline });
    } catch (error) {
        console.error('Recalculate Baseline Error:', error);
        res.status(500).json({ error: 'Failed to recalculate baseline' });
    }
});

// API Endpoint: Compare to Baseline (PROTECTED)
app.post('/api/baseline/compare', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { capacity, health } = req.body;

        const comparison = await compareToBaseline(userId, capacity || 70, health || {});
        res.json(comparison);
    } catch (error) {
        console.error('Compare Baseline Error:', error);
        res.status(500).json({ error: 'Failed to compare to baseline' });
    }
});

// ============================================
// PHASE 4: INSIGHTS & ANALYTICS
// ============================================

// API Endpoint: Get Weekly Summary (PROTECTED)
app.get('/api/insights/weekly', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const summary = await generateWeeklySummary(userId);
        res.json(summary);
    } catch (error) {
        console.error('Weekly Summary Error:', error);
        res.status(500).json({ error: 'Failed to generate weekly summary' });
    }
});

// API Endpoint: Get Monthly Trends (PROTECTED)
app.get('/api/insights/monthly', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const trends = await getMonthlyTrends(userId);
        res.json(trends);
    } catch (error) {
        console.error('Monthly Trends Error:', error);
        res.status(500).json({ error: 'Failed to get monthly trends' });
    }
});

// ============================================
// PHASE 5: ENGAGEMENT & POLISH
// ============================================

// API Endpoint: Get Smart Reminder (PROTECTED)
app.get('/api/reminder', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const reminder = await getSmartReminder(userId);
        res.json(reminder);
    } catch (error) {
        console.error('Reminder Error:', error);
        res.status(500).json({ error: 'Failed to get reminder' });
    }
});

// API Endpoint: Get Achievements (PROTECTED) - Now with AI motivation
app.get('/api/achievements', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await getUserAchievements(userId);
        // Return in format frontend expects
        res.json({
            achievements: result.badges || [],
            aiMotivation: result.aiMotivation,
            stats: result.stats
        });
    } catch (error) {
        console.error('Achievements Error:', error);
        res.status(500).json({ error: 'Failed to get achievements' });
    }
});

// API Endpoint: Get AI Goal Suggestions (PROTECTED)
app.get('/api/goals/ai-suggestions', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const suggestions = await generateAIGoalSuggestions(userId);
        res.json(suggestions || { hasEnoughData: false, message: 'AI not available' });
    } catch (error) {
        console.error('AI Goal Suggestions Error:', error);
        res.status(500).json({ error: 'Failed to get AI suggestions' });
    }
});

// API Endpoint: Get AI Trend Analysis (PROTECTED)
app.get('/api/analytics/ai-trends', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const trends = await generateAITrendAnalysis(userId);
        res.json(trends || { hasEnoughData: false });
    } catch (error) {
        console.error('AI Trend Analysis Error:', error);
        res.status(500).json({ error: 'Failed to get AI trends' });
    }
});

// API Endpoint: Get Time Context (PROTECTED)
app.get('/api/time-context', authMiddleware, async (req, res) => {
    try {
        const context = getTimeOfDayContext();
        res.json(context);
    } catch (error) {
        console.error('Time Context Error:', error);
        res.status(500).json({ error: 'Failed to get time context' });
    }
});

// API Endpoint: Get Streak Status (PROTECTED)
app.get('/api/streak', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const streak = await calculateStreakStatus(userId);
        res.json(streak);
    } catch (error) {
        console.error('Streak Error:', error);
        res.status(500).json({ error: 'Failed to get streak' });
    }
});

// API Endpoint: Parse Voice Command (PROTECTED)
app.post('/api/ai/parse-voice', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text required' });

        const parsedData = await aiService.parseVoiceHealthLog(text);

        if (parsedData) {
            res.json({ success: true, health: parsedData });
        } else {
            res.status(500).json({ success: false, error: 'AI failed to parse' });
        }
    } catch (error) {
        console.error('Voice Route Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API Endpoint: Save Focus Session (PROTECTED)
app.post('/api/focus', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { duration } = req.body; // seconds

        if (!duration || duration < 60) {
            return res.status(400).json({ error: 'Invalid duration' });
        }

        const session = new FocusSession({
            userId,
            duration,
            completedAt: new Date()
        });

        await session.save();

        // Return today's stats for immediate UI update
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sessions = await FocusSession.find({
            userId,
            completedAt: { $gte: today }
        });

        const totalMinutes = Math.round(sessions.reduce((acc, s) => acc + s.duration, 0) / 60);

        res.json({
            success: true,
            todayStats: {
                sessions: sessions.length,
                totalMinutes
            }
        });
    } catch (error) {
        console.error('Save Focus Session Error:', error);
        res.status(500).json({ error: 'Failed to save session' });
    }
});

// DEBUG: Test Memory Integration
app.get('/api/debug/memory', async (req, res) => {
    try {
        const userId = 'debug_user'; // Fake ID for public test
        console.log(`Debug Memory: Testing for user ${userId}`);

        // 1. Test Query
        const results = await queryMemory('patterns stress sleep', userId, 5);

        // 2. Look for Health Logs
        const logs = await HealthLog.find({ userId: userId }).sort({ date: -1 }).limit(1);
        const currentHealth = logs[0]?.health || "No Logs";

        res.json({
            success: true,
            userId,
            queryResults: results,
            resultCount: results.length,
            currentHealth,
            environment: {
                hasKey: !!process.env.SUPERMEMORY_API_KEY
            }
        });
    } catch (error) {
        console.error('Debug Memory Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// API Endpoint: Get Focus Stats (PROTECTED)
app.get('/api/focus/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Weekly Stats (Current Week)
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const weeklySessions = await FocusSession.find({
            userId,
            completedAt: { $gte: startOfWeek }
        });

        const totalSessions = weeklySessions.length;
        const totalMinutes = Math.round(weeklySessions.reduce((acc, s) => acc + s.duration, 0) / 60);

        res.json({
            totalSessions,
            totalMinutes
        });
    } catch (error) {
        console.error('Get Focus Stats Error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`Caretaker AI Server running on port ${PORT}`);
});
