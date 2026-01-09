import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import authRoutes from './routes/auth.js';
import solvesRoutes from './routes/solves.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable CSP for development; enable in production
}));

// Rate limiting - General API limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Apply general rate limiting to all requests
app.use('/api/', generalLimiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Prevent HTTP Parameter Pollution attacks
app.use(hpp());

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://rubics-cube-7a23.vercel.app',
  'https://rubics-cube-three.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing with size limits
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging middleware with structured format
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress
    }));
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/solves', solvesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'RubikSight API is running',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RubikSight API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        verify: 'POST /api/auth/verify',
        solve: 'POST /api/auth/solve'
      },
      solves: {
        list: 'GET /api/solves',
        create: 'POST /api/solves',
        stats: 'GET /api/solves/stats',
        get: 'GET /api/solves/:id',
        complete: 'PATCH /api/solves/:id/complete',
        delete: 'DELETE /api/solves/:id'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // MongoDB connection options
    const mongoOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    console.log('✅ Connected to MongoDB');

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`   Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`   API Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.log('\n📋 To fix this:');
    console.log('   1. Make sure MongoDB is installed and running');
    console.log('      - macOS: brew services start mongodb-community');
    console.log('      - Or use MongoDB Atlas (cloud): https://www.mongodb.com/atlas');
    console.log('   2. Update MONGODB_URI in server/.env file');
    console.log('\n   Starting server without database (auth will fail)...\n');
    
    // Start server anyway for development
    app.listen(PORT, () => {
      console.log(`⚠️  Server running on port ${PORT} (MongoDB not connected)`);
    });
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// For Vercel serverless deployment
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  
  try {
    const mongoOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
  }
};

// Connect to DB on cold start for serverless
connectDB();

// Only start the server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  startServer();
}

// Export for Vercel serverless functions
export default app;
