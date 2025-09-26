@echo off
REM 🚀 SPLITSY AUTO-INSTALLER FOR WINDOWS
REM This script does EVERYTHING automatically - just run it!

echo 🚀 SPLITSY AUTOMATIC SETUP STARTING...
echo ======================================

REM Check if we're in the right place
if not exist "package.json" (
    echo 📁 Cloning Splitsy repository...
    git clone https://github.com/JettNguyen/Splitsy.git splitsy-app
    cd splitsy-app
)

REM Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    echo 🔗 Please install from: https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)

echo ✅ Node.js found:
node -v

REM Install Expo CLI if needed
expo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Expo CLI...
    npm install -g @expo/cli
)

echo 📦 Installing app dependencies...
npm install --legacy-peer-deps

echo.
echo 🎉 SETUP COMPLETE!
echo.
echo 🚀 Starting Splitsy now...
echo 📱 Install 'Expo Go' on your phone and scan the QR code!
echo.

REM Start the app
npm start

pause