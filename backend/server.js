//splitsy backend server - express.js api with mongodb
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const app = require('./app');
// No automatic in-memory fallback: require a real MongoDB in non-dev/production.

const PORT = process.env.PORT || 3000;

// connect to mongodb
const connectDB = async () => {
  // Helper to normalize DB URI (append /splitsy if no DB path present)
  const normalize = (rawUri) => {
    if (!rawUri) return null;
    const [base, query] = rawUri.split('?');
    const hasDbInPath = /\/[^\/]+$/.test(base);
    return { finalUri: hasDbInPath ? rawUri : `${base.replace(/\/$/, '')}/splitsy${query ? ('?' + query) : ''}`, hasDbInPath };
  };

  // Try primary configured URI
  const rawPrimary = process.env.MONGODB_URI;
  if (rawPrimary) {
    // Log a redacted version of the URI so operators can see host/db without secrets
    try {
      const u = new URL(rawPrimary);
      console.log('Attempting MongoDB connection to host:', u.host, 'db/path:', u.pathname || '/');
    } catch (e) {
      // If URL parsing fails (e.g., mongodb+srv or missing protocol), show a safe redacted preview
      const preview = rawPrimary.replace(/:\/\/.+?:.+?@/, '://<user>:<pass>@');
      console.log('Attempting MongoDB connection to (redacted):', preview);
    }
    const { finalUri, hasDbInPath } = normalize(rawPrimary);
    try {
      await mongoose.connect(finalUri);
      console.log('MongoDB connected to', hasDbInPath ? 'configured database (from MONGODB_URI)' : 'database: splitsy');
      return;
    } catch (err) {
      console.error('DB connect failed (primary MONGODB_URI)', err && err.message ? err.message : err);
      // fall through to fallback attempts
    }
  } else {
    console.warn('MONGODB_URI is not set; attempting fallback options');
  }

  // Try explicit fallback env var if provided (useful if you have a separate dev URI)
  const rawFallback = process.env.MONGODB_URI_FALLBACK;
  if (rawFallback) {
    const { finalUri, hasDbInPath } = normalize(rawFallback);
    try {
      await mongoose.connect(finalUri);
      console.log('MongoDB connected to', hasDbInPath ? 'configured database (from MONGODB_URI_FALLBACK)' : 'database: splitsy (from fallback)');
      return;
    } catch (err) {
      console.error('DB connect failed (MONGODB_URI_FALLBACK)', err && err.message ? err.message : err);
      // fall through to throwing below
    }
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
  serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`);
  });

  // Attach an error handler to avoid an unhandled exception if the port is in use.
  serverInstance.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Another process is listening on this port.`);
      console.error('If you intended to run a second server, change PORT in your .env or stop the other process.');
      // Graceful shutdown of mongoose connection then exit
      mongoose.connection.close(false).finally(() => process.exit(1));
    } else {
      console.error('Server error', err);
      mongoose.connection.close(false).finally(() => process.exit(1));
    }
  });

  return serverInstance;
};

const stopServer = async () => {
  try {
    if (serverInstance) serverInstance.close();
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