"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("./config/database"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const cloudinary_1 = require("./config/cloudinary");
dotenv_1.default.config();
const index_1 = __importDefault(require("./routes/index"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
(0, database_1.default)();
(0, cloudinary_1.verifyCloudinaryConfig)();
const RENDER_URL = process.env.RENDER_URL;
if (RENDER_URL && process.env.NODE_ENV === 'production') {
    const PING_INTERVAL = 14 * 60 * 1000;
    setInterval(async () => {
        try {
            const response = await fetch(`${RENDER_URL}/health`);
            console.log(`✅ Self-ping successful: ${response.status}`);
        }
        catch (error) {
            console.error('❌ Self-ping failed:', error);
        }
    }, PING_INTERVAL);
    console.log('🔄 Self-ping mechanism enabled to prevent instance spin-down');
}
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:5173',
    process.env.ADMIN_URL || 'http://localhost:3001',
    'https://www.udehglobal.com',
    'https://udehglobal.com',
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-ID'],
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'public', 'uploads')));
app.use('/api', rateLimiter_1.apiRateLimiter);
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'UDEH GLOBAL Backend is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.use('/api/v1', index_1.default);
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((error) => error.message);
        return res.status(400).json({
            error: 'Validation Error',
            messages: errors,
        });
    }
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            error: 'Duplicate Error',
            message: `${field} already exists`,
        });
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid Token',
            message: 'Please login again',
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token Expired',
            message: 'Please login again',
        });
    }
    res.status(err.statusCode || 500).json({
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
exports.default = app;
