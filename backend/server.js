//splitsy backend server - express.js api with mongodb
const path = require('path');

// Try to load validator mitigation as early as possible. In fresh clones the
// utils file might be missing if it wasn't committed; log a clear message so
// developers see the cause instead of a cryptic module-not-found from deeper
// requires. This does not throw — it logs and continues so the server can
// start (or fail later) with a clear diagnostic.
try {
  const mitigationPath = path.join(__dirname, 'utils', 'validator-mitigation.js');
  require(mitigationPath);
  console.log('Loaded validator mitigation from', mitigationPath);
} catch (err) {
  console.warn('validator mitigation not found at backend/utils/validator-mitigation.js — continuing without it');
}

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

//route imports
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const transactionRoutes = require('./routes/transactions');
const friendsRoutes = require('./routes/friends');

const app = express();

const PORT = process.env.PORT || 3000;

// connect to mongodb
const connectDB = async () => {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    console.log('Full URI with database:', process.env.MONGODB_URI + '/splitsy');
    const conn = await mongoose.connect(process.env.MONGODB_URI + '/splitsy');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.db.databaseName}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

//security middleware
app.use(helmet({
  contentSecurityPolicy: false //disable for development
}));

//rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, //15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, //limit each ip to 100 requests per windowms
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, //return rate limit info in the `ratelimit-*` headers
  legacyHeaders: false, //disable the `x-ratelimit-*` headers
});

app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      `http://${process.env.IP_ADDRESS}:${process.env.PORT}`,
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:19006', // Expo web
      `exp://${process.env.IP_ADDRESS}:8081`,
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

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', friendsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Splitsy API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Mongoose validation error
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

  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: This origin is not allowed'
    });
  }

  // No in-memory fallback: fail loudly so operator can fix credentials/network.
  const e = new Error('Unable to connect to MongoDB using provided URIs. Check MONGODB_URI, MONGODB_URI_FALLBACK, credentials, and network access.');
  e.hint = 'If running locally, ensure your Atlas IP whitelist includes your client IP and any special characters in the password are URL-encoded.';
  throw e;
};

let serverInstance = null;

const startServer = async () => {
  // If server already started (e.g. called twice during tests), return it
  if (serverInstance && serverInstance.listening) {
    console.log('Server already running');
    return serverInstance;
  }

  await connectDB();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`📱 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🌐 Network access: http://${process.env.IP_ADDRESS}:${PORT}/api`);  // Use the hardcoded IP
  });

  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

    switch (error.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Graceful shutdown initiated...');
  try {
    await mongoose.connection.close();
    console.log('Server stopped');
  } catch (err) {
    console.error('Error stopping server', err);
  }
};

if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}

module.exports = { startServer, stopServer, app };