const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: false // Optional if using Google Auth
    },
    googleId: {
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    settings: {
        mode: {
            type: String,
            enum: ['CARETAKER', 'OBSERVER'],
            default: 'CARETAKER'
        }
    },
    // PHASE 3: Personal Goals
    goals: {
        targetSleepHours: {
            type: Number,
            default: 7,
            min: 4,
            max: 12
        },
        targetWaterLiters: {
            type: Number,
            default: 2,
            min: 1,
            max: 5
        },
        targetExerciseDays: {
            type: Number,
            default: 3,
            min: 0,
            max: 7
        },
        // Custom goals array for flexibility
        customGoals: [{
            name: String,
            target: Number,
            current: { type: Number, default: 0 },
            unit: String,
            createdAt: { type: Date, default: Date.now }
        }]
    },
    // PHASE 3: Personal Baseline (calculated from history)
    baseline: {
        // Average metrics from last 30 days
        avgCapacity: { type: Number, default: 70 },
        avgSleepQuality: { type: Number, default: 0.7 }, // 0-1 ratio of OK days
        avgHydration: { type: Number, default: 0.7 },
        avgExercise: { type: Number, default: 0.5 }, // ratio of exercise days
        avgStress: { type: Number, default: 0.3 }, // ratio of HIGH stress days
        // What's "normal" for this user (percentile thresholds)
        lowCapacityThreshold: { type: Number, default: 45 }, // Below this = concerning
        // Last updated
        lastCalculated: { type: Date, default: null },
        dataPoints: { type: Number, default: 0 } // How many days of data
    }
});

module.exports = mongoose.model('User', UserSchema);
