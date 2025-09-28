# Quick MongoDB Setup Guide

## Option 1: MongoDB Atlas (Cloud - Recommended)

### Step 1: Create Account
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" and create account
3. Create a new project (e.g., "Splitsy")

### Step 2: Create Database
1. Click "Build a Database"
2. Choose "M0 Sandbox" (FREE)
3. Select cloud provider and region
4. Name cluster: `splitsy-cluster`

### Step 3: Setup Access
1. **Database Access:**
   - Create database user (username/password)
   - Give "Read and write to any database" permissions

2. **Network Access:**
   - Add IP: `0.0.0.0/0` (allows access from anywhere)
   - Or add your current IP for security

### Step 4: Get Connection String
1. Click "Connect" → "Drivers"
2. Copy connection string:
   ```
   mongodb+srv://username:password@splitsy-cluster.xxxxx.mongodb.net/
   ```
3. Replace `<password>` with your actual password
4. Add database name at end: `/splitsy`

### Step 5: Update Backend
1. Edit `backend/.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@splitsy-cluster.xxxxx.mongodb.net/splitsy
   ```
2. Start server: `cd backend && node server.js`

## Option 2: Local MongoDB (Advanced)

### Windows Installation
1. Download [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Run installer with default settings
3. MongoDB should start automatically as a service

### Manual Start (if needed)
```cmd
# Start MongoDB service
net start MongoDB

# Or run directly
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath="C:\data\db"
```

## Option 3: Docker (Quick Local)

```cmd
# Pull and run MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Start backend
cd backend
node server.js
```

## Testing Backend

Once MongoDB is running, test your backend:

```cmd
# Health check
curl http://localhost:3000/health

# Register test user
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"Test123\"}"
```

## Troubleshooting

### Connection Refused Error
- **MongoDB Atlas:** Check connection string format and IP whitelist
- **Local MongoDB:** Ensure MongoDB service is running
- **Docker:** Check if container is running: `docker ps`

### Authentication Error
- **Atlas:** Verify username/password in connection string
- **Local:** No auth required for default setup

### Port 3000 in Use
- Change backend port in `backend/.env`: `PORT=3001`
- Or stop process using port 3000

**Recommended:** Start with MongoDB Atlas for quickest setup! ⚡