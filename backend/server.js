const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// route imports
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const requestRoutes = require('./routes/requests');
const friendRoutes = require('./routes/friends');
const transactionRoutes = require('./routes/transactions');

const app = express();
const PORT = process.env.PORT || 3000;

// connect to mongodb
const connectDB = async () => {
  try {
  // connect to mongodb (uri hidden in logs to avoid leaking credentials)
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  console.info(`MongoDB connected: host=${conn.connection.host}, db=${conn.connection.db.databaseName}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// security middleware
app.use(helmet({
  contentSecurityPolicy: false // disable for development
}));

// rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each ip to 100 requests per windowms
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // return rate limit info in the `ratelimit-*` headers
  legacyHeaders: false, // disable the `x-ratelimit-*` headers
});

app.use(limiter);

// cors configuration
const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:19006', // Expo web
      'exp://192.168.0.38:8081', // Expo development
      'exp://192.168.0.38:8082',
      'http://192.168.0.38:8081', // Direct IP access
      'http://192.168.0.38:8082',
      'http://192.168.0.38:19006'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Splitsy API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// api routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', requestRoutes);
app.use('/api/users', friendRoutes);

// global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }

  // mongoose cast error (invalid objectid)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // cors error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: This origin is not allowed'
    });
  }

  // jwt errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // default server error
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// start server
const startServer = async () => {
  await connectDB();
  
  const server = app.listen(PORT, () => {
  const actualPort = server.address().port;
  console.info(`Server running in ${process.env.NODE_ENV || 'development'} on port ${actualPort}`);
  });
};

// handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  // close server & exit process
  process.exit(1);
});

// handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nGraceful shutdown initiated...');
  try {
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});