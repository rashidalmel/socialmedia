const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// HTTPS redirect middleware (production only)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(301, `https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Rate limiting - General API protection
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window per IP
    message: {
        error: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiting for authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 5, // 5 login attempts per window
    message: {
        error: 'Too many login attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});

// Basic middleware
app.use(cookieParser()); // Parse cookies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Prevent NoSQL injection attacks
app.use(mongoSanitize());

// Prevent XSS attacks by cleaning user input
app.use(xss());

// Prevent HTTP Parameter Pollution attacks
app.use(hpp({
    whitelist: ['sort', 'fields', 'page', 'limit'] // Allow these params to have multiple values
}));

// Security headers with enhanced configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "ui-avatars.com"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Apply strict rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS configuration with enhanced security
const allowedOrigins = [
  'http://localhost:3000',
  'https://socialmedia-grzl.vercel.app' // <-- Add this line
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.options('*', cors({
  origin: allowedOrigins,
  credentials: true
}));

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Add caching headers for better performance
app.use((req, res, next) => {
    // Cache static assets for 1 hour
    if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    // Cache API responses for 5 minutes (except auth endpoints)
    else if (req.url.startsWith('/api/') && !req.url.startsWith('/api/auth/')) {
        res.setHeader('Cache-Control', 'public, max-age=300');
    }
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Basic test route
app.get('/', (req, res) => {
  res.send('Social Media Backend API is running');
});

// Serve frontend
if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    // Serve static files from React build
    app.use(express.static(path.join(__dirname, '../frontend/build')));

    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
    });
}

// Error handling middleware with security considerations
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ 
            message: 'Internal server error',
            error: 'Something went wrong on our end'
        });
    } else {
        res.status(500).json({ 
            message: 'Something went wrong!',
            error: err.message,
            stack: err.stack
        });
    }
});

const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
