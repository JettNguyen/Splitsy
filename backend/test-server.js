const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Mock data for testing without MongoDB
const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Test User',
  email: 'test@example.com',
  avatar: null,
  paymentMethods: []
};

const mockGroup = {
  _id: '507f1f77bcf86cd799439012',
  name: 'Test Group',
  description: 'A test group for demo',
  members: [
    { userId: mockUser._id, role: 'admin', joinedAt: new Date() }
  ],
  totalExpenses: 0,
  settledAmount: 0,
  createdBy: mockUser._id,
  createdAt: new Date()
};

// Simple health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Splitsy Backend API is running! 🚀',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// Mock API endpoints for testing
app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: { user: mockUser },
    message: 'Mock user data (backend running without MongoDB)'
  });
});

app.get('/api/groups', (req, res) => {
  res.json({
    success: true,
    data: { groups: [mockGroup] },
    message: 'Mock groups data (backend running without MongoDB)'
  });
});

app.get('/api/transactions/group/:groupId', (req, res) => {
  res.json({
    success: true,
    data: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    message: 'Mock transactions data (backend running without MongoDB)'
  });
});

// Catch all for unmatched routes
app.use('*', (req, res) => {
  res.status(200).json({
    success: true,
    message: `Backend is running! MongoDB not connected, but API structure is working.`,
    method: req.method,
    url: req.originalUrl,
    note: 'This is a test endpoint. Connect MongoDB to enable full functionality.'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🎉 Splitsy Test Backend Started!');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('💡 This is a minimal test server that works WITHOUT MongoDB');
  console.log('💡 To enable full functionality:');
  console.log('   1. Set up MongoDB (see MONGODB_SETUP_GUIDE.md)');
  console.log('   2. Run: cd backend && node server.js');
  console.log('');
  console.log('🔗 Available test endpoints:');
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/api/auth/me`);
  console.log(`   GET  http://localhost:${PORT}/api/groups`);
  console.log(`   GET  http://localhost:${PORT}/api/transactions/group/123`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});