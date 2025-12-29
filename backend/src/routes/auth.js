const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Input validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateRegistration = (name, email, password) => {
    const errors = [];
    if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters');
    if (!email || !EMAIL_REGEX.test(email)) errors.push('Valid email is required');
    if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
    return errors;
};

// JWT Expiry: 8 hours (production-safe)
const JWT_EXPIRY = '8h';

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    // Input validation
    const validationErrors = validateRegistration(name, email, password);
    if (validationErrors.length > 0) {
        return res.status(400).json({ msg: validationErrors.join(', ') });
    }

    try {
        let user = await User.findOne({ email: email.toLowerCase().trim() });

        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRY },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRY },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/google
// @desc    Google Sign-in
// @access  Public
router.post('/google', async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const { name, email, sub } = ticket.getPayload();

        if (!email) {
            return res.status(400).json({ msg: 'Google account missing email' });
        }

        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
            // SECURITY: Prevent account takeover - don't link if password exists
            if (user.password && !user.googleId) {
                return res.status(400).json({
                    msg: 'Email already registered. Please login with password or use a different Google account.'
                });
            }
            // Update googleId if not set
            if (!user.googleId) {
                user.googleId = sub;
                await user.save();
            }
        } else {
            // Create new user
            user = new User({
                name,
                email: email.toLowerCase(),
                googleId: sub
                // No password field for Google-only users
            });
            await user.save();
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRY },
            (err, jwtToken) => {
                if (err) throw err;
                res.json({ token: jwtToken });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
