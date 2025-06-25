const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
if (process.env.NODE_ENV === 'production') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                mediaSrc: ["'self'", "data:", "blob:"],
                imgSrc: ["'self'", "data:", "https:"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "https:", "'unsafe-inline'"],
                fontSrc: ["'self'", "https:", "data:"],
                connectSrc: ["'self'"],
                upgradeInsecureRequests: []
            }
        },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true
        }
    }));
} else {
    // Development: Use minimal helmet configuration to avoid HTTPS enforcement
    app.use(helmet({
        contentSecurityPolicy: false, // Disable CSP in development
        hsts: false, // Disable HSTS in development
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
        crossOriginEmbedderPolicy: false
    }));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? 'https://yourdomain.com'
        : (origin, callback) => {
            // In development, allow all origins (including different devices on same network)
            // Log the origin for debugging
            console.log('🌐 CORS request from origin:', origin || 'No origin header');
            callback(null, true);
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    preflightContinue: false,
    maxAge: 86400 // Cache preflight for 24 hours
}));

// Additional CORS headers for network access
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
        // Set CORS headers for all requests to ensure consistency
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, Cache-Control, Pragma');
        res.header('Access-Control-Max-Age', '86400'); // 24 hours
        res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
        res.header('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');

        // Prevent caching of CORS responses
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');

        // Log CORS requests for debugging with more context
        const requestSource = origin || referer || 'direct access';
        const timestamp = new Date().toISOString();

        if (req.method === 'OPTIONS') {
            console.log(`🔧 [${timestamp}] CORS Preflight: ${req.method} ${req.url} from ${requestSource}`);
            return res.status(200).end();
        }

        console.log(`🌐 [${timestamp}] CORS Request: ${req.method} ${req.url} from ${requestSource}`);
    }

    next();
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Keep-alive and connection handling for network devices
app.use((req, res, next) => {
    // Set keep-alive headers to maintain connection stability
    res.header('Connection', 'keep-alive');
    res.header('Keep-Alive', 'timeout=30, max=1000');

    // Add server identification for debugging
    res.header('X-Powered-By', 'AI-Creative-Builder');
    res.header('X-Server-Time', new Date().toISOString());

    next();
});

// Serve static files with enhanced CORS headers
app.use('/uploads', (req, res, next) => {
    const origin = req.headers.origin;

    // Set comprehensive CORS headers for static files
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    res.header('Accept-Ranges', 'bytes');
    res.header('Vary', 'Origin, Accept-Encoding');

    // Override the restrictive CORP header set by helmet
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

    // Prevent caching issues
    res.header('Cache-Control', 'public, max-age=86400');

    // Handle preflight requests for static files
    if (req.method === 'OPTIONS') {
        const timestamp = new Date().toISOString();
        console.log(`🔧 [${timestamp}] Static file preflight: ${req.url} from ${origin || 'direct access'}`);
        return res.status(200).end();
    }

    const timestamp = new Date().toISOString();
    console.log(`📁 [${timestamp}] Static file request: ${req.url} from ${origin || 'direct access'}`);
    next();
}, express.static(path.join(__dirname, '../uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const videoRoutes = require('./routes/videos');
const scriptRoutes = require('./routes/scripts');
const voiceRoutes = require('./routes/voices');
const compositionRoutes = require('./routes/compositions');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/compositions', compositionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Server accessible at:`);
    console.log(`   - Local: http://localhost:${PORT}`);
    console.log(`   - Network: http://0.0.0.0:${PORT}`);

    // Initialize TikTok Caption Service
    try {
        console.log('🎬 Initializing TikTok Caption Service...');
        const tiktokCaptionService = require('./utils/tiktokCaptionService');
        await tiktokCaptionService.initialize();
        console.log('✅ TikTok Caption Service initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize TikTok Caption Service:', error);
        console.log('⚠️ TikTok captions will not be available');
    }

    // Get network IP for other devices
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = {};

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }

    const networkIP = Object.values(results).flat()[0];
    if (networkIP) {
        console.log(`📱 For other devices on network: http://${networkIP}:${PORT}`);
        console.log(`📱 React app should use: http://${networkIP}:3000`);
    }
});

// Configure server keep-alive settings for better network device support
server.keepAliveTimeout = 30000; // 30 seconds
server.headersTimeout = 35000; // 35 seconds (slightly higher than keepAliveTimeout)
server.timeout = 120000; // 2 minutes

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
