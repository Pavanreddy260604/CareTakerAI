const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The AI response that was rated
    aiResponse: {
        action: String,
        explanation: String,
        urgency: String,
        confidence: Number,
        category: String
    },
    // User's health state when this advice was given
    healthContext: {
        water: String,
        food: String,
        sleep: String,
        exercise: String,
        mentalLoad: String,
        capacity: Number
    },
    // User's feedback
    rating: {
        type: String,
        enum: ['helpful', 'not_helpful'],
        required: true
    },
    // Optional text feedback
    comment: {
        type: String,
        maxlength: 500
    },
    // Did user follow the advice? (tracked later)
    followedAdvice: {
        type: Boolean,
        default: null
    },
    // Outcome after following (or not following)
    outcome: {
        capacityChange: Number,  // +/- change in capacity next day
        notes: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for analytics queries
FeedbackSchema.index({ userId: 1, createdAt: -1 });
FeedbackSchema.index({ rating: 1, createdAt: -1 });
FeedbackSchema.index({ 'aiResponse.category': 1, rating: 1 });
FeedbackSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
