// Apply runtime mitigations for known upstream advisories before loading validation libs
// The mitigation file is optional for fresh clones; load it if present and warn if missing.
try {
  require('./utils/validator-mitigation');
} catch (err) {
  console.warn('validator mitigation not found at backend/utils/validator-mitigation.js — continuing without it');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// route imports
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const transactionRoutes = require('./routes/transactions');
const friendsRoutes = require('./routes/friends');

const app = express();


// security middleware
app.use(helmet({ contentSecurityPolicy: false }));

// rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// CORS (relaxed in app; server can override if needed)
app.use(cors({ origin: true, credentials: true }));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Development-only request logger (keeps production logs quiet)
if ((process.env.NODE_ENV || 'development') === 'development') {
  app.use((req, res, next) => {
    // Keep this concise to avoid noisy logs in development
    console.debug && console.debug(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', friendsRoutes);

// Health
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Splitsy API is running', timestamp: new Date().toISOString() });
});

// Global error handler (basic)
app.use((err, req, res, next) => {
  console.error('App error handler:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

module.exports = app;
