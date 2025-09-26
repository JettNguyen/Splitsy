@echo off
REM Splitsy Installation Script for Windows
REM This script sets up the Splitsy app with all required dependencies

echo 🚀 Setting up Splitsy - Expense Splitting App
echo =============================================

REM Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js ^(18.0.0 or higher^) from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed!
    echo Please install npm ^(comes with Node.js^)
    pause
    exit /b 1
)

echo ✅ Node.js version:
node -v
echo ✅ npm version:
npm -v

REM Check if Expo CLI is installed
expo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Expo CLI globally...
    npm install -g @expo/cli
) else (
    echo ✅ Expo CLI is already installed
)

REM Install project dependencies
echo 📦 Installing project dependencies...
npm install --legacy-peer-deps

if %errorlevel% equ 0 (
    echo.
    echo 🎉 Splitsy setup complete!
    echo.
    echo To start the app:
    echo   npm start
    echo.
    echo Then:
    echo   1. Download 'Expo Go' on your mobile device
    echo   2. Scan the QR code that appears
    echo   3. Enjoy splitting expenses!
    echo.
    echo For more options:
    echo   npm run android  - Run on Android emulator
    echo   npm run ios      - Run on iOS simulator
    echo   npm run web      - Run in web browser
    echo.
) else (
    echo ❌ Installation failed!
    echo Please check the error messages above and try again.
    pause
    exit /b 1
)

pause