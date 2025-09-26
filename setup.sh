#!/bin/bash

# 🚀 SPLITSY AUTO-INSTALLER 
# This script does EVERYTHING automatically - just run it!

echo "🚀 SPLITSY AUTOMATIC SETUP STARTING..."
echo "======================================"

# Check if we're in the right place
if [ ! -f "package.json" ]; then
    echo "📁 Cloning Splitsy repository..."
    git clone https://github.com/JettNguyen/Splitsy.git splitsy-app
    cd splitsy-app
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found!"
    echo "🔗 Please install from: https://nodejs.org/"
    echo "Then run this script again."
    exit 1
fi

echo "✅ Node.js found: $(node -v)"

# Install Expo CLI if needed
if ! command -v expo &> /dev/null; then
    echo "📦 Installing Expo CLI..."
    npm install -g @expo/cli
fi

echo "📦 Installing app dependencies..."
npm install --legacy-peer-deps

echo ""
echo "🎉 SETUP COMPLETE!"
echo ""
echo "🚀 Starting Splitsy now..."
echo "📱 Install 'Expo Go' on your phone and scan the QR code!"
echo ""

# Start the app
npm start