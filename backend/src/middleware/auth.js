const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header (supports both 'Bearer <token>' and raw token)
    let token = req.header('Authorization');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Strip 'Bearer ' prefix if present
    if (token.startsWith('Bearer ')) {
        token = token.slice(7);
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
