const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token with enhanced security
const generateToken = (id) => {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
    
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret-key-change-in-production') {
        console.warn('⚠️  WARNING: Using fallback JWT secret. Set JWT_SECRET environment variable!');
    }
    
    return jwt.sign(
        { 
            id,
            iat: Math.floor(Date.now() / 1000),
            type: 'access'
        }, 
        secret, 
        {
            expiresIn: '1h', // Reduced token lifetime for better security
            issuer: 'social-media-app',
            audience: 'social-media-users'
        }
    );
};

// Generate refresh token
const generateRefreshToken = (id) => {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-refresh-secret';
    
    return jwt.sign(
        { 
            id,
            type: 'refresh'
        },
        secret,
        {
            expiresIn: '7d',
            issuer: 'social-media-app',
            audience: 'social-media-users'
        }
    );
};

// Register user
const register = async (req, res) => {
    try {
        console.log('Register request:', req.body);
        
        const { username, email, password } = req.body;

        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ 
                message: 'Please provide username, email, and password' 
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (userExists) {
            return res.status(400).json({ 
                message: 'User with this email or username already exists' 
            });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password
        });

        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Set secure HTTP-only cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000 // 1 hour
        };

        const refreshCookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/auth/refresh'
        };

        res.cookie('token', token, cookieOptions);
        res.cookie('refreshToken', refreshToken, refreshCookieOptions);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio
            },
            token,
            expiresIn: '1h'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Server error during registration',
            error: error.message
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        console.log('Login request received:', req.body);
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            console.warn('Missing email or password:', { email, password });
            return res.status(400).json({ 
                message: 'Please provide email and password' 
            });
        }

        // Check if user exists
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            console.warn('User not found for email:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        } else {
            console.log('User found:', user.email);
        }

        // Check password
        let isMatch = false;
        try {
            isMatch = await user.comparePassword(password);
            console.log('Password comparison result:', isMatch);
        } catch (err) {
            console.error('Error comparing password:', err);
            return res.status(500).json({ message: 'Error comparing password', error: err.message });
        }
        if (!isMatch) {
            console.warn('Password does not match for user:', user.email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Set secure HTTP-only cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000 // 1 hour
        };

        const refreshCookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/auth/refresh'
        };

        res.cookie('token', token, cookieOptions);
        res.cookie('refreshToken', refreshToken, refreshCookieOptions);

        console.log('Login successful for:', user.email);

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio
            },
            token,
            expiresIn: '1h'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error during login',
            error: error.message
        });
    }
};

// Get current user
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            createdAt: user.createdAt
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ 
            message: 'Server error while fetching user data',
            error: error.message
        });
    }
};

// Refresh token endpoint
const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ message: 'No refresh token provided' });
        }

        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-refresh-secret';
        const decoded = jwt.verify(refreshToken, secret);
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const newToken = generateToken(user._id);
        
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000 // 1 hour
        };

        res.cookie('token', newToken, cookieOptions);

        res.json({
            message: 'Token refreshed successfully',
            token: newToken,
            expiresIn: '1h'
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ 
            message: 'Invalid refresh token'
        });
    }
};

// Logout user
const logout = async (req, res) => {
    try {
        // Clear HTTP-only cookies
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/auth/refresh'
        });

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            message: 'Server error during logout'
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
    refreshToken,
    logout
};
