//splitsy backend server - express.js api with mongodb
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;

// connect to mongodb
const connectDB = async () => {
  try {
    // If MONGODB_URI already contains a database name, use it as-is.
    // Otherwise append '/splitsy' before any query string.
    const rawUri = process.env.MONGODB_URI;
    if (!rawUri) throw new Error('MONGODB_URI is not set in environment');

    const [base, query] = rawUri.split('?');
    // Check if base already contains a path like '/dbname'
    const hasDbInPath = /\/[^\/]+$/.test(base);

    const finalUri = hasDbInPath ? rawUri : `${base.replace(/\/$/, '')}/splitsy${query ? ('?' + query) : ''}`;

    await mongoose.connect(finalUri);
    console.log('MongoDB connected to', hasDbInPath ? 'configured database (from MONGODB_URI)' : 'database: splitsy');
  } catch (err) {
    console.error('DB connect failed', err);
    throw err;
  }
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