# Splitsy Backend Testing Guide

This guide helps you test and validate the complete MongoDB backend implementation for Splitsy.

## 🚀 Quick Test (No MongoDB Required)

First, let's verify the backend architecture works without needing MongoDB:

### Step 1: Test the Basic Server
```cmd
cd backend
node test-server.js
```

This will start a minimal test server on port 3001 that responds to API calls without requiring a database.

### Step 2: Test API Endpoints

**Health Check:**
```cmd
curl http://localhost:3001/health
```

**Mock User Data:**
```cmd
curl http://localhost:3001/api/auth/me
```

**Mock Groups:**
```cmd
curl http://localhost:3001/api/groups
```

**Mock Transactions:**
```cmd
curl http://localhost:3001/api/transactions/group/123
```

You can also open these URLs in your browser to see the JSON responses.

---

## 🗄️ Full Backend Test (With MongoDB)

### Prerequisites
1. MongoDB installed and running (see MONGODB_SETUP_GUIDE.md)
2. Backend dependencies installed: `cd backend && npm install`
3. Environment file configured: Update `backend/.env` with your MongoDB connection

### Step 1: Start Full Backend
```cmd
cd backend
node server.js
```

You should see:
```
MongoDB Connected: [your-db-host]
🚀 Splitsy Backend API Server running on port 3000
📊 Environment: development
🔒 CORS enabled for: http://localhost:19006
⚡ Ready to accept requests!
```

### Step 2: Test Core Functionality

**Health Check:**
```cmd
curl http://localhost:3000/health
```

**Register Test User:**
```cmd
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"Test123!\"}"
```

**Login:**
```cmd
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"Test123!\"}"
```

Copy the `token` from the login response for authenticated requests.

**Get User Profile (Replace YOUR_TOKEN):**
```cmd
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create Group:**
```cmd
curl -X POST http://localhost:3000/api/groups \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Group\",\"description\":\"Testing the API\"}"
```

**Get Groups:**
```cmd
curl http://localhost:3000/api/groups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📱 React Native Integration Test

### Step 1: Update App.js
Replace your DataContext import in `App.js`:

```javascript
// Before (AsyncStorage version)
import { DataProvider } from './context/DataContext';

// After (MongoDB API version)  
import { DataProvider } from './context/ApiDataContext';
```

### Step 2: Test API Connection
Add this test component to verify connection:

```javascript
// TestAPIConnection.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import apiService from './services/apiService';

export default function TestAPIConnection() {
  const [status, setStatus] = useState('Checking...');
  
  const testConnection = async () => {
    try {
      await apiService.init();
      const response = await apiService.healthCheck();
      
      if (response.success) {
        setStatus('✅ Backend Connected!');
        Alert.alert('Success', 'Backend is running and accessible!');
      } else {
        setStatus('❌ Backend Error');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setStatus(`❌ Connection Failed: ${error.message}`);
      
      if (error.message.includes('Cannot connect')) {
        Alert.alert(
          'Connection Failed', 
          'Make sure the backend server is running on port 3000'
        );
      }
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <View style={{ padding: 20, alignItems: 'center' }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>{status}</Text>
      <Button title="Test Again" onPress={testConnection} />
    </View>
  );
}
```

Add this component to your main screen to test the connection.

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error: `MongooseServerSelectionError: connect ECONNREFUSED`**
- MongoDB is not running
- Check MongoDB service: `net start MongoDB` (Windows)
- Or install MongoDB: See MONGODB_SETUP_GUIDE.md

**Error: `Port 3000 already in use`**
- Change port in `.env`: `PORT=3001`
- Or stop process using port 3000

### API Requests Fail

**401 Unauthorized**
- Token expired or invalid
- Re-login to get new token
- Check Authorization header format: `Bearer YOUR_TOKEN`

**CORS Errors**
- Update `FRONTEND_URL` in `.env` to match your dev server
- Default is `http://localhost:19006` for Expo

**Network Request Failed**
- Backend server not running
- Wrong URL (check `http://localhost:3000` vs `https://`)
- Firewall blocking connection

### React Native Integration Issues

**Import Errors**
- Run `npm install` in main directory
- Check all dependencies are installed

**AsyncStorage Errors**  
- Install: `expo install @react-native-async-storage/async-storage`
- Or: `npm install @react-native-async-storage/async-storage`

**Context Provider Errors**
- Make sure `DataProvider` wraps your entire app
- Import from correct file: `./context/ApiDataContext`

---

## ✅ Test Checklist

### Basic Functionality
- [ ] Backend starts without errors
- [ ] Health check endpoint responds
- [ ] User registration works
- [ ] User login returns JWT token
- [ ] Protected endpoints require authentication

### Group Management
- [ ] Create group
- [ ] List user's groups  
- [ ] Add group members
- [ ] Remove group members
- [ ] Update group settings
- [ ] Delete group

### Transaction Management
- [ ] Create transaction with equal split
- [ ] Create transaction with exact amounts
- [ ] Create transaction with percentage split
- [ ] List group transactions
- [ ] Update transaction
- [ ] Delete transaction
- [ ] Mark transaction as settled

### React Native Integration
- [ ] API service initializes
- [ ] User authentication flow
- [ ] Data context provides data
- [ ] Error handling works
- [ ] Offline/online state management

---

## 🔄 Database Inspection

If you want to see your data directly in MongoDB:

### Using MongoDB Compass (GUI)
1. Download [MongoDB Compass](https://www.mongodb.com/try/download/compass)
2. Connect to `mongodb://localhost:27017`
3. Browse `splitsy` database
4. Inspect `users`, `groups`, `transactions` collections

### Using MongoDB Shell
```bash
# Connect to MongoDB
mongosh

# Switch to splitsy database
use splitsy

# List collections
show collections

# View users
db.users.find().pretty()

# View groups
db.groups.find().pretty()

# View transactions
db.transactions.find().pretty()
```

---

## 🎯 Success Criteria

Your backend is working correctly if:

1. ✅ Server starts and connects to MongoDB
2. ✅ All health checks pass
3. ✅ User registration and login work
4. ✅ Groups can be created and managed
5. ✅ Transactions can be created and managed
6. ✅ React Native app can authenticate and load data
7. ✅ Error handling provides meaningful feedback

**Congratulations! 🎉 Your Splitsy app now has a complete MongoDB backend!**