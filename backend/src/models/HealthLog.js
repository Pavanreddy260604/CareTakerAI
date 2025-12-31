const mongoose = require('mongoose');

const HealthLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    health: {
        water: { type: String, enum: ['LOW', 'OK'], default: 'OK' },
        food: { type: String, enum: ['LOW', 'OK'], default: 'OK' },
        sleep: { type: String, enum: ['LOW', 'OK'], default: 'OK' },
        exercise: { type: String, enum: ['PENDING', 'DONE'], default: 'PENDING' },
        mentalLoad: { type: String, enum: ['LOW', 'OK', 'HIGH'], default: 'OK' }
    },
    aiResponse: {
        systemStatus: String,
        action: String,
        explanation: String
    },
    streakDay: {
        type: Number,
        default: 1
    },
    // Actual values for analytics (not just OK/LOW status)
    hydrationAmount: { type: Number, default: 0 },      // ml consumed at check-in
    hydrationGoal: { type: Number, default: 2000 },     // ml target
    capacityScore: { type: Number, default: null },     // Capacity at check-in time
    // Focus Timer sessions
    focusSessions: [{
        duration: { type: Number, required: true }, // in seconds
        completedAt: { type: Date, default: Date.now }
    }]
});

// Index for efficient queries by user and date
HealthLogSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('HealthLog', HealthLogSchema);
