const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Check for token in Authorization header or HTTP-only cookie
        let token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        const secret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
        
        const decoded = jwt.verify(token, secret, {
            issuer: 'social-media-app',
            audience: 'social-media-users'
        });
        
        // Verify token type
        if (decoded.type && decoded.type !== 'access') {
            return res.status(401).json({ message: 'Invalid token type' });
        }
        
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'Token is not valid - user not found' });
        }

        // Add user info to request
        req.user = {
            id: user._id,
            username: user.username,
            email: user.email
        };
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        console.error('Auth middleware error:', error);
        res.status(500).json({ message: 'Server error during authentication' });
    }
};

module.exports = auth;
