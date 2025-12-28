const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    duration: {
        type: Number, // in seconds
        required: true
    },
    completedAt: {
        type: Date,
        default: Date.now
    },
    category: {
        type: String,
        enum: ['focus', 'break'],
        default: 'focus'
    }
});

// Index for retrieving sessions by date range and user
focusSessionSchema.index({ userId: 1, completedAt: -1 });
focusSessionSchema.index({ completedAt: 1 });

module.exports = mongoose.model('FocusSession', focusSessionSchema);
