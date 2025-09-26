#!/bin/bash

# Splitsy Installation Script
# This script sets up the Splitsy app with all required dependencies

echo "🚀 Setting up Splitsy - Expense Splitting App"
echo "============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js (18.0.0 or higher) from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    echo "Please install npm (comes with Node.js)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# Install Expo CLI globally if not already installed
if ! command -v expo &> /dev/null; then
    echo "📦 Installing Expo CLI globally..."
    npm install -g @expo/cli
else
    echo "✅ Expo CLI is already installed"
fi

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install --legacy-peer-deps

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Splitsy setup complete!"
    echo ""
    echo "To start the app:"
    echo "  npm start"
    echo ""
    echo "Then:"
    echo "  1. Download 'Expo Go' on your mobile device"
    echo "  2. Scan the QR code that appears"
    echo "  3. Enjoy splitting expenses!"
    echo ""
    echo "For more options:"
    echo "  npm run android  - Run on Android emulator"
    echo "  npm run ios      - Run on iOS simulator"
    echo "  npm run web      - Run in web browser"
    echo ""
else
    echo "❌ Installation failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi