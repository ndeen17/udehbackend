import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import compression from 'compression';
import path from 'path';
import connectDB from './config/database';
import { apiRateLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

// Import routes
import apiRoutes from './routes/index';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:8080', // Vite dev server
    process.env.ADMIN_URL || 'http://localhost:3001'
  ],
  credentials: true,
}));
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Body parser for JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Body parser for URL encoded

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Apply rate limiting to API routes
app.use('/api', apiRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'UDEH GLOBAL Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/v1', apiRoutes);

// 404 handler - temporarily commented out due to path-to-regexp issue
// app.all('*', (req, res) => {
//   res.status(404).json({
//     error: 'Route not found',
//     message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
//   });
// });

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((error: any) => error.message);
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: 'Duplicate Error',
      message: `${field} already exists`,
    });
  }

  // JWT errors
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

  // Default error
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

export default app;