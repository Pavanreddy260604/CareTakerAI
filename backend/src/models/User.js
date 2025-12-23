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
    }
});

module.exports = mongoose.model('User', UserSchema);
