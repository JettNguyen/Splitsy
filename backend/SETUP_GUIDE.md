# Splitsy MongoDB Backend Setup Guide

This guide will help you set up the MongoDB backend for the Splitsy expense splitting app.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js 16+** ([Download here](https://nodejs.org/))
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git** ([Download here](https://git-scm.com/))

## 🚀 Quick Setup

### Option 1: Automatic Setup (Recommended)

#### Windows:
```bash
cd backend
setup.bat
```

#### macOS/Linux:
```bash
cd backend
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

#### 1. Install Dependencies
```bash
cd backend
npm install
```

#### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# Update MongoDB connection string, JWT secret, etc.
```

#### 3. Generate JWT Secret
```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## 🗄️ Database Setup

### Option A: Local MongoDB

1. **Install MongoDB Community Edition:**
   - **Windows:** [Download installer](https://www.mongodb.com/try/download/community)
   - **macOS:** `brew install mongodb/brew/mongodb-community`
   - **Linux:** Follow [official instructions](https://docs.mongodb.com/manual/installation/)

2. **Start MongoDB:**
   ```bash
   # macOS with Homebrew
   brew services start mongodb/brew/mongodb-community
   
   # Windows (as service)
   net start MongoDB
   
   # Linux
   sudo systemctl start mongod
   ```

3. **Verify Connection:**
   ```bash
   # Test connection
   mongosh --eval "db.runCommand('ping')"
   ```

### Option B: MongoDB Atlas (Cloud)

1. **Create Atlas Account:** [mongodb.com/atlas](https://www.mongodb.com/atlas)

2. **Create Cluster:**
   - Choose free M0 cluster
   - Select region closest to you
   - Create database user
   - Add IP address to whitelist (0.0.0.0/0 for development)

3. **Get Connection String:**
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Update `MONGODB_URI` in `.env` file

   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/splitsy?retryWrites=true&w=majority
   ```

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/splitsy

# Authentication
JWT_SECRET=your-super-long-and-random-jwt-secret-key
JWT_EXPIRE=30d

# Security
BCRYPT_SALT_ROUNDS=12

# CORS (Frontend URLs)
FRONTEND_URL=http://localhost:8082

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Key Configuration Options:

- **PORT:** Server port (default: 3000)
- **MONGODB_URI:** Database connection string
- **JWT_SECRET:** Secret key for JWT tokens (generate a strong one!)
- **JWT_EXPIRE:** Token expiration time
- **FRONTEND_URL:** Your React Native app URL for CORS

## 📱 React Native Integration

### 1. Update API Service

The API service is already created in `/services/apiService.js`. Make sure it points to your backend:

```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Development
  : 'https://your-production-api.com/api';  // Production
```

### 2. Replace DataContext

Replace the current AsyncStorage-based DataContext with the API-powered version:

```javascript
// In your App.js or main component file
import { DataProvider } from './context/ApiDataContext'; // New API-based context

// Wrap your app
<DataProvider>
  <YourApp />
</DataProvider>
```

### 3. Update User Authentication

You'll need to create authentication screens and update UserContext to work with the backend. The API provides these endpoints:

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update user profile

## 🛠️ API Endpoints

### Authentication
```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login user
GET    /api/auth/me                # Get current user
PUT    /api/auth/me                # Update profile
PUT    /api/auth/updatepassword    # Update password
POST   /api/auth/payment-methods   # Add payment method
DELETE /api/auth/payment-methods/:id # Remove payment method
```

### Groups
```
GET    /api/groups                 # Get user's groups
POST   /api/groups                 # Create new group
GET    /api/groups/:id             # Get group details
PUT    /api/groups/:id             # Update group
DELETE /api/groups/:id             # Delete group
POST   /api/groups/:id/members     # Add member
DELETE /api/groups/:id/members/:userId # Remove member
POST   /api/groups/:id/leave       # Leave group
GET    /api/groups/:id/balances    # Get group balances
```

### Transactions (Coming Soon)
```
GET    /api/transactions           # Get transactions
POST   /api/transactions           # Create transaction
PUT    /api/transactions/:id       # Update transaction
DELETE /api/transactions/:id       # Delete transaction
POST   /api/transactions/:id/paid  # Mark as paid
```

## 🔐 Security Features

- **JWT Authentication:** Secure token-based authentication
- **Password Hashing:** Bcrypt with configurable salt rounds
- **Rate Limiting:** Prevent abuse with request limits
- **Input Validation:** Express-validator for request validation
- **CORS Protection:** Configurable CORS for frontend integration
- **Helmet:** Security headers middleware

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123"
  }'
```

### Login User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123"
  }'
```

## 🚨 Troubleshooting

### Common Issues:

1. **"Cannot connect to MongoDB"**
   - Check if MongoDB is running
   - Verify connection string in .env
   - Check firewall settings

2. **"JWT secret not configured"**
   - Generate and set JWT_SECRET in .env
   - Restart the server

3. **"CORS errors from React Native"**
   - Update FRONTEND_URL in .env
   - Add your development IP to allowed origins

4. **"Port already in use"**
   - Change PORT in .env
   - Kill existing process: `lsof -ti:3000 | xargs kill`

### Debug Mode:

Enable detailed logging by setting:
```env
NODE_ENV=development
```

## 📦 Production Deployment

### Environment Setup:
1. Set `NODE_ENV=production`
2. Use strong JWT_SECRET
3. Configure production MongoDB URI
4. Set up proper CORS origins
5. Enable MongoDB authentication
6. Use HTTPS in production

### Deployment Options:
- **Heroku:** Easy deployment with MongoDB Atlas
- **AWS:** EC2 with RDS/DocumentDB
- **DigitalOcean:** App Platform with managed MongoDB
- **Railway:** Simple deployment with built-in databases

## 🤝 Need Help?

- Check the console logs for detailed error messages
- Verify all environment variables are set correctly
- Test API endpoints with tools like Postman or curl
- Ensure MongoDB is accessible from your application

## 📈 Next Steps

1. **Complete Transaction Integration:** Implement transaction controllers and routes
2. **Add Real-time Features:** WebSocket support for live updates
3. **File Upload:** Receipt image handling with cloud storage
4. **Push Notifications:** Mobile push notification system
5. **Advanced Features:** Recurring expenses, split methods, analytics

The backend is now ready for your Splitsy app! 🎉