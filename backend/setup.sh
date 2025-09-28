#!/bin/bash

# Splitsy Backend Setup Script

echo "🚀 Setting up Splitsy Backend..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"

# Navigate to backend directory
cd "$(dirname "$0")"
print_status "Working directory: $(pwd)"

# Install dependencies
print_status "Installing backend dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Check if MongoDB is running
print_status "Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.runCommand('ping')" --quiet; then
        print_success "MongoDB is running and accessible"
    else
        print_warning "MongoDB is not running locally"
        print_status "You can either:"
        print_status "1. Start local MongoDB: brew services start mongodb/brew/mongodb-community (macOS)"
        print_status "2. Use MongoDB Atlas by updating MONGODB_URI in .env file"
    fi
elif command -v mongo &> /dev/null; then
    if mongo --eval "db.runCommand('ping')" --quiet; then
        print_success "MongoDB is running and accessible"
    else
        print_warning "MongoDB is not running locally"
        print_status "You can either:"
        print_status "1. Start local MongoDB: brew services start mongodb/brew/mongodb-community (macOS)"
        print_status "2. Use MongoDB Atlas by updating MONGODB_URI in .env file"
    fi
else
    print_warning "MongoDB CLI not found. Please ensure MongoDB is installed and running."
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created from template"
    else
        print_error ".env.example template not found"
        exit 1
    fi
fi

# Generate JWT secret if not set
if grep -q "your-super-secret-jwt-key-here" .env; then
    print_status "Generating JWT secret..."
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-super-secret-jwt-key-here-make-it-long-and-random/$JWT_SECRET/" .env
    else
        # Linux
        sed -i "s/your-super-secret-jwt-key-here-make-it-long-and-random/$JWT_SECRET/" .env
    fi
    print_success "JWT secret generated and updated in .env"
fi

# Test server startup
print_status "Testing server startup..."
timeout 10s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3

if kill -0 $SERVER_PID 2>/dev/null; then
    print_success "Server started successfully"
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
else
    print_error "Server failed to start. Check the configuration."
    exit 1
fi

print_success "✅ Backend setup completed successfully!"
echo ""
print_status "Next steps:"
print_status "1. Review and update the .env file with your configuration"
print_status "2. Start the development server: npm run dev"
print_status "3. The API will be available at http://localhost:3000"
print_status "4. Health check: http://localhost:3000/health"
echo ""
print_status "Available scripts:"
print_status "  npm run dev    - Start development server with auto-reload"
print_status "  npm start      - Start production server"
echo ""
print_warning "Don't forget to update the MongoDB connection string in .env if using MongoDB Atlas!"