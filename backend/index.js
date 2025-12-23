/**
 * backend/index.js
 * Main API Server (Entry Point)
 */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Config
const connectDB = require('./src/config/db');

// Models
const User = require('./src/models/User');
const HealthLog = require('./src/models/HealthLog');

// Services
const { isRecoveryRequired, getHighestPriorityAction, getContinuityState, calculateBiologicalMetrics, generateDecision } = require('./src/services/rulesService');
const { processHealthData } = require('./src/services/aiService');
const { addMemory, queryMemory, storeWeeklyReflection } = require('./src/services/memoryService');
const { getEngagementData } = require('./src/services/engagementService');
const { getFullAnalytics } = require('./src/services/analyticsService');

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
            metrics: decisionObject.decision // Use proper decision object
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

app.listen(PORT, () => {
    console.log(`Caretaker AI Server running on port ${PORT}`);
});
